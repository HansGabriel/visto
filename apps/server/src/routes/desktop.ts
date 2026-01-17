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

// Generate a random 6-character pairing code
function generatePairingCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate unique desktop ID
function generateDesktopId(): string {
  return `desktop_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

export default async function desktopRoutes(fastify: FastifyInstance) {
  // Register desktop & get pairing code
  fastify.post(
    "/api/desktop/register",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const desktopId = generateDesktopId();
        const pairingCode = generatePairingCode();

        // Create session in Convex
        const convexClient = getConvexClient();
        await convexClient.mutation("sessions:create" as any, {
          desktopId,
          pairingCode,
          mobileConnected: false,
          userId: undefined,
          createdAt: Date.now(),
        });

        return { desktopId, pairingCode };
      } catch (error: any) {
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Poll for pending requests
  fastify.get(
    "/api/desktop/:desktopId/pending-requests",
    async (
      request: FastifyRequest<{ Params: { desktopId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { desktopId } = request.params;

        // Query pending requests from Convex
        const convexClient = getConvexClient();
        const pendingRequests = await convexClient.query(
          "pendingRequests:getByDesktop" as any,
          {
            desktopId,
          }
        );

        const requests = (pendingRequests || []).map((req: any) => ({
          requestId: req._id,
          type: req.requestType,
          createdAt: req.createdAt,
        }));

        return { requests };
      } catch (error: any) {
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Upload screenshot
  fastify.post(
    "/api/desktop/:desktopId/screenshot",
    async (
      request: FastifyRequest<{
        Params: { desktopId: string };
        Body: { screenshot?: any };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { desktopId } = request.params;

        // Handle multipart form data
        const data = await request.file();
        if (!data) {
          return reply.code(400).send({ error: "No file uploaded" });
        }

        const buffer = await data.toBuffer();
        const base64 = buffer.toString("base64");

        // Store in Convex file storage and create message
        // For now, return success - full implementation will come in chat routes
        return {
          screenshotUrl: `data:image/png;base64,${base64.substring(0, 50)}...`,
          status: "uploaded",
        };
      } catch (error: any) {
        reply.code(500).send({ error: error.message });
      }
    }
  );

  // Upload video
  fastify.post(
    "/api/desktop/:desktopId/video",
    async (
      request: FastifyRequest<{
        Params: { desktopId: string };
        Body: { video?: any; duration?: number };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { desktopId } = request.params;
        const { duration } = request.body as { duration?: number };

        // Handle multipart form data
        const data = await request.file();
        if (!data) {
          return reply.code(400).send({ error: "No file uploaded" });
        }

        const buffer = await data.toBuffer();
        const base64 = buffer.toString("base64");

        // Store in Convex file storage
        // For now, return success - full implementation will come in chat routes
        return {
          videoUrl: `data:video/mp4;base64,${base64.substring(0, 50)}...`,
          duration: duration || 0,
          status: "uploaded",
        };
      } catch (error: any) {
        reply.code(500).send({ error: error.message });
      }
    }
  );
}
