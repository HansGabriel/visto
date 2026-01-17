import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { ConvexHttpClient } from "convex/browser";
import { analyzeWithLLM } from "../services/llm";
// Screenshot cache no longer needed - screenshots are stored in Convex and retrieved via messages

// Lazy initialization - create client when needed
function getConvexClient(): ConvexHttpClient {
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

// Get Convex site URL for HTTP actions
function getConvexSiteUrl(): string {
  let url = process.env.CONVEX_URL 
    || process.env.CONVEX_DEPLOYMENT_URL 
    || process.env.CONVEX_DEPLOYMENT
    || process.env.CONVEX_SITE_URL;
    
  if (!url) {
    throw new Error("CONVEX_URL, CONVEX_DEPLOYMENT_URL, CONVEX_DEPLOYMENT, or CONVEX_SITE_URL must be set");
  }
  
  // Convert dev:project-name format
  if (url.startsWith("dev:")) {
    const projectName = url.replace("dev:", "");
    // HTTP actions are on .convex.site domain
    return `https://${projectName}.convex.site`;
  }
  
  // If it's already a .convex.cloud URL, convert to .convex.site
  if (url.includes(".convex.cloud")) {
    return url.replace(".convex.cloud", ".convex.site");
  }
  
  // If it's already a .convex.site URL, use it
  if (url.includes(".convex.site")) {
    return url;
  }
  
  // Fallback: assume it's a base URL and append /storeFile (but this is unlikely)
  return url;
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
        let sessionId: string | undefined;
        try {
          const convexClient = getConvexClient();
          sessionId = await convexClient.mutation("functions/sessions:create" as any, {
            desktopId,
            pairingCode,
            mobileConnected: false,
            createdAt: Date.now(),
          });
        } catch (convexError: unknown) {
          // Log but don't fail - allow registration without Convex
          fastify.log.warn({ err: convexError }, "Convex unavailable, continuing without storage");
        }

        fastify.log.info({ desktopId, pairingCode, sessionId }, "Desktop registered");
        return { desktopId, pairingCode, sessionId };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        fastify.log.error({ err: error }, "Failed to register desktop");
        reply.code(500).send({ error: errorMessage });
      }
    }
  );

  // Get session by desktopId
  fastify.get(
    "/api/desktop/:desktopId/session",
    async (
      request: FastifyRequest<{ Params: { desktopId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { desktopId } = request.params;

        const convexClient = getConvexClient();
        const session = await convexClient.query("functions/sessions:getByDesktopId" as any, {
          desktopId,
        });

        if (!session) {
          return reply.code(404).send({ error: "Session not found" });
        }

        fastify.log.info({ desktopId, sessionId: session._id }, "Session retrieved");
        return { 
          sessionId: session._id, 
          mobileConnected: session.mobileConnected 
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        fastify.log.error(
          { desktopId: request.params.desktopId, err: error },
          "Failed to get session"
        );
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
        
        // Log that desktop is polling (helps verify desktop is running)
        const timestamp = Date.now();
        fastify.log.debug({ desktopId, timestamp }, "🔄 Desktop polling for pending requests");

        try {
          const convexClient = getConvexClient();
          const pendingRequests = await convexClient.query(
            "functions/pendingRequests:getByDesktop" as any,
            { desktopId }
          );

          const requests = (pendingRequests || []).map((req: { 
            _id: string; 
            requestType: string; 
            createdAt: number;
            processed: boolean;
          }) => ({
            requestId: String(req._id),
            type: req.requestType,
            createdAt: req.createdAt,
            processed: req.processed,
          }));

          // Log all polling attempts to help debug - especially for screenshots
          if (requests.length > 0) {
            const screenshotRequests = requests.filter((r: { type: string }) => r.type === 'screenshot');
            if (screenshotRequests.length > 0) {
              fastify.log.info({ 
                desktopId, 
                totalCount: requests.length,
                screenshotCount: screenshotRequests.length,
                screenshotRequestIds: screenshotRequests.map((r: { requestId: string }) => r.requestId),
                allTypes: requests.map((r: { type: string }) => r.type)
              }, "📸 Pending screenshot requests found - desktop should capture and upload NOW");
            } else {
              fastify.log.info({ 
                desktopId, 
                count: requests.length, 
                types: requests.map((r: { type: string }) => r.type)
              }, "Pending requests found (no screenshots)");
            }
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
        fastify.log.info({ desktopId, timestamp: new Date().toISOString() }, "📸 Screenshot upload received from desktop");

        // Get the file using request.file()
        const data = await request.file();
        if (!data) {
          fastify.log.warn({ desktopId }, "Screenshot upload failed: No file provided");
          return reply.code(400).send({ error: "No file uploaded" });
        }

        // Extract query from fields (fields that came before the file)
        let userQuery = extractQueryFromFields(data.fields);
        
        // If no query provided, try to get it from the most recent chat message
        if (!userQuery) {
          try {
            const convexClient = getConvexClient();
            const session = await convexClient.query("functions/sessions:getByDesktopId" as any, {
              desktopId,
            });

            if (session) {
              const messages = await convexClient.query("functions/messages:getBySession" as any, {
                sessionId: session._id,
              });

              // Find the most recent user message
              const recentUserMessage = (messages || [])
                .filter((msg: { role: string }) => msg.role === "user")
                .sort((a: { createdAt: number }, b: { createdAt: number }) => 
                  b.createdAt - a.createdAt
                )[0];

              if (recentUserMessage?.content) {
                userQuery = recentUserMessage.content;
                fastify.log.info({ desktopId }, "📸 Using query from recent chat message");
              }
            }
          } catch (error: unknown) {
            fastify.log.warn({ desktopId, err: error }, "Failed to get query from chat messages");
          }
        }
        
        // Fallback to default query
        userQuery = userQuery || "Describe what you see in this screenshot in detail.";

        const buffer = await data.toBuffer();
        const fileSizeKB = Math.round(buffer.length / 1024);
        const base64 = buffer.toString("base64");
        const base64Url = `data:image/png;base64,${base64}`;
        
        fastify.log.info({ 
          desktopId, 
          fileSizeKB, 
          filename: data.filename || 'screenshot.png', 
          queryLength: userQuery.length
        }, "📸 Screenshot processed successfully");
        
        // Upload to Convex file storage via HTTP action (in background, don't block response)
        let screenshotStorageId: string | undefined;
        const storagePromise = (async () => {
          try {
            const convexSiteUrl = getConvexSiteUrl();
            const formData = new FormData();
            
            // Convert base64 to Buffer, then to Blob (Node.js 18+ has Blob)
            const fileBuffer = Buffer.from(base64, "base64");
            // @ts-ignore - Buffer works with Blob in Node.js 18+
            const fileBlob = new Blob([fileBuffer], { type: "image/png" });
            
            // @ts-ignore - FormData.append accepts Blob with filename in Node.js
            formData.append("file", fileBlob, "screenshot.png");
            formData.append("contentType", "image/png");
            
            const response = await fetch(`${convexSiteUrl}/storeFile`, {
              method: "POST",
              body: formData,
            });
            
            if (!response.ok) {
              const errorText = await response.text().catch(() => response.statusText);
              throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            const result = await response.json() as { storageId: string };
            screenshotStorageId = result.storageId;
            fastify.log.info({ desktopId, storageId: screenshotStorageId }, "📸 Screenshot uploaded to Convex storage");
            return result;
          } catch (storageError: unknown) {
            fastify.log.warn({ desktopId, err: storageError }, "⚠️ Failed to upload screenshot to Convex storage");
            return undefined;
          }
        })();
        
        // Try to get storageId quickly (500ms timeout), but don't block
        try {
          await Promise.race([
            storagePromise,
            new Promise((resolve) => setTimeout(resolve, 500))
          ]);
        } catch (error) {
          // Ignore - storage will continue in background
        }

        // Mark pending request as processed FIRST (before LLM, so we don't retry on LLM failure)
        try {
          const convexClient = getConvexClient();
          
          // Get the most recent unprocessed screenshot request
          const pendingRequests = await convexClient.query("functions/pendingRequests:getByDesktop" as any, {
            desktopId,
          });
          
          // Find the most recent screenshot request that's not processed
          const unprocessedScreenshots = (pendingRequests || [])
            .filter((req: { requestType: string; processed: boolean }) => 
              req.requestType === "screenshot" && !req.processed
            );
          
          fastify.log.info({ 
            desktopId, 
            totalPendingRequests: pendingRequests?.length || 0,
            unprocessedScreenshotCount: unprocessedScreenshots.length,
            unprocessedRequestIds: unprocessedScreenshots.map((req: { _id: string }) => String(req._id))
          }, "📸 Looking for unprocessed screenshot requests");
          
          const screenshotRequest = unprocessedScreenshots
            .sort((a: { createdAt: number }, b: { createdAt: number }) => 
              b.createdAt - a.createdAt
            )[0];
          
          if (screenshotRequest) {
            // Mark request as processed - screenshot will be in assistant message
            const requestIdString = String(screenshotRequest._id);
            await convexClient.mutation("functions/pendingRequests:markAsProcessed" as any, {
              requestId: screenshotRequest._id,
            });
            fastify.log.info({ 
              desktopId, 
              requestId: requestIdString,
              requestCreatedAt: (screenshotRequest as any).createdAt,
              timeSinceCreated: Date.now() - (screenshotRequest as any).createdAt
            }, "📸 Screenshot request marked as processed - will be included in assistant message");
          } else {
            // If no unprocessed request found, log all requests for debugging
            const allScreenshotRequests = (pendingRequests || [])
              .filter((req: { requestType: string }) => req.requestType === "screenshot");
            if (allScreenshotRequests.length > 0) {
              fastify.log.warn({ 
                desktopId,
                screenshotRequestCount: allScreenshotRequests.length,
                allProcessed: allScreenshotRequests.every((req: { processed: boolean }) => req.processed),
                requestIds: allScreenshotRequests.map((req: { _id: string; processed: boolean }) => ({
                  id: String(req._id),
                  processed: req.processed
                }))
              }, "📸 All screenshot requests are already processed - may have been handled by another upload");
            } else {
              fastify.log.warn({ desktopId }, "📸 No screenshot request found at all - request may not have been created or desktop disconnected");
            }
          }
        } catch (markError: unknown) {
          fastify.log.warn({ desktopId, err: markError }, "Failed to mark pending request as processed");
        }

        // Analyze screenshot with LLM
        let aiResponse: string | undefined;
        try {
          fastify.log.info({ desktopId, queryLength: userQuery.length }, "📸 Starting LLM analysis");
          aiResponse = await analyzeWithLLM(base64, "image", userQuery, undefined, fastify.log);
          fastify.log.info({ desktopId, responseLength: aiResponse?.length || 0 }, "📸 Screenshot analysis complete");
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          fastify.log.error({ desktopId, err: error, errorMessage }, "❌ Failed to analyze screenshot with LLM");
          // Set a fallback response so user knows something happened
          aiResponse = `I received your screenshot but encountered an error analyzing it: ${errorMessage}. Please try again.`;
        }

        // Create assistant message in chat (always create one, even if LLM failed)
        if (aiResponse) {
          try {
            const convexClient = getConvexClient();
            // Get session by desktopId
            const session = await convexClient.query("functions/sessions:getByDesktopId" as any, {
              desktopId,
            });

            if (session) {
              // Find the most recent user message without an assistant response
              const messages = await convexClient.query("functions/messages:getBySession" as any, {
                sessionId: session._id,
              });

              // Find the most recent user message that requested screenshot
              const recentUserMessage = (messages || [])
                .filter((msg: { role: string; mediaType: string | null }) => 
                  msg.role === "user" && !msg.mediaType
                )
                .sort((a: { createdAt: number }, b: { createdAt: number }) => 
                  b.createdAt - a.createdAt
                )[0];

              // Check if there's already an assistant response for this message
              if (recentUserMessage) {
                const hasResponse = (messages || []).some(
                  (msg: { role: string; createdAt: number }) =>
                    msg.role === "assistant" && msg.createdAt > recentUserMessage.createdAt
                );

                if (!hasResponse) {
                  // Wait for storage to complete so we have the storageId
                  let screenshotStorageId: string | undefined;
                  try {
                    const storageResult = await storagePromise;
                    if (storageResult?.storageId) {
                      screenshotStorageId = storageResult.storageId;
                      fastify.log.info({ desktopId, storageId: screenshotStorageId }, "📸 Screenshot stored in Convex, got storageId");
                    } else {
                      fastify.log.warn({ desktopId }, "📸 Screenshot storage completed but no storageId returned");
                    }
                  } catch (storageError) {
                    fastify.log.error({ desktopId, err: storageError }, "❌ Failed to get storageId for screenshot");
                    // Continue anyway - mobile can still see the assistant response
                  }
                  
                  // Create assistant message with screenshot reference
                  // Store the storageId so mobile can fetch the screenshot from Convex
                  await convexClient.mutation("functions/messages:create" as any, {
                    sessionId: session._id,
                    role: "assistant",
                    content: aiResponse,
                    mediaType: "screenshot",
                    mediaStorageId: screenshotStorageId, // Store the Convex storage ID
                    // Don't store base64 URL - it exceeds Convex 1MB limit
                    mediaUrl: undefined,
                    createdAt: Date.now(),
                  });
                  fastify.log.info({ 
                    desktopId, 
                    sessionId: session._id, 
                    responseLength: aiResponse.length,
                    hasStorageId: !!screenshotStorageId
                  }, "✅ Assistant message created in chat with screenshot");
                } else {
                  fastify.log.info({ desktopId }, "📸 Assistant response already exists for this message");
                }
              } else {
                fastify.log.warn({ desktopId }, "📸 No recent user message found to link assistant response");
              }
            } else {
              fastify.log.warn({ desktopId }, "📸 No session found for desktopId");
            }
          } catch (chatError: unknown) {
            const errorMessage = chatError instanceof Error ? chatError.message : "Unknown error";
            fastify.log.error({ desktopId, err: chatError, errorMessage }, "❌ Failed to create chat message for screenshot");
            // Don't fail the upload - screenshot was processed successfully
          }
        } else {
          fastify.log.warn({ desktopId }, "📸 No AI response to create message with");
        }

        return {
          screenshotUrl: `data:image/png;base64,${base64}`, // Keep for immediate preview
          storageId: screenshotStorageId, // May be undefined if upload not complete yet
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
        
        // Upload to Convex file storage via HTTP action (in background, don't block response)
        let videoStorageId: string | undefined;
        const videoStoragePromise = (async () => {
          try {
            const convexSiteUrl = getConvexSiteUrl();
            const formData = new FormData();
            
            // Convert base64 to Buffer, then to Blob (Node.js 18+ has Blob)
            const fileBuffer = Buffer.from(base64, "base64");
            const extension = videoMimeType.includes("webm") ? "webm" : "mp4";
            // @ts-ignore - Buffer works with Blob in Node.js 18+
            const fileBlob = new Blob([fileBuffer], { type: videoMimeType });
            
            // @ts-ignore - FormData.append accepts Blob with filename in Node.js
            formData.append("file", fileBlob, `video.${extension}`);
            formData.append("contentType", videoMimeType);
            
            const response = await fetch(`${convexSiteUrl}/storeFile`, {
              method: "POST",
              body: formData,
            });
            
            if (!response.ok) {
              const errorText = await response.text().catch(() => response.statusText);
              throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            const result = await response.json() as { storageId: string };
            videoStorageId = result.storageId;
            fastify.log.info({ desktopId, storageId: videoStorageId }, "🎥 Video uploaded to Convex storage");
            return result;
          } catch (storageError: unknown) {
            fastify.log.warn({ desktopId, err: storageError }, "⚠️ Failed to upload video to Convex storage");
            return undefined;
          }
        })();
        
        // Try to get storageId quickly (1s timeout for videos), but don't block
        try {
          await Promise.race([
            videoStoragePromise,
            new Promise((resolve) => setTimeout(resolve, 1000)) // 1s timeout for videos
          ]);
        } catch (error) {
          // Ignore - storage will continue in background
        }

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
          videoUrl: `data:${videoMimeType};base64,${base64}`, // Keep for immediate preview
          storageId: videoStorageId, // May be undefined if upload not complete yet
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
