import "dotenv/config";
import Fastify from "fastify";
import { registerClerk } from "./plugins/clerk";
import desktopRoutes from "./routes/desktop";
import mobileRoutes from "./routes/mobile";
import chatRoutes from "./routes/chat";

const fastify = Fastify({
  logger: true,
});

// Start server
const start = async () => {
  try {
    // Register CORS plugin
    await fastify.register(import("@fastify/cors"), {
      origin: true, // Allow all origins for prototype
      credentials: true,
    });

    // Register multipart plugin for file uploads
    await fastify.register(import("@fastify/multipart"), {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max file size
      },
    });

    // Register Clerk plugin (optional - will work without it)
    if (process.env.CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY) {
      await fastify.register(registerClerk);
    }

    // Register routes
    await fastify.register(desktopRoutes);
    await fastify.register(mobileRoutes);
    await fastify.register(chatRoutes);

    // Health check endpoint
    fastify.get("/health", async () => {
      return { status: "ok", timestamp: Date.now() };
    });

    const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
    await fastify.listen({ port, host: "0.0.0.0" });
    console.log(`Server listening on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
