import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

// Create a new session
export const create = mutation({
  args: {
    desktopId: v.string(),
    pairingCode: v.string(),
    mobileConnected: v.boolean(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sessions", {
      desktopId: args.desktopId,
      pairingCode: args.pairingCode,
      mobileConnected: args.mobileConnected,
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

// Get session by desktop ID
export const getByDesktopId = query({
  args: { desktopId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_desktop_id", (q) =>
        q.eq("desktopId", args.desktopId)
      )
      .first();
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

// Find session by pairing code (supports flexible matching)
export const findByPairingCodeFlexible = query({
  args: { pairingCode: v.string() },
  handler: async (ctx, args) => {
    const normalizedCode = args.pairingCode.toUpperCase().trim();
    
    // Try exact match first
    const exactMatch = await ctx.db
      .query("sessions")
      .withIndex("by_pairing_code", (q) =>
        q.eq("pairingCode", normalizedCode)
      )
      .first();
    
    if (exactMatch) {
      return exactMatch;
    }
    
    // If code is 5 characters, try to match against 6-character codes
    // (handles backward compatibility with old 5-char codes)
    if (normalizedCode.length === 5) {
      const allSessions = await ctx.db.query("sessions").collect();
      const match = allSessions.find((session) => {
        const sessionCode = session.pairingCode.toUpperCase();
        return sessionCode.length === 6 && sessionCode.startsWith(normalizedCode);
      });
      return match || null;
    }
    
    // If code is 6 characters, try exact match (already tried above, but keep for clarity)
    if (normalizedCode.length === 6) {
      return null; // Already tried exact match above
    }
    
    return null;
  },
});
