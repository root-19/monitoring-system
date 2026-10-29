import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireAdmin, stripUser } from "./lib";
import { rangeStart } from "./inventory";

export const summary = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    const clients = (
      await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "client")).collect()
    ).map(stripUser);
    const pending = await ctx.db.query("requests").withIndex("by_status", (q) => q.eq("status", "pending")).collect();
    const scheduled = await ctx.db.query("requests").withIndex("by_status", (q) => q.eq("status", "scheduled")).collect();
    const smsPending = await ctx.db.query("notifications").withIndex("by_sms", (q) => q.eq("smsStatus", "pending")).collect();
    const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentDeliveries = await ctx.db
      .query("deliveries")
      .withIndex("by_date", (q) => q.gte("deliveredAt", since))
      .collect();
    const allDeliveries = await ctx.db.query("deliveries").collect();
    const monthStart = rangeStart("month");
    const salesMonth = allDeliveries.filter((d) => d.deliveredAt >= monthStart).reduce((n, d) => n + (d.amount ?? 0), 0);
    const salesAll = allDeliveries.reduce((n, d) => n + (d.amount ?? 0), 0);
    const stockRows = await ctx.db.query("stock").collect();
    const lowStock = stockRows.filter((r) => r.onHand <= 5).map((r) => r.tankSize);
    const unreadMessages = (await ctx.db.query("messages").collect()).filter(
      (m) => m.senderRole === "client" && !m.readByAdmin
    ).length;
    return {
      clients,
      pendingRequests: pending.length,
      scheduledRequests: scheduled.length,
      smsPending: smsPending.length,
      deliveriesLast30: recentDeliveries.reduce((n, d) => n + d.quantity, 0),
      unreadMessages,
      salesMonth,
      salesAll,
      lowStock,
    };
  },
});
