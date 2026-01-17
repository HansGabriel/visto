import { clerkPlugin } from "@clerk/fastify";
import { FastifyInstance } from "fastify";

export async function registerClerk(fastify: FastifyInstance) {
  // Register Clerk plugin with Fastify
  await fastify.register(clerkPlugin, {
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
  });

  // After registration, fastify.clerkVerify is available
  // Clerk adds auth object to request if token is valid
}
