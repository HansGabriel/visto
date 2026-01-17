import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { ConvexHttpClient } from "convex/browser";
import { analyzeWithLLM } from "../services/llm";

// Lazy initialization - create client when needed
function getConvexClient(): ConvexHttpClient {
  const url = process.env.CONVEX_URL || process.env.CONVEX_DEPLOYMENT_URL;
  if (!url) {
    throw new Error("CONVEX_URL or CONVEX_DEPLOYMENT_URL must be set");
  }
  return new ConvexHttpClient(url);
}

// Generate a random 6-character pairing code
function generatePairingCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 6 }, () => 
    chars.charAt(Math.floor(Math.random() * chars.length))
  ).join("");
}

// Generate unique desktop ID
function generateDesktopId(): string {
  return `desktop_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

// Extract query from multipart fields
function extractQueryFromFields(fields: unknown): string | null {
  if (!fields || typeof fields !== 'object') return null;
  
  const queryField = (fields as Record<string, unknown>).query;
  if (!queryField) return null;
  
  // Handle array or single value
  const value = Array.isArray(queryField)
    ? queryField[0]
    : queryField;
  
  // Extract value from object or use directly
  const queryValue = value && typeof value === 'object' && 'value' in value
    ? (value as { value: unknown }).value
    : value;
  
  if (typeof queryValue === 'string' && queryValue.trim()) {
    return queryValue.trim();
  }
  
  return null;
}

// Extract numeric field from multipart fields
function extractNumericField(fields: unknown, fieldName: string): number | null {
  if (!fields || typeof fields !== 'object') return null;
  
  const field = (fields as Record<string, unknown>)[fieldName];
  if (!field) return null;
  
  // Handle array or single value
  const value = Array.isArray(field)
    ? field[0]
    : field;
  
  // Extract value from object or use directly
  const fieldValue = value && typeof value === 'object' && 'value' in value
    ? (value as { value: unknown }).value
    : value;
  
  if (typeof fieldValue === 'string') {
    const parsed = parseFloat(fieldValue);
    if (!isNaN(parsed)) {
      return parsed;
    }
  } else if (typeof fieldValue === 'number') {
    return fieldValue;
  }
  
  return null;
}

export default async function desktopRoutes(fastify: FastifyInstance): Promise<void> {
  // Register desktop & get pairing code
  fastify.post(
    "/api/desktop/register",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const desktopId = generateDesktopId();
        const pairingCode = generatePairingCode();

        // Create session in Convex (optional - will work without it)
        try {
          const convexClient = getConvexClient();
          await convexClient.mutation("sessions:create" as any, {
            desktopId,
            pairingCode,
            mobileConnected: false,
            userId: undefined,
            createdAt: Date.now(),
          });
        } catch (convexError: unknown) {
          // Log but don't fail - allow registration without Convex
          fastify.log.warn({ err: convexError }, "Convex unavailable, continuing without storage");
        }

        fastify.log.info({ desktopId, pairingCode }, "Desktop registered");
        return { desktopId, pairingCode };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        fastify.log.error({ err: error }, "Failed to register desktop");
        reply.code(500).send({ error: errorMessage });
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

        try {
          const convexClient = getConvexClient();
          const pendingRequests = await convexClient.query(
            "pendingRequests:getByDesktop" as any,
            { desktopId }
          );

          const requests = (pendingRequests || []).map((req: { 
            _id: string; 
            requestType: string; 
            createdAt: number 
          }) => ({
            requestId: req._id,
            type: req.requestType,
            createdAt: req.createdAt,
          }));

          // Only log if there are actual requests (not empty polling)
          if (requests.length > 0) {
            fastify.log.info({ 
              desktopId, 
              count: requests.length, 
              types: requests.map((r: { type: string }) => r.type) 
            }, "Pending requests found");
          }

          return { requests };
        } catch (convexError: unknown) {
          // If Convex is unavailable, return empty requests silently
          return { requests: [] };
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        fastify.log.error(
          { desktopId: request.params.desktopId, err: error },
          "Failed to fetch pending requests"
        );
        reply.code(500).send({ error: errorMessage });
      }
    }
  );

  // Upload screenshot
  fastify.post(
    "/api/desktop/:desktopId/screenshot",
    async (
      request: FastifyRequest<{ Params: { desktopId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { desktopId } = request.params;
        fastify.log.info({ desktopId }, "📸 Screenshot upload received");

        // Get the file using request.file()
        const data = await request.file();
        if (!data) {
          fastify.log.warn({ desktopId }, "Screenshot upload failed: No file provided");
          return reply.code(400).send({ error: "No file uploaded" });
        }

        // Extract query from fields (fields that came before the file)
        const userQuery = extractQueryFromFields(data.fields) || 
          "Describe what you see in this screenshot in detail.";

        const buffer = await data.toBuffer();
        const fileSizeKB = Math.round(buffer.length / 1024);
        const base64 = buffer.toString("base64");
        
        fastify.log.info({ 
          desktopId, 
          fileSizeKB, 
          filename: data.filename || 'screenshot.png', 
          queryLength: userQuery.length 
        }, "📸 Screenshot processed successfully");

        // Analyze screenshot with LLM
        let aiResponse: string | undefined;
        try {
          aiResponse = await analyzeWithLLM(base64, "image", userQuery, undefined, fastify.log);
          fastify.log.info({ desktopId, responseLength: aiResponse.length }, "📸 Screenshot analysis complete");
        } catch (error: unknown) {
          fastify.log.error({ desktopId, err: error }, "Failed to analyze screenshot with LLM");
          // Continue even if LLM fails
        }

        return {
          screenshotUrl: `data:image/png;base64,${base64.substring(0, 50)}...`,
          status: "uploaded",
          analysis: aiResponse,
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        fastify.log.error(
          { desktopId: request.params.desktopId, err: error },
          "Failed to upload screenshot"
        );
        reply.code(500).send({ error: errorMessage });
      }
    }
  );

  // Upload video
  fastify.post(
    "/api/desktop/:desktopId/video",
    async (
      request: FastifyRequest<{ Params: { desktopId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { desktopId } = request.params;
        fastify.log.info({ desktopId }, "🎥 Video upload received");

        const data = await request.file();
        if (!data) {
          fastify.log.warn({ desktopId }, "Video upload failed: No file provided");
          return reply.code(400).send({ error: "No file uploaded" });
        }

        // Extract duration from multipart fields (fields that came before the file)
        const duration = extractNumericField(data.fields, 'duration') || 0;

        const buffer = await data.toBuffer();
        const fileSizeMB = Math.round((buffer.length / (1024 * 1024)) * 100) / 100;
        const base64 = buffer.toString("base64");
        
        fastify.log.info({ 
          desktopId, 
          fileSizeMB, 
          duration, 
          filename: data.filename 
        }, "🎥 Video processed successfully");

        return {
          videoUrl: `data:video/mp4;base64,${base64.substring(0, 50)}...`,
          duration,
          status: "uploaded",
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        fastify.log.error(
          { desktopId: request.params.desktopId, err: error },
          "Failed to upload video"
        );
        reply.code(500).send({ error: errorMessage });
      }
    }
  );
}
