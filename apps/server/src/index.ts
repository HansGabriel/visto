import Fastify from "fastify";

const fastify = Fastify({
  logger: true,
});

// Health check endpoint
fastify.get("/health", async () => {
  return { status: "ok", timestamp: Date.now() };
});

// Start server
const start = async () => {
  try {
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
    await fastify.listen({ port, host: "0.0.0.0" });
    console.log(`Server listening on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
