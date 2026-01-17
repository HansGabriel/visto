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

// Extract string field from multipart fields
function extractStringField(fields: unknown, fieldName: string): string | null {
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
  
  if (typeof fieldValue === 'string' && fieldValue.trim()) {
    return fieldValue.trim();
  }
  
  return null;
}

// Extract query from multipart fields
function extractQueryFromFields(fields: unknown): string | null {
  return extractStringField(fields, 'query');
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
          screenshotUrl: `data:image/png;base64,${base64}`,
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

        // Extract duration, query, and MIME type from multipart fields
        const duration = extractNumericField(data.fields, 'duration') || 0;
        const userQueryRaw = extractQueryFromFields(data.fields);
        
        // Enhanced default prompt for comprehensive video analysis
        const defaultVideoPrompt = `Analyze this video thoroughly. Examine all frames from start to finish, paying special attention to:
- The complete final state shown at the end of the video
- All visible content, text, numbers, and details throughout the entire video
- Any changes or progression that occurs over time
- Everything that appears in later frames, not just the beginning

Provide a detailed analysis of what happens in this video, ensuring you capture all visible information, especially content that appears in the final frames.`;
        
        const userQuery = userQueryRaw || defaultVideoPrompt;
        
        // Extract MIME type from fields or infer from filename/mimetype
        let videoMimeType = extractStringField(data.fields, 'mimeType');
        if (!videoMimeType) {
          // Infer from filename or use provided mimetype
          videoMimeType = data.filename?.endsWith('.webm') 
            ? 'video/webm' 
            : data.filename?.endsWith('.mp4')
            ? 'video/mp4'
            : data.mimetype || 'video/webm';
        }

        const buffer = await data.toBuffer();
        const fileSizeMB = Math.round((buffer.length / (1024 * 1024)) * 100) / 100;
        
        // Validate buffer is not empty
        if (buffer.length === 0) {
          fastify.log.error({ desktopId }, "Video buffer is empty");
          return reply.code(400).send({ error: "Video file is empty" });
        }
        
        // Validate minimum size (at least 1KB for a valid video)
        if (buffer.length < 1024) {
          fastify.log.warn({ desktopId, bufferSize: buffer.length }, "Video buffer is suspiciously small");
        }
        
        const base64 = buffer.toString("base64");
        
        fastify.log.info({ 
          desktopId, 
          fileSizeMB, 
          bufferSize: buffer.length,
          duration, 
          filename: data.filename,
          mimeType: videoMimeType,
          queryLength: userQuery.length,
          base64Length: base64.length
        }, "🎥 Video processed successfully");

        // Analyze video with LLM (pass MIME type)
        let aiResponse: string | undefined;
        try {
          aiResponse = await analyzeWithLLM(base64, "video", userQuery, undefined, fastify.log, videoMimeType);
          fastify.log.info({ desktopId, responseLength: aiResponse.length }, "🎥 Video analysis complete");
        } catch (error: unknown) {
          fastify.log.error({ desktopId, err: error }, "Failed to analyze video with LLM");
          // Continue even if LLM fails
        }

        return {
          videoUrl: `data:${videoMimeType};base64,${base64.substring(0, 50)}...`,
          duration,
          status: "uploaded",
          analysis: aiResponse,
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
