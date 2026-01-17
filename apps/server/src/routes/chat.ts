import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { ConvexHttpClient } from "convex/browser";
import { analyzeWithLLM } from "../services/llm";

// Lazy initialization - create client when needed
function getConvexClient() {
  const url = process.env.CONVEX_URL || process.env.CONVEX_DEPLOYMENT_URL;
  if (!url) {
    throw new Error("CONVEX_URL or CONVEX_DEPLOYMENT_URL must be set");
  }
  return new ConvexHttpClient(url);
}

export default async function chatRoutes(fastify: FastifyInstance): Promise<void> {
  // Send chat message
  fastify.post(
    "/api/chat/:sessionId/message",
    async (
      request: FastifyRequest<{
        Params: { sessionId: string };
        Body: {
          message: string;
          requestScreenshot?: boolean;
          videoUrl?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { sessionId } = request.params;
        const { message, requestScreenshot, videoUrl } = request.body;

        if (!message) {
          return reply.code(400).send({ error: "Message is required" });
        }

        // Create user message in Convex
        const convexClient = getConvexClient();
        const messageId = await convexClient.mutation(
          "messages:create" as any,
          {
            sessionId: sessionId as any,
            role: "user",
            content: message,
            mediaType: videoUrl ? ("video" as const) : null,
            mediaUrl: videoUrl || undefined,
            createdAt: Date.now(),
          }
        );

        // If screenshot is requested, create pending request
        if (requestScreenshot) {
          // Get desktop ID from session
          const session = await convexClient.query("sessions:getById" as any, {
            sessionId: sessionId as any,
          });

          if (session?.desktopId) {
            await convexClient.mutation("pendingRequests:create" as any, {
              desktopId: session.desktopId,
              requestType: "screenshot",
              processed: false,
              createdAt: Date.now(),
            });
          }

          return {
            messageId,
            status: "requesting_screenshot",
          };
        }

        // If video URL is provided, analyze with LLM
        let aiResponse: string | undefined;
        if (videoUrl) {
          try {
            // Extract base64 from videoUrl or fetch it
            // For now, we'll expect base64 data URL
            const base64Data = videoUrl.replace(/^data:video\/mp4;base64,/, "");
            aiResponse = await analyzeWithLLM(base64Data, "video", message, undefined, fastify.log);
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            fastify.log.error({ sessionId, err: error }, "LLM analysis error");
            aiResponse = `Error analyzing video: ${errorMessage}`;
          }
        }

        // Create assistant message if we have AI response
        if (aiResponse) {
          await convexClient.mutation("messages:create" as any, {
            sessionId: sessionId as any,
            role: "assistant",
            content: aiResponse,
            mediaType: videoUrl ? ("video" as const) : null,
            mediaUrl: videoUrl || undefined,
            createdAt: Date.now(),
          });
        }

        return {
          messageId,
          aiResponse,
          status: aiResponse ? "processed" : "pending",
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        fastify.log.error(
          { sessionId: request.params.sessionId, err: error },
          "Failed to process chat message"
        );
        reply.code(500).send({ error: errorMessage });
      }
    }
  );

  // Get chat messages
  fastify.get(
    "/api/chat/:sessionId/messages",
    async (
      request: FastifyRequest<{
        Params: { sessionId: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { sessionId } = request.params;

        // Query messages from Convex
        const convexClient = getConvexClient();
        const messagesData = await convexClient.query(
          "messages:getBySession" as any,
          {
            sessionId: sessionId as any,
          }
        );

        const messages = (messagesData || []).map((msg: { _id: string; role: string; content: string; mediaType: string | null; mediaUrl?: string; createdAt: number }) => ({
          messageId: msg._id,
          role: msg.role,
          content: msg.content,
          mediaType: msg.mediaType,
          mediaUrl: msg.mediaUrl,
          createdAt: msg.createdAt,
        }));

        return { messages };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        fastify.log.error(
          { sessionId: request.params.sessionId, err: error },
          "Failed to fetch chat messages"
        );
        reply.code(500).send({ error: errorMessage });
      }
    }
  );
}
