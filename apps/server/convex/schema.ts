import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  sessions: defineTable({
    desktopId: v.string(),
    mobileConnected: v.boolean(),
    pairingCode: v.string(),
    // Clerk user ID - links session to authenticated user
    // Optional: sessions can exist without auth (pairing-based)
    // If userId is present, user can access session across devices
    userId: v.optional(v.string()), // Clerk user ID from request.auth.userId
    createdAt: v.number(),
    // Note: Model selection removed - using Gemini Flash as default
    // Can be configured in backend service if needed to switch models later
  })
    .index("by_pairing_code", ["pairingCode"])
    .index("by_desktop_id", ["desktopId"])
    .index("by_user", ["userId"]), // Index for querying user's sessions

  messages: defineTable({
    sessionId: v.id("sessions"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    mediaType: v.union(v.literal("screenshot"), v.literal("video"), v.null()),
    mediaStorageId: v.optional(v.id("_storage")), // Reference to Convex file storage
    mediaUrl: v.optional(v.string()),
    // model field removed - always uses Gemini Flash (can be tracked in backend if needed)
    createdAt: v.number(),
  }).index("by_session", ["sessionId"]),

  pendingRequests: defineTable({
    desktopId: v.string(),
    requestType: v.union(
      v.literal("screenshot"),
      v.literal("start-recording"),
      v.literal("stop-recording")
    ),
    processed: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_desktop_id", ["desktopId"])
    .index("by_desktop_unprocessed", ["desktopId", "processed"]),
});
