import { clerkPlugin } from "@clerk/fastify";
import { FastifyInstance } from "fastify";

/**
 * Register Clerk authentication plugin
 * @param fastify - Fastify instance
 */
export async function registerClerk(fastify: FastifyInstance): Promise<void> {
  try {
    // Register Clerk plugin with Fastify
    await fastify.register(clerkPlugin, {
      publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
      secretKey: process.env.CLERK_SECRET_KEY,
    });
    fastify.log.info("Clerk plugin registered");
    // After registration, fastify.clerkVerify is available
    // Clerk adds auth object to request if token is valid
  } catch (error: unknown) {
    fastify.log.error({ err: error }, "Failed to register Clerk plugin");
    throw error;
  }
}
