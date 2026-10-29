import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { notify, requireAdmin, requireUser } from "./lib";

export const listMine = query({
  args: { token: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { token, limit }) => {
    const me = await requireUser(ctx, token);
    return ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .order("desc")
      .take(limit ?? 100);
  },
});

export const unreadCount = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const me = await requireUser(ctx, token);
    const rows = await ctx.db.query("notifications").withIndex("by_user", (q) => q.eq("userId", me._id)).collect();
    return rows.filter((r) => !r.readAt).length;
  },
});

export const markAllRead = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const me = await requireUser(ctx, token);
    const rows = await ctx.db.query("notifications").withIndex("by_user", (q) => q.eq("userId", me._id)).collect();
    for (const r of rows) if (!r.readAt) await ctx.db.patch(r._id, { readAt: Date.now() });
  },
});

export const markRead = mutation({
  args: { token: v.string(), id: v.id("notifications") },
  handler: async (ctx, { token, id }) => {
    const me = await requireUser(ctx, token);
    const n = await ctx.db.get(id);
    if (n && n.userId === me._id && !n.readAt) await ctx.db.patch(id, { readAt: Date.now() });
  },
});

/** Admin sends a reminder / announcement to one or many clients. */
export const sendReminder = mutation({
  args: {
    token: v.string(),
    clientIds: v.array(v.id("users")),
    title: v.string(),
    body: v.string(),
    type: v.optional(v.union(v.literal("reminder"), v.literal("low_gas"), v.literal("system"))),
    sms: v.boolean(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.token);
    if (!args.title.trim() || !args.body.trim()) throw new Error("Title and message are required.");
    let count = 0;
    for (const clientId of args.clientIds) {
      await notify(ctx, {
        userId: clientId,
        title: args.title.trim(),
        body: args.body.trim(),
        type: args.type ?? "reminder",
        sms: args.sms,
        createdBy: admin._id,
      });
      count++;
    }
    return count;
  },
});

/** Admin: SMS outbox (notifications waiting to be texted, or already texted). */
export const smsOutbox = query({
  args: { token: v.string(), status: v.optional(v.union(v.literal("pending"), v.literal("sent"))) },
  handler: async (ctx, { token, status }) => {
    await requireAdmin(ctx, token);
    const rows = await ctx.db
      .query("notifications")
      .withIndex("by_sms", (q) => q.eq("smsStatus", status ?? "pending"))
      .order("desc")
      .take(200);
    const out = [];
    for (const r of rows) {
      const u = await ctx.db.get(r.userId);
      out.push({ ...r, clientName: u?.name ?? "Unknown", clientPhone: u?.phone ?? "" });
    }
    return out;
  },
});

export const markSmsSent = mutation({
  args: { token: v.string(), ids: v.array(v.id("notifications")) },
  handler: async (ctx, { token, ids }) => {
    await requireAdmin(ctx, token);
    for (const id of ids) await ctx.db.patch(id, { smsStatus: "sent", smsSentAt: Date.now() });
  },
});
