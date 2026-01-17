import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { ConvexHttpClient } from "convex/browser";

// Lazy initialization - create client when needed
function getConvexClient() {
  const url = process.env.CONVEX_URL || process.env.CONVEX_DEPLOYMENT_URL;
  if (!url) {
    throw new Error("CONVEX_URL or CONVEX_DEPLOYMENT_URL must be set");
  }
  return new ConvexHttpClient(url);
}

export default async function mobileRoutes(fastify: FastifyInstance) {
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

        // Find session by pairing code in Convex
        const convexClient = getConvexClient();
        const session = await convexClient.query("sessions:findByPairingCode" as any, {
          pairingCode,
        });

        if (!session) {
          return reply.code(404).send({ error: "Invalid pairing code" });
        }

        const sessionId = session._id;

        // Update session to mark as connected
        await convexClient.mutation("sessions:updateMobileConnected" as any, {
          sessionId,
          mobileConnected: true,
        });

        return {
          sessionId,
          desktopId: session.desktopId,
        };
      } catch (error: any) {
        reply.code(500).send({ error: error.message });
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
        const session = await convexClient.query("sessions:getById" as any, {
          sessionId: sessionId as any,
        });

        if (!session) {
          return reply.code(404).send({ error: "Session not found" });
        }

        const desktopId = session.desktopId;

        // Create pending request
        await convexClient.mutation("pendingRequests:create" as any, {
          desktopId,
          requestType: "start-recording",
          processed: false,
          createdAt: Date.now(),
        });

        return {
          recordingId: sessionId,
          status: "recording_started",
        };
      } catch (error: any) {
        reply.code(500).send({ error: error.message });
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
        const session = await convexClient.query("sessions:getById" as any, {
          sessionId: sessionId as any,
        });

        if (!session) {
          return reply.code(404).send({ error: "Session not found" });
        }

        const desktopId = session.desktopId;

        // Create pending request
        await convexClient.mutation("pendingRequests:create" as any, {
          desktopId,
          requestType: "stop-recording",
          processed: false,
          createdAt: Date.now(),
        });

        return {
          status: "stopping",
        };
      } catch (error: any) {
        reply.code(500).send({ error: error.message });
      }
    }
  );
}
