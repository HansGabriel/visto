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
    // Build insert object - only include mediaUrl if it's actually provided and not too large
    // NOTE: Never store base64 URLs (they exceed 1MB limit) - only store storageId
    const insertData: any = {
      sessionId: args.sessionId,
      role: args.role,
      content: args.content,
      mediaType: args.mediaType,
      createdAt: args.createdAt,
    };
    
    // Only include mediaStorageId if provided
    if (args.mediaStorageId) {
      insertData.mediaStorageId = args.mediaStorageId;
    }
    
    // Only include mediaUrl if provided AND it's not a base64 data URL (which would be too large)
    // Base64 data URLs start with "data:image/" or "data:video/"
    if (args.mediaUrl && !args.mediaUrl.startsWith("data:")) {
      insertData.mediaUrl = args.mediaUrl;
    }
    // If mediaUrl is a base64 data URL, skip it entirely (it exceeds Convex's 1MB limit)
    
    return await ctx.db.insert("messages", insertData);
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
