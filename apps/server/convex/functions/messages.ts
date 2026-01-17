import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

// Create a message
export const create = mutation({
  args: {
    sessionId: v.id("sessions"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    mediaType: v.union(v.literal("screenshot"), v.literal("video"), v.null()),
    mediaStorageId: v.optional(v.id("_storage")),
    mediaUrl: v.optional(v.string()),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("messages", {
      sessionId: args.sessionId,
      role: args.role,
      content: args.content,
      mediaType: args.mediaType,
      mediaStorageId: args.mediaStorageId,
      mediaUrl: args.mediaUrl,
      createdAt: args.createdAt,
    });
  },
});

// Get messages by session
export const getBySession = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();
    // Sort by createdAt in ascending order (oldest first, newest last)
    return messages.sort((a, b) => a.createdAt - b.createdAt);
  },
});
