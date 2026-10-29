import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { adminIds, notify, requireAdmin, requireUser } from "./lib";

const status = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("scheduled"),
  v.literal("delivered"),
  v.literal("cancelled")
);

export const create = mutation({
  args: {
    token: v.string(),
    type: v.union(v.literal("refill"), v.literal("inquiry"), v.literal("other")),
    message: v.string(),
    tankSize: v.optional(v.union(v.literal("11kg"), v.literal("2.7kg"))),
    quantity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.token);
    if (me.role !== "client") throw new Error("Only clients can send requests.");
    const now = Date.now();
    const id = await ctx.db.insert("requests", {
      clientId: me._id,
      type: args.type,
      message: args.message.trim(),
      tankSize: args.tankSize,
      quantity: args.quantity,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
    const label = args.type === "refill" ? "Refill request" : args.type === "inquiry" ? "Inquiry" : "Request";
    const detail =
      args.type === "refill"
        ? `${args.quantity ?? 1} x ${args.tankSize ?? me.tankSize ?? "tank"} - ${args.message}`
        : args.message;
    for (const adminId of await adminIds(ctx)) {
      await notify(ctx, {
        userId: adminId,
        title: `New ${label.toLowerCase()} from ${me.name}`,
        body: detail,
        type: "request",
      });
    }
    await notify(ctx, {
      userId: me._id,
      title: `${label} received`,
      body: "Fiesta Gas PGI received your request. We will update you here and by SMS.",
      type: "request",
    });
    return id;
  },
});

export const listMine = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const me = await requireUser(ctx, token);
    const rows = await ctx.db.query("requests").withIndex("by_client", (q) => q.eq("clientId", me._id)).collect();
    return rows.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const listAll = query({
  args: { token: v.string(), status: v.optional(status) },
  handler: async (ctx, { token, status: st }) => {
    await requireAdmin(ctx, token);
    const rows = st
      ? await ctx.db.query("requests").withIndex("by_status", (q) => q.eq("status", st)).collect()
      : await ctx.db.query("requests").collect();
    const out = [];
    for (const r of rows) {
      const c = await ctx.db.get(r.clientId);
      out.push({
        ...r,
        clientName: c?.name ?? "Unknown",
        clientPhone: c?.phone ?? "",
        clientAddress: c?.address ?? "",
        clientTank: c?.tankSize,
      });
    }
    return out.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const updateStatus = mutation({
  args: {
    token: v.string(),
    requestId: v.id("requests"),
    status,
    scheduledAt: v.optional(v.number()),
    adminNote: v.optional(v.string()),
    sendSms: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.token);
    const req = await ctx.db.get(args.requestId);
    if (!req) throw new Error("Request not found.");
    await ctx.db.patch(args.requestId, {
      status: args.status,
      scheduledAt: args.scheduledAt ?? req.scheduledAt,
      adminNote: args.adminNote ?? req.adminNote,
      updatedAt: Date.now(),
    });
    const when = args.scheduledAt
      ? new Date(args.scheduledAt).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
      : null;
    const texts: Record<string, string> = {
      accepted: "Your request has been accepted by Fiesta Gas PGI.",
      scheduled: when ? `Your delivery is scheduled on ${when}.` : "Your delivery has been scheduled.",
      delivered: "Your request is marked as delivered. Thank you!",
      cancelled: "Your request was cancelled. Contact us at 0998 586 1976 for help.",
      pending: "Your request is pending.",
    };
    await notify(ctx, {
      userId: req.clientId,
      title: `Request ${args.status}`,
      body: `${texts[args.status]}${args.adminNote ? " Note: " + args.adminNote : ""}`,
      type: "request",
      sms: args.sendSms ?? false,
      createdBy: admin._id,
    });
  },
});

export const cancelMine = mutation({
  args: { token: v.string(), requestId: v.id("requests") },
  handler: async (ctx, { token, requestId }) => {
    const me = await requireUser(ctx, token);
    const req = await ctx.db.get(requestId);
    if (!req || req.clientId !== me._id) throw new Error("Not allowed.");
    if (req.status === "delivered") throw new Error("Already delivered.");
    await ctx.db.patch(requestId, { status: "cancelled", updatedAt: Date.now() });
  },
});
