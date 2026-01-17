import { GoogleGenAI } from "@google/genai";

// Using Gemini 2.5 Flash as default (fast, cost-efficient, current stable model)
// Will automatically try fallback models if this fails
const DEFAULT_MODEL = "gemini-2.5-flash";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_KEY! });

export async function analyzeWithLLM(
  mediaBase64: string,
  mediaType: "image" | "video",
  userQuery: string,
  model?: string, // Optional model override
  logger?: { info: (obj: unknown, msg: string) => void; error: (obj: unknown, msg: string) => void },
  mimeTypeOverride?: string // Optional MIME type override (for video formats like webm)
): Promise<string> {
  // Use provided model or default to Flash
  const modelName = model || DEFAULT_MODEL;
  
  // Determine MIME type - use override if provided, otherwise default
  const mimeType = mimeTypeOverride || (mediaType === "video" ? "video/webm" : "image/png");
  const mediaSizeKB = Math.round(mediaBase64.length * 0.75 / 1024); // Approximate size

  if (logger) {
    logger.info({ model: modelName, mediaType, mediaSizeKB, queryLength: userQuery.length }, `🤖 Calling Gemini ${modelName} for ${mediaType} analysis`);
  }

  const startTime = Date.now();

  // Validate base64 data
  if (!mediaBase64 || mediaBase64.length === 0) {
    throw new Error("Media base64 data is empty");
  }

  try {
    // For videos, enhance the prompt to ensure comprehensive analysis
    let enhancedQuery = userQuery;
    if (mediaType === "video") {
      // Add general instructions to analyze all frames comprehensively
      enhancedQuery = `${userQuery}

IMPORTANT: When analyzing this video, ensure you:
- Examine ALL frames from beginning to end, especially the final frame
- Capture ALL visible content, details, text, numbers, and information
- Do not miss or overlook content that appears in later frames
- Analyze the complete final state shown at the end of the video`;
    }
    
    // Generate content with media and query using new API
    // Note: For videos, ensure the base64 data is valid and the MIME type matches
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          inlineData: {
            mimeType,
            data: mediaBase64,
          },
        },
        { text: enhancedQuery },
      ],
    });

    const responseText = response.text || "";
    const duration = Date.now() - startTime;

    if (logger) {
      logger.info({ model: modelName, mediaType, duration, responseLength: responseText.length }, `🤖 Gemini ${modelName} response received`);
    }

    return responseText;
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    
    // Enhanced error logging with fallback logic
    if (error instanceof Error) {
      const errorDetails: Record<string, unknown> = {
        model: modelName,
        mediaType,
        duration,
        message: error.message,
      };
      
      // Check if it's an API error with status code
      if ('status' in error) {
        errorDetails.status = (error as { status?: number }).status;
      }
      if ('statusText' in error) {
        errorDetails.statusText = (error as { statusText?: string }).statusText;
      }
      
      if (logger) {
        logger.error(errorDetails, `🤖 Gemini ${modelName} error`);
      }
      
      // If model not found, try fallback models
      if (error.message.includes('404') || error.message.includes('not found')) {
        // Try fallback models in order (current active models)
        const fallbackModels = [
          "gemini-2.0-flash",
          "gemini-3-flash-preview",
          "gemini-2.5-pro",
          "gemini-1.5-flash",
        ];
        
        if (logger) {
          logger.info({ originalModel: modelName, fallbacks: fallbackModels }, `🤖 Trying fallback models for ${modelName}`);
        }
        
        // Try fallback models
        for (const fallbackModel of fallbackModels) {
          if (fallbackModel === modelName) continue; // Skip if already tried
          
          try {
            if (logger) {
              logger.info({ fallbackModel }, `🤖 Trying fallback model: ${fallbackModel}`);
            }
            
            const fallbackResponse = await ai.models.generateContent({
              model: fallbackModel,
              contents: [
                {
                  inlineData: {
                    mimeType,
                    data: mediaBase64,
                  },
                },
                { text: userQuery },
              ],
            });
            
            const fallbackResponseText = fallbackResponse.text || "";
            const totalDuration = Date.now() - startTime;
            
            if (logger) {
              logger.info({ model: fallbackModel, mediaType, duration: totalDuration, responseLength: fallbackResponseText.length }, `🤖 Gemini ${fallbackModel} response received (fallback)`);
            }
            
            return fallbackResponseText;
          } catch (fallbackError: unknown) {
            if (logger) {
              logger.info({ fallbackModel, err: fallbackError }, `🤖 Fallback model ${fallbackModel} also failed`);
            }
            // Continue to next fallback
          }
        }
        
        // All fallbacks failed
        throw new Error(`Gemini model "${modelName}" and all fallback models failed. Please check your API key has access to Gemini models. Error: ${error.message}`);
      }
    } else {
      if (logger) {
        logger.error({ model: modelName, mediaType, duration, err: error }, `🤖 Gemini ${modelName} error`);
      }
    }
    
    throw error;
  }
}

// Optional: Helper function to switch models if needed later
// Can be called from routes with model parameter if model selection is added back
export async function analyzeWithGeminiPro(
  mediaBase64: string,
  mediaType: "image" | "video",
  userQuery: string
): Promise<string> {
  return analyzeWithLLM(mediaBase64, mediaType, userQuery, "gemini-2.5-pro");
}
