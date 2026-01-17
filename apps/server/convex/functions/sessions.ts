import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

// Create a new session
export const create = mutation({
  args: {
    desktopId: v.string(),
    pairingCode: v.string(),
    mobileConnected: v.boolean(),
    userId: v.optional(v.string()),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sessions", {
      desktopId: args.desktopId,
      pairingCode: args.pairingCode,
      mobileConnected: args.mobileConnected,
      userId: args.userId,
      createdAt: args.createdAt,
    });
  },
});

// Find session by pairing code
export const findByPairingCode = query({
  args: { pairingCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_pairing_code", (q) =>
        q.eq("pairingCode", args.pairingCode)
      )
      .first();
  },
});

// Get session by ID
export const getById = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

// Update mobile connected status
export const updateMobileConnected = mutation({
  args: {
    sessionId: v.id("sessions"),
    mobileConnected: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      mobileConnected: args.mobileConnected,
    });
  },
});
