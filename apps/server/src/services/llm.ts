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

  // Enhance the prompt to be more casual and concise
  // This must be done before the try block so fallback models can use it
  let enhancedQuery = userQuery;
  
  // Add system prompt for casual, informative responses
  const systemPrompt = `You are a helpful virtual assistant. Respond in a friendly, casual, and informative way. Keep responses concise but complete - aim for 2-4 sentences unless more detail is specifically requested. Be conversational and human-like, avoiding overly technical jargon unless necessary.`;
  
  if (mediaType === "video") {
    enhancedQuery = `${systemPrompt}

User's question: ${userQuery}

IMPORTANT: When analyzing this video, ensure you:
- Examine ALL frames from beginning to end, especially the final frame
- Capture ALL visible content, details, text, numbers, and information
- Do not miss or overlook content that appears in later frames
- Analyze the complete final state shown at the end of the video`;
  } else {
    // For images, add the system prompt
    enhancedQuery = `${systemPrompt}

User's question: ${userQuery}`;
  }

  try {
    
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
                { text: enhancedQuery },
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

// Handle text-only chat messages (no media)
export async function chatWithLLM(
  userMessage: string,
  model?: string,
  logger?: { info: (obj: unknown, msg: string) => void; error: (obj: unknown, msg: string) => void }
): Promise<string> {
  const modelName = model || DEFAULT_MODEL;
  
  if (logger) {
    logger.info({ model: modelName, messageLength: userMessage.length }, `💬 Calling Gemini ${modelName} for text chat`);
  }

  const startTime = Date.now();

  try {
    // Add system prompt for casual, informative responses
    const systemPrompt = `You are a helpful virtual assistant. Respond in a friendly, casual, and informative way. Keep responses concise but complete - aim for 2-4 sentences unless more detail is specifically requested. Be conversational and human-like, avoiding overly technical jargon unless necessary.`;
    
    const enhancedMessage = `${systemPrompt}

User's question: ${userMessage}`;
    
    // Generate content with text only (no media)
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        { text: enhancedMessage },
      ],
    });

    const responseText = response.text || "";
    const duration = Date.now() - startTime;

    if (logger) {
      logger.info({ model: modelName, duration, responseLength: responseText.length }, `💬 Gemini ${modelName} chat response received`);
    }

    return responseText;
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    
    if (error instanceof Error) {
      const errorDetails: Record<string, unknown> = {
        model: modelName,
        duration,
        message: error.message,
      };
      
      if ('status' in error) {
        errorDetails.status = (error as { status?: number }).status;
      }
      if ('statusText' in error) {
        errorDetails.statusText = (error as { statusText?: string }).statusText;
      }
      
      if (logger) {
        logger.error(errorDetails, `💬 Gemini ${modelName} chat error`);
      }
      
      // Try fallback models if model not found
      if (error.message.includes('404') || error.message.includes('not found')) {
        const fallbackModels = [
          "gemini-2.0-flash",
          "gemini-3-flash-preview",
          "gemini-2.5-pro",
          "gemini-1.5-flash",
        ];
        
        if (logger) {
          logger.info({ originalModel: modelName, fallbacks: fallbackModels }, `💬 Trying fallback models for ${modelName}`);
        }
        
        for (const fallbackModel of fallbackModels) {
          if (fallbackModel === modelName) continue;
          
          try {
            if (logger) {
              logger.info({ fallbackModel }, `💬 Trying fallback model: ${fallbackModel}`);
            }
            
            const fallbackResponse = await ai.models.generateContent({
              model: fallbackModel,
              contents: [
                { text: userMessage },
              ],
            });
            
            const fallbackResponseText = fallbackResponse.text || "";
            const totalDuration = Date.now() - startTime;
            
            if (logger) {
              logger.info({ model: fallbackModel, duration: totalDuration, responseLength: fallbackResponseText.length }, `💬 Gemini ${fallbackModel} chat response received (fallback)`);
            }
            
            return fallbackResponseText;
          } catch (fallbackError: unknown) {
            if (logger) {
              logger.info({ fallbackModel, err: fallbackError }, `💬 Fallback model ${fallbackModel} also failed`);
            }
          }
        }
        
        throw new Error(`Gemini model "${modelName}" and all fallback models failed. Please check your API key has access to Gemini models. Error: ${error.message}`);
      }
    } else {
      if (logger) {
        logger.error({ model: modelName, duration, err: error }, `💬 Gemini ${modelName} chat error`);
      }
    }
    
    throw error;
  }
}

// Transcribe audio to text using Gemini
export async function transcribeAudio(
  audioBase64: string,
  mimeType: string = "audio/m4a",
  logger?: { info: (obj: unknown, msg: string) => void; error: (obj: unknown, msg: string) => void }
): Promise<string> {
  const modelName = DEFAULT_MODEL;
  
  if (logger) {
    logger.info({ model: modelName, mimeType, audioSizeKB: Math.round(audioBase64.length * 0.75 / 1024) }, `🎤 Calling Gemini ${modelName} for audio transcription`);
  }

  const startTime = Date.now();

  // Validate base64 data
  if (!audioBase64 || audioBase64.length === 0) {
    throw new Error("Audio base64 data is empty");
  }

  try {
    // Use Gemini's audio understanding to transcribe
    const response = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          inlineData: {
            mimeType,
            data: audioBase64,
          },
        },
        { text: "Transcribe this audio to text. Return only the transcribed text, without any additional commentary or formatting." },
      ],
    });

    const transcription = response.text || "";
    const duration = Date.now() - startTime;

    if (logger) {
      logger.info({ model: modelName, duration, transcriptionLength: transcription.length }, `🎤 Gemini ${modelName} transcription received`);
    }

    return transcription.trim();
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    
    if (error instanceof Error) {
      const errorDetails: Record<string, unknown> = {
        model: modelName,
        duration,
        message: error.message,
      };
      
      if ('status' in error) {
        errorDetails.status = (error as { status?: number }).status;
      }
      if ('statusText' in error) {
        errorDetails.statusText = (error as { statusText?: string }).statusText;
      }
      
      if (logger) {
        logger.error(errorDetails, `🎤 Gemini ${modelName} transcription error`);
      }
      
      // Try fallback models if model not found
      if (error.message.includes('404') || error.message.includes('not found')) {
        const fallbackModels = [
          "gemini-2.0-flash",
          "gemini-3-flash-preview",
          "gemini-2.5-pro",
          "gemini-1.5-flash",
        ];
        
        if (logger) {
          logger.info({ originalModel: modelName, fallbacks: fallbackModels }, `🎤 Trying fallback models for ${modelName}`);
        }
        
        for (const fallbackModel of fallbackModels) {
          if (fallbackModel === modelName) continue;
          
          try {
            if (logger) {
              logger.info({ fallbackModel }, `🎤 Trying fallback model: ${fallbackModel}`);
            }
            
            const fallbackResponse = await ai.models.generateContent({
              model: fallbackModel,
              contents: [
                {
                  inlineData: {
                    mimeType,
                    data: audioBase64,
                  },
                },
                { text: "Transcribe this audio to text. Return only the transcribed text, without any additional commentary or formatting." },
              ],
            });
            
            const fallbackTranscription = fallbackResponse.text || "";
            const totalDuration = Date.now() - startTime;
            
            if (logger) {
              logger.info({ model: fallbackModel, duration: totalDuration, transcriptionLength: fallbackTranscription.length }, `🎤 Gemini ${fallbackModel} transcription received (fallback)`);
            }
            
            return fallbackTranscription.trim();
          } catch (fallbackError: unknown) {
            if (logger) {
              logger.info({ fallbackModel, err: fallbackError }, `🎤 Fallback model ${fallbackModel} also failed`);
            }
            // Continue to next fallback
          }
        }
        
        throw new Error(`Gemini model "${modelName}" and all fallback models failed for transcription. Please check your API key has access to Gemini models. Error: ${error.message}`);
      }
    } else {
      if (logger) {
        logger.error({ model: modelName, duration, err: error }, `🎤 Gemini ${modelName} transcription error`);
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
