import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { ConvexHttpClient } from "convex/browser";
import { analyzeWithLLM, chatWithLLM } from "../services/llm";
import { getScreenshotCache, deleteScreenshotCache } from "../services/screenshotCache";

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
          screenshotUrl?: string;
          videoUrl?: string;
          storageId?: string; // Convex storage ID for media
        };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { sessionId } = request.params;
        const { message, requestScreenshot, screenshotUrl, videoUrl, storageId } = request.body;

        // Log what we received for debugging
        fastify.log.info({ 
          sessionId, 
          hasMessage: !!message, 
          hasScreenshotUrl: !!screenshotUrl,
          hasVideoUrl: !!videoUrl,
          hasStorageId: !!storageId,
          screenshotUrlLength: screenshotUrl?.length || 0,
          messageLength: message?.length || 0
        }, "📨 Received message request");

        // Message is required unless we have media
        if (!message && !screenshotUrl && !videoUrl) {
          return reply.code(400).send({ error: "Message or media is required" });
        }

        // Determine media type
        const mediaType = screenshotUrl ? ("screenshot" as const) : videoUrl ? ("video" as const) : null;
        // NOTE: Do NOT store base64 URLs in Convex - they exceed the 1MB limit
        // Only store storageId if available. Base64 URLs are used only for LLM analysis.

        // Create user message in Convex
        const convexClient = getConvexClient();
        // Build mutation args without mediaUrl (never store base64 URLs)
        const messageArgs: any = {
          sessionId: sessionId as any,
          role: "user",
          content: message || (screenshotUrl ? "Screenshot" : videoUrl ? "Video recording" : ""),
          mediaType,
          createdAt: Date.now(),
        };
        // Only include mediaStorageId if we have it
        if (storageId) {
          messageArgs.mediaStorageId = storageId as any;
        }
        // EXPLICITLY DO NOT include mediaUrl - base64 URLs exceed 1MB limit
        // The Convex function will also skip mediaUrl if it's a base64 data URL
        
        const messageId = await convexClient.mutation(
          "functions/messages:create" as any,
          messageArgs
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

        // Analyze with LLM - handle text-only, screenshot, and video messages
        let aiResponse: string | undefined;
        const userQuery = message || (screenshotUrl ? "Describe what you see in this screenshot in detail." : videoUrl || storageId ? "Analyze this video and describe what happens." : "");
        
        // Handle video analysis - either from videoUrl or storageId
        if (mediaType === "video") {
          try {
            fastify.log.info({ sessionId, queryLength: userQuery.length, hasVideoUrl: !!videoUrl, hasStorageId: !!storageId }, "🎥 Starting video analysis");
            
            let videoBase64: string | undefined;
            let mimeType = "video/webm"; // Default MIME type
            
            // If we have videoUrl (data URL), extract base64
            if (videoUrl) {
              // Extract MIME type from data URL
              const mimeMatch = videoUrl.match(/^data:video\/([^;]+)/);
              if (mimeMatch) {
                mimeType = `video/${mimeMatch[1]}`;
              }
              videoBase64 = videoUrl.replace(/^data:video\/[^;]+;base64,/, "");
              fastify.log.info({ sessionId, mimeType, videoSizeKB: Math.round(videoBase64.length * 0.75 / 1024) }, "🎥 Using videoUrl for analysis");
            } else if (storageId) {
              // If we only have storageId, get the file URL and fetch it
              try {
                fastify.log.info({ sessionId, storageId }, "🎥 Fetching video URL from Convex storage");
                const fileUrl = await convexClient.query("functions/storage:getFileUrl" as any, {
                  storageId: storageId as any,
                });
                
                if (fileUrl) {
                  fastify.log.info({ sessionId, storageId, fileUrl }, "🎥 Fetching video file from Convex storage for analysis");
                  // Fetch the video file
                  const videoResponse = await fetch(fileUrl);
                  if (!videoResponse.ok) {
                    throw new Error(`Failed to fetch video from storage: HTTP ${videoResponse.status}`);
                  }
                  
                  // Determine MIME type from response headers or URL
                  const contentType = videoResponse.headers.get("content-type");
                  if (contentType && contentType.startsWith("video/")) {
                    mimeType = contentType;
                  } else if (fileUrl.includes(".webm")) {
                    mimeType = "video/webm";
                  } else if (fileUrl.includes(".mp4")) {
                    mimeType = "video/mp4";
                  }
                  
                  // Convert to base64
                  const arrayBuffer = await videoResponse.arrayBuffer();
                  const buffer = Buffer.from(arrayBuffer);
                  videoBase64 = buffer.toString("base64");
                  fastify.log.info({ sessionId, mimeType, videoSizeKB: Math.round(buffer.length / 1024) }, "🎥 Video fetched from storage and converted to base64");
                } else {
                  throw new Error("File URL not found for storage ID");
                }
              } catch (fetchError: unknown) {
                const errorMessage = fetchError instanceof Error ? fetchError.message : "Unknown error";
                fastify.log.error({ sessionId, storageId, err: fetchError, errorMessage }, "❌ Failed to fetch video from storage");
                throw new Error(`Failed to get video for analysis: ${errorMessage}`);
              }
            } else {
              throw new Error("No video URL or storage ID provided for video analysis");
            }
            
            if (videoBase64) {
              aiResponse = await analyzeWithLLM(videoBase64, "video", userQuery, undefined, fastify.log, mimeType);
              fastify.log.info({ sessionId, responseLength: aiResponse.length }, "🎥 Video analysis complete");
            } else {
              throw new Error("Failed to get video data for analysis");
            }
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            fastify.log.error({ sessionId, err: error, errorMessage }, "❌ Video analysis error");
            aiResponse = `Error analyzing video: ${errorMessage}`;
          }
        } else if (screenshotUrl) {
          // Screenshot analysis - analyze screenshot with user's text query
          try {
            fastify.log.info({ sessionId, queryLength: userQuery.length, screenshotUrlLength: screenshotUrl.length }, "📸 Starting screenshot analysis");
            const base64Data = screenshotUrl.replace(/^data:image\/[^;]+;base64,/, "");
            
            if (!base64Data || base64Data.length === 0) {
              throw new Error("Screenshot base64 data is empty");
            }
            
            fastify.log.info({ sessionId, base64Length: base64Data.length }, "📸 Screenshot base64 extracted, sending to LLM");
            aiResponse = await analyzeWithLLM(base64Data, "image", userQuery, undefined, fastify.log);
            fastify.log.info({ sessionId, responseLength: aiResponse.length }, "📸 Screenshot analysis complete");
          } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            fastify.log.error({ sessionId, err: error, errorMessage }, "❌ Screenshot analysis error");
            aiResponse = `Error analyzing screenshot: ${errorMessage}`;
          }
        } else {
          // Text-only chat message (but we should still try to get screenshot for reference)
          try {
            fastify.log.info({ sessionId, messageLength: userQuery.length }, "💬 Starting text chat");
            aiResponse = await chatWithLLM(userQuery, undefined, fastify.log);
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
            // Always attach screenshot to assistant message if we have it (for reference)
            // NOTE: Only store storageId, never base64 URLs (they exceed 1MB limit)
            const assistantMessageArgs: any = {
              sessionId: sessionId as any,
              role: "assistant",
              content: aiResponse,
              mediaType: screenshotUrl ? ("screenshot" as const) : mediaType, // Attach screenshot to assistant response
              createdAt: Date.now(),
            };
            // Only include mediaStorageId if we have it
            if (storageId) {
              assistantMessageArgs.mediaStorageId = storageId as any;
            }
            // DO NOT include mediaUrl - it would contain base64 which exceeds 1MB limit
            
            await convexClient.mutation("functions/messages:create" as any, assistantMessageArgs);
            fastify.log.info({ sessionId, responseLength: aiResponse.length, hasScreenshot: !!screenshotUrl, hasStorageId: !!storageId }, "✅ Assistant message created in chat");
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

        // Map messages and get file URLs from storage IDs
        const messages = await Promise.all(
          (messagesData || []).map(async (msg: { 
            _id: string; 
            role: string; 
            content: string; 
            mediaType: string | null; 
            mediaStorageId?: string;
            mediaUrl?: string; 
            createdAt: number 
          }) => {
            let mediaUrl = msg.mediaUrl;
            
            // If we have a storage ID but no URL, get the URL from Convex
            if (msg.mediaStorageId && !mediaUrl) {
              try {
                const fileUrl = await convexClient.query("functions/storage:getFileUrl" as any, {
                  storageId: msg.mediaStorageId as any,
                });
                mediaUrl = fileUrl || undefined;
              } catch (error: unknown) {
                fastify.log.warn({ storageId: msg.mediaStorageId, err: error }, "Failed to get file URL from storage");
              }
            }
            
            return {
              messageId: msg._id,
              role: msg.role,
              content: msg.content,
              mediaType: msg.mediaType,
              mediaUrl,
              createdAt: msg.createdAt,
            };
          })
        );

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

  // Request screenshot (without creating a message)
  fastify.post(
    "/api/chat/:sessionId/request-screenshot",
    async (
      request: FastifyRequest<{
        Params: { sessionId: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { sessionId } = request.params;
        const convexClient = getConvexClient();

        // Get desktop ID from session
        const session = await convexClient.query("functions/sessions:getById" as any, {
          sessionId: sessionId as any,
        });

        if (!session?.desktopId) {
          return reply.code(404).send({ error: "Session not found or desktop not connected" });
        }

        // Create pending request
        const requestId = await convexClient.mutation("functions/pendingRequests:create" as any, {
          desktopId: session.desktopId,
          requestType: "screenshot",
          processed: false,
          createdAt: Date.now(),
        });

        // Ensure requestId is a string for consistency
        const requestIdString = String(requestId);
        fastify.log.info({ 
          sessionId, 
          desktopId: session.desktopId,
          requestId: requestIdString,
          mobileConnected: session.mobileConnected
        }, "📸 Screenshot request created - desktop should poll and capture");

        // Verify request was created
        const verifyRequest = await convexClient.query("functions/pendingRequests:getByDesktop" as any, {
          desktopId: session.desktopId,
        });
        const createdRequest = (verifyRequest || []).find((req: { _id: string }) => String(req._id) === requestIdString);
        if (!createdRequest) {
          fastify.log.error({ requestId: requestIdString, desktopId: session.desktopId }, "❌ Screenshot request was not found after creation!");
        } else {
          fastify.log.info({ 
            requestId: requestIdString, 
            processed: createdRequest.processed,
            requestType: createdRequest.requestType
          }, "✅ Screenshot request verified in database");
        }

        return {
          requestId: requestIdString,
          status: "requested",
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        fastify.log.error(
          { sessionId: request.params.sessionId, err: error },
          "Failed to request screenshot"
        );
        reply.code(500).send({ error: errorMessage });
      }
    }
  );

  // Get screenshot result
  fastify.get(
    "/api/chat/:sessionId/screenshot-result/:requestId",
    async (
      request: FastifyRequest<{
        Params: { sessionId: string; requestId: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { requestId, sessionId } = request.params;
        const convexClient = getConvexClient();

        // Ensure requestId is a string for cache lookup
        const requestIdString = String(requestId);
        
        // First check in-memory cache for instant base64 URL
        const cached = getScreenshotCache(requestIdString);
        if (cached) {
          fastify.log.info({ 
            requestId: requestIdString, 
            hasStorageId: !!cached.storageId,
            base64UrlLength: cached.base64Url.length,
            expiresAt: cached.expiresAt,
            timeUntilExpiry: cached.expiresAt - Date.now()
          }, "📸 Screenshot found in cache");
          return {
            screenshotUrl: cached.base64Url,
            storageId: cached.storageId, // May be available if upload completed
            isTemporary: !cached.storageId, // Temporary if no storageId yet
          };
        }

        // If not in cache, check if request exists and is processed
        // This helps debug if the desktop captured but didn't cache
        try {
          const session = await convexClient.query("functions/sessions:getById" as any, {
            sessionId: sessionId as any,
          });
          
          if (session?.desktopId) {
            const pendingRequests = await convexClient.query("functions/pendingRequests:getByDesktop" as any, {
              desktopId: session.desktopId,
            });
            
            const foundRequest = (pendingRequests || []).find((req: { _id: string }) => String(req._id) === requestIdString);
            if (foundRequest) {
              fastify.log.warn({ 
                requestId: requestIdString, 
                processed: (foundRequest as any).processed,
                requestType: (foundRequest as any).requestType
              }, "📸 Screenshot request exists but not in cache - desktop may not have uploaded yet");
            } else {
              fastify.log.warn({ requestId: requestIdString }, "📸 Screenshot request not found - may have expired or been deleted");
            }
          }
        } catch (checkError) {
          fastify.log.warn({ requestId: requestIdString, err: checkError }, "📸 Failed to check request status");
        }

        // Not ready yet
        return reply.code(404).send({ error: "Screenshot result not available yet" });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        fastify.log.error(
          { requestId: request.params.requestId, err: error },
          "Failed to get screenshot result"
        );
        reply.code(500).send({ error: errorMessage });
      }
    }
  );

  // Transcribe audio to text
  fastify.post(
    "/api/chat/:sessionId/transcribe",
    async (
      request: FastifyRequest<{
        Params: { sessionId: string };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const data = await request.file();
        
        if (!data) {
          return reply.code(400).send({ error: "No audio file provided" });
        }

        // For now, return a placeholder transcription
        // In production, you would:
        // 1. Read the audio file buffer: const buffer = await data.toBuffer();
        // 2. Convert audio to the format required by your STT service (e.g., Google Speech-to-Text, Whisper API)
        // 3. Send to the STT service
        // 4. Return the transcription
        
        // Placeholder: Return a message indicating transcription is being set up
        // TODO: Implement actual speech-to-text using Google Speech-to-Text API, Whisper, or similar
        fastify.log.info({ sessionId: request.params.sessionId, filename: data.filename }, "🎤 Audio transcription requested (placeholder)");
        
        return reply.code(501).send({ 
          error: "Speech-to-text transcription is not yet implemented. Please type your message." 
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        fastify.log.error(
          { sessionId: request.params.sessionId, err: error },
          "Failed to transcribe audio"
        );
        reply.code(500).send({ error: errorMessage });
      }
    }
  );
}
