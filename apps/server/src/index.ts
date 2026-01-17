import "dotenv/config";
import Fastify, { FastifyInstance } from "fastify";
import desktopRoutes from "./routes/desktop";
import mobileRoutes from "./routes/mobile";
import chatRoutes from "./routes/chat";

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || "info",
    transport:
      process.env.NODE_ENV === "development"
        ? {
            target: "pino-pretty",
            options: {
              translateTime: "HH:MM:ss Z",
              ignore: "pid,hostname",
              colorize: true,
            },
          }
        : undefined,
  },
  requestIdLogLabel: "reqId",
  disableRequestLogging: true, // Disable default request logging - we'll log only what we need
  bodyLimit: 50 * 1024 * 1024, // 50MB (for chat messages with media data URLs)
});

// Allow empty JSON bodies by overriding the default JSON parser
fastify.removeContentTypeParser("application/json");
fastify.addContentTypeParser("application/json", { parseAs: "string" }, (req, body, done) => {
  try {
    const bodyStr = typeof body === "string" ? body : "";
    // Handle empty body or null string
    if (!bodyStr || bodyStr === "" || bodyStr === "null") {
      done(null, {});
    } else {
      const trimmed = bodyStr.trim();
      if (trimmed === "") {
        done(null, {});
      } else {
        const json = JSON.parse(trimmed);
        done(null, json);
      }
    }
  } catch (err) {
    done(err as Error, undefined);
  }
});

/**
 * Register graceful shutdown handlers
 */
function setupGracefulShutdown(server: FastifyInstance): void {
  const shutdown = async (signal: string): Promise<void> => {
    server.log.info({ signal }, "Received shutdown signal, starting graceful shutdown");
    try {
      await server.close();
      server.log.info("Server closed successfully");
      process.exit(0);
    } catch (err) {
      server.log.error({ err }, "Error during shutdown");
      process.exit(1);
    }
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });
  
  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });

  process.on("uncaughtException", (err: Error) => {
    server.log.fatal({ err }, "Uncaught exception");
    // Use void to explicitly mark as fire-and-forget, but ensure process exits
    void shutdown("uncaughtException").catch(() => {
      // If shutdown fails, force exit
      process.exit(1);
    });
  });

  process.on("unhandledRejection", (reason: unknown) => {
    server.log.fatal({ reason }, "Unhandled rejection");
    // Use void to explicitly mark as fire-and-forget, but ensure process exits
    void shutdown("unhandledRejection").catch(() => {
      // If shutdown fails, force exit
      process.exit(1);
    });
  });
}

/**
 * Start the server and register all plugins and routes
 */
const start = async (): Promise<void> => {
  try {
    fastify.log.info("Starting server initialization");

    // Register CORS plugin
    await fastify.register(import("@fastify/cors"), {
      origin: true,
      credentials: true,
    });

    // Register multipart plugin for file uploads
    await fastify.register(import("@fastify/multipart"), {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max file size
      },
    });

    // Register routes
    await fastify.register(desktopRoutes);
    await fastify.register(mobileRoutes);
    await fastify.register(chatRoutes);

    // Health check endpoint
    fastify.get("/health", async () => {
      return { status: "ok", timestamp: Date.now() };
    });

    // Add request logging hook - only log important requests (not polling, not OPTIONS)
    fastify.addHook("onRequest", async (request, reply) => {
      // Only log non-polling, non-OPTIONS requests
      if (
        !request.url.includes("/pending-requests") &&
        request.method !== "OPTIONS" &&
        request.url !== "/health"
      ) {
        fastify.log.info(
          {
            reqId: request.id,
            method: request.method,
            url: request.url,
            ip: request.ip,
          },
          "Incoming request"
        );
      }
    });

    // Add error logging hook
    fastify.addHook("onError", async (request, reply, error) => {
      fastify.log.error(
        {
          reqId: request.id,
          method: request.method,
          url: request.url,
          err: error,
        },
        "Request error"
      );
    });

    // Setup graceful shutdown
    setupGracefulShutdown(fastify);

    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    const host = process.env.HOST || "0.0.0.0";

    fastify.log.info({ port, host }, "Starting server");
    await fastify.listen({ port, host });
    fastify.log.info({ port, host, url: `http://${host}:${port}` }, "Server listening");
  } catch (err) {
    fastify.log.fatal({ err }, "Failed to start server");
    process.exit(1);
  }
};

start();
