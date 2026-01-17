import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { ConvexHttpClient } from "convex/browser";

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

export default async function mobileRoutes(fastify: FastifyInstance): Promise<void> {
  // Pair with desktop using code
  fastify.post(
    "/api/mobile/pair",
    async (
      request: FastifyRequest<{
        Body: { pairingCode: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { pairingCode } = request.body;

        if (!pairingCode) {
          return reply.code(400).send({ error: "Pairing code is required" });
        }

        // Normalize pairing code: uppercase and trim
        const normalizedCode = pairingCode.trim().toUpperCase();
        
        fastify.log.info({ 
          originalCode: pairingCode, 
          normalizedCode,
          codeLength: normalizedCode.length 
        }, "Pairing attempt");

        // Find session by pairing code in Convex (supports flexible matching)
        const convexClient = getConvexClient();
        const session = await convexClient.query("functions/sessions:findByPairingCodeFlexible" as any, {
          pairingCode: normalizedCode,
        });

        if (!session) {
          fastify.log.warn({ 
            normalizedCode,
            codeLength: normalizedCode.length 
          }, "Pairing code not found");
          return reply.code(404).send({ error: "Invalid pairing code. Please check the code displayed on your desktop and try again." });
        }
        
        fastify.log.info({ 
          sessionId: session._id,
          storedCode: session.pairingCode,
          providedCode: normalizedCode 
        }, "Pairing code matched successfully");

        const sessionId = session._id;

        // Update session to mark as connected
        await convexClient.mutation("functions/sessions:updateMobileConnected" as any, {
          sessionId,
          mobileConnected: true,
        });

        fastify.log.info({ sessionId, desktopId: session.desktopId }, "Mobile paired");

        return {
          sessionId,
          desktopId: session.desktopId,
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        fastify.log.error({ err: error }, "Failed to pair mobile");
        reply.code(500).send({ error: errorMessage });
      }
    }
  );

  // Start recording
  fastify.post(
    "/api/recording/:sessionId/start",
    async (
      request: FastifyRequest<{
        Params: { sessionId: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { sessionId } = request.params;

        // Get desktop ID from session
        const convexClient = getConvexClient();
        const session = await convexClient.query("functions/sessions:getById" as any, {
          sessionId: sessionId as any,
        });

        if (!session) {
          return reply.code(404).send({ error: "Session not found" });
        }

        const desktopId = session.desktopId;

        // Create pending request
        await convexClient.mutation("functions/pendingRequests:create" as any, {
          desktopId,
          requestType: "start-recording",
          processed: false,
          createdAt: Date.now(),
        });

        return {
          recordingId: sessionId,
          status: "recording_started",
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        fastify.log.error(
          { sessionId: request.params.sessionId, err: error },
          "Failed to start recording"
        );
        reply.code(500).send({ error: errorMessage });
      }
    }
  );

  // Stop recording
  fastify.post(
    "/api/recording/:sessionId/stop",
    async (
      request: FastifyRequest<{
        Params: { sessionId: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { sessionId } = request.params;

        // Get desktop ID from session
        const convexClient = getConvexClient();
        const session = await convexClient.query("functions/sessions:getById" as any, {
          sessionId: sessionId as any,
        });

        if (!session) {
          return reply.code(404).send({ error: "Session not found" });
        }

        const desktopId = session.desktopId;

        // Create pending request
        await convexClient.mutation("functions/pendingRequests:create" as any, {
          desktopId,
          requestType: "stop-recording",
          processed: false,
          createdAt: Date.now(),
        });

        return {
          status: "stopping",
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        fastify.log.error(
          { sessionId: request.params.sessionId, err: error },
          "Failed to stop recording"
        );
        reply.code(500).send({ error: errorMessage });
      }
    }
  );
}
