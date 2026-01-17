import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

// Create a pending request
export const create = mutation({
  args: {
    desktopId: v.string(),
    requestType: v.union(
      v.literal("screenshot"),
      v.literal("start-recording"),
      v.literal("stop-recording")
    ),
    processed: v.boolean(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("pendingRequests", {
      desktopId: args.desktopId,
      requestType: args.requestType,
      processed: args.processed,
      createdAt: args.createdAt,
    });
  },
});

// Get pending requests by desktop ID
export const getByDesktop = query({
  args: { desktopId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pendingRequests")
      .withIndex("by_desktop_unprocessed", (q) =>
        q.eq("desktopId", args.desktopId).eq("processed", false)
      )
      .collect();
  },
});
