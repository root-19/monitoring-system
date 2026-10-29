import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { notify, requireAdmin, requireUser } from "./lib";
import { getPrice, moveStock } from "./inventory";

export const record = mutation({
  args: {
    token: v.string(),
    clientId: v.id("users"),
    deliveredAt: v.number(),
    tankSize: v.union(v.literal("11kg"), v.literal("2.7kg")),
    quantity: v.number(),
    amount: v.optional(v.number()),
    notes: v.optional(v.string()),
    requestId: v.optional(v.id("requests")),
    sendSms: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.token);
    const client = await ctx.db.get(args.clientId);
    if (!client || client.role !== "client") throw new Error("Client not found.");
    // Amount defaults to price x quantity when a price is set, so sales totals stay complete.
    const unit = await getPrice(ctx, args.tankSize);
    const amount = args.amount ?? (unit != null ? unit * args.quantity : undefined);
    const id = await ctx.db.insert("deliveries", {
      clientId: args.clientId,
      deliveredAt: args.deliveredAt,
      tankSize: args.tankSize,
      quantity: args.quantity,
      amount,
      notes: args.notes,
      recordedBy: admin._id,
    });
    // Inventory: tanks go out with the delivery
    await moveStock(ctx, { tankSize: args.tankSize, delta: -args.quantity, kind: "sale", deliveryId: id, note: `Delivery to ${client.name}`, by: admin._id });
    // The newest delivery becomes the reference date for the gas estimate
    if (!client.lastDeliveryAt || args.deliveredAt >= client.lastDeliveryAt) {
      await ctx.db.patch(args.clientId, { lastDeliveryAt: args.deliveredAt, tankSize: args.tankSize });
    }
    if (args.requestId) {
      await ctx.db.patch(args.requestId, { status: "delivered", updatedAt: Date.now() });
    }
    const dateText = new Date(args.deliveredAt).toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    await notify(ctx, {
      userId: args.clientId,
      title: "Gas delivered",
      body: `Fiesta Gas PGI delivered ${args.quantity} x ${args.tankSize} tank(s) on ${dateText}. Thank you!`,
      type: "delivery",
      sms: args.sendSms ?? false,
      createdBy: admin._id,
    });
    return id;
  },
});

export const listForClient = query({
  args: { token: v.string(), clientId: v.optional(v.id("users")) },
  handler: async (ctx, { token, clientId }) => {
    const me = await requireUser(ctx, token);
    const target = clientId ?? me._id;
    if (me.role !== "admin" && target !== me._id) throw new Error("Not allowed.");
    const rows = await ctx.db.query("deliveries").withIndex("by_client", (q) => q.eq("clientId", target)).collect();
    return rows.sort((a, b) => b.deliveredAt - a.deliveredAt);
  },
});

export const listRecent = query({
  args: { token: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, { token, limit }) => {
    await requireAdmin(ctx, token);
    const rows = await ctx.db.query("deliveries").withIndex("by_date").order("desc").take(limit ?? 50);
    const out = [];
    for (const r of rows) {
      const c = await ctx.db.get(r.clientId);
      out.push({ ...r, clientName: c?.name ?? "Unknown", clientPhone: c?.phone ?? "" });
    }
    return out;
  },
});

export const remove = mutation({
  args: { token: v.string(), deliveryId: v.id("deliveries") },
  handler: async (ctx, { token, deliveryId }) => {
    const admin = await requireAdmin(ctx, token);
    const d = await ctx.db.get(deliveryId);
    if (!d) return;
    // Put the tanks back and drop the matching sale movement
    const moves = await ctx.db.query("stockMovements").withIndex("by_delivery", (q) => q.eq("deliveryId", deliveryId)).collect();
    for (const m of moves) await ctx.db.delete(m._id);
    await moveStock(ctx, { tankSize: d.tankSize, delta: d.quantity, kind: "adjustment", note: "Delivery record deleted", by: admin._id });
    await ctx.db.delete(deliveryId);
  },
});
