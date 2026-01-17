import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

// Store file via HTTP action (ctx.storage.store is only available in HTTP actions)
http.route({
  path: "/storeFile",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // Get file data from request body
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const contentType = formData.get("contentType") as string | null;

      if (!file) {
        return new Response(JSON.stringify({ error: "No file provided" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Store the file in Convex storage
      const storageId = await ctx.storage.store(file);

      return new Response(
        JSON.stringify({ storageId }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return new Response(
        JSON.stringify({ error: errorMessage }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }
  }),
});

// CORS preflight
http.route({
  path: "/storeFile",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Max-Age": "86400",
      },
    });
  }),
});

export default http;
