import { GoogleGenerativeAI } from "@google/generative-ai";

// Using Gemini 1.5 Flash as default (fast, free tier)
// Can be switched to gemini-1.5-pro in backend if needed for better video analysis
const DEFAULT_MODEL = "gemini-1.5-flash";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_KEY!);

export async function analyzeWithLLM(
  mediaBase64: string,
  mediaType: "image" | "video",
  userQuery: string,
  model?: "gemini-1.5-flash" | "gemini-1.5-pro" // Optional model override
): Promise<string> {
  // Use provided model or default to Flash
  const modelName = model || DEFAULT_MODEL;
  const geminiModel = genAI.getGenerativeModel({ model: modelName });

  // Determine MIME type based on media type
  const mimeType = mediaType === "video" ? "video/mp4" : "image/png";

  // Generate content with media and query
  const result = await geminiModel.generateContent([
    {
      inlineData: {
        data: mediaBase64,
        mimeType,
      },
    },
    userQuery,
  ]);

  return result.response.text();
}

// Optional: Helper function to switch models if needed later
// Can be called from routes with model parameter if model selection is added back
export async function analyzeWithGeminiPro(
  mediaBase64: string,
  mediaType: "image" | "video",
  userQuery: string
): Promise<string> {
  return analyzeWithLLM(mediaBase64, mediaType, userQuery, "gemini-1.5-pro");
}
