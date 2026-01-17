import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { ConvexHttpClient } from "convex/browser";
import { analyzeWithLLM, chatWithLLM } from "../services/llm";

// Lazy initialization - create client when needed
function getConvexClient() {
  // Check multiple possible env var names (Convex uses different names)
  let url = process.env.CONVEX_URL 
    || process.env.CONVEX_DEPLOYMENT_URL 
    || process.env.CONVEX_DEPLOYMENT;
    
  if (!url) {
    throw new Error("CONVEX_URL, CONVEX_DEPLOYMENT_URL, or CONVEX_DEPLOYMENT must be set");
  }
  
  // Convert dev:project-name format to full URL
  // Convex dev format: dev:project-name -> https://project-name.convex.cloud
  if (url.startsWith("dev:")) {
    const projectName = url.replace("dev:", "");
    url = `https://${projectName}.convex.cloud`;
  }
  
  // Validate URL format before creating client
  if (!url.startsWith("https://") && !url.startsWith("http://")) {
    throw new Error(`Invalid Convex URL format: "${url}". Must start with "https://" or "http://"`);
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
          "functions/messages:create" as any,
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
          const session = await convexClient.query("functions/sessions:getById" as any, {
            sessionId: sessionId as any,
          });

          if (session?.desktopId) {
            await convexClient.mutation("functions/pendingRequests:create" as any, {
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

        // Analyze with LLM - handle both text-only and video messages
        let aiResponse: string | undefined;
        
        if (videoUrl) {
          // Video analysis
          try {
            fastify.log.info({ sessionId, messageLength: message.length }, "🎥 Starting video analysis");
            const base64Data = videoUrl.replace(/^data:video\/mp4;base64,/, "");
            aiResponse = await analyzeWithLLM(base64Data, "video", message, undefined, fastify.log);
            fastify.log.info({ sessionId, responseLength: aiResponse.length }, "🎥 Video analysis complete");
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            fastify.log.error({ sessionId, err: error, errorMessage }, "❌ Video analysis error");
            aiResponse = `Error analyzing video: ${errorMessage}`;
          }
        } else {
          // Text-only chat message
          try {
            fastify.log.info({ sessionId, messageLength: message.length }, "💬 Starting text chat");
            aiResponse = await chatWithLLM(message, undefined, fastify.log);
            fastify.log.info({ sessionId, responseLength: aiResponse.length }, "💬 Text chat complete");
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            fastify.log.error({ sessionId, err: error, errorMessage }, "❌ Text chat error");
            aiResponse = `I encountered an error processing your message: ${errorMessage}. Please try again.`;
          }
        }

        // Create assistant message if we have AI response
        if (aiResponse) {
          try {
            await convexClient.mutation("functions/messages:create" as any, {
              sessionId: sessionId as any,
              role: "assistant",
              content: aiResponse,
              mediaType: videoUrl ? ("video" as const) : null,
              mediaUrl: videoUrl || undefined,
              createdAt: Date.now(),
            });
            fastify.log.info({ sessionId, responseLength: aiResponse.length }, "✅ Assistant message created in chat");
          } catch (chatError: unknown) {
            const errorMessage = chatError instanceof Error ? chatError.message : "Unknown error";
            fastify.log.error({ sessionId, err: chatError, errorMessage }, "❌ Failed to create assistant message");
            // Don't fail the request - LLM worked, just couldn't save to chat
          }
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
          "functions/messages:getBySession" as any,
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
