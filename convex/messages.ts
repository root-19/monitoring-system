import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { adminIds, notify, requireAdmin, requireUser } from "./lib";

export const send = mutation({
  args: { token: v.string(), body: v.string(), clientId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const me = await requireUser(ctx, args.token);
    const body = args.body.trim();
    if (!body) throw new Error("Message is empty.");
    const clientId = me.role === "admin" ? args.clientId : me._id;
    if (!clientId) throw new Error("Choose a client.");
    if (me.role === "admin") {
      const target = await ctx.db.get(clientId);
      if (!target || target.role !== "client") throw new Error("Client not found.");
    }
    await ctx.db.insert("messages", {
      clientId,
      senderId: me._id,
      senderRole: me.role,
      body,
      createdAt: Date.now(),
      readByAdmin: me.role === "admin",
      readByClient: me.role === "client",
    });
    if (me.role === "client") {
      for (const a of await adminIds(ctx)) {
        await notify(ctx, { userId: a, title: `Message from ${me.name}`, body, type: "message" });
      }
    } else {
      await notify(ctx, {
        userId: clientId,
        title: "New message from Fiesta Gas PGI",
        body,
        type: "message",
        createdBy: me._id,
      });
    }
  },
});

export const thread = query({
  args: { token: v.string(), clientId: v.optional(v.id("users")) },
  handler: async (ctx, { token, clientId }) => {
    const me = await requireUser(ctx, token);
    const target = me.role === "admin" ? clientId : me._id;
    if (!target) return [];
    const rows = await ctx.db.query("messages").withIndex("by_client", (q) => q.eq("clientId", target)).collect();
    return rows.sort((a, b) => a.createdAt - b.createdAt);
  },
});

export const markRead = mutation({
  args: { token: v.string(), clientId: v.optional(v.id("users")) },
  handler: async (ctx, { token, clientId }) => {
    const me = await requireUser(ctx, token);
    const target = me.role === "admin" ? clientId : me._id;
    if (!target) return;
    const rows = await ctx.db.query("messages").withIndex("by_client", (q) => q.eq("clientId", target)).collect();
    for (const m of rows) {
      if (me.role === "admin" && !m.readByAdmin) await ctx.db.patch(m._id, { readByAdmin: true });
      if (me.role === "client" && !m.readByClient) await ctx.db.patch(m._id, { readByClient: true });
    }
  },
});

/** Admin inbox: one row per client with latest message + unread count. */
export const inbox = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    const all = await ctx.db.query("messages").collect();
    const byClient = new Map<Id<"users">, { last: Doc<"messages">; unread: number }>();
    for (const m of all) {
      const cur = byClient.get(m.clientId);
      const unread = (cur?.unread ?? 0) + (!m.readByAdmin && m.senderRole === "client" ? 1 : 0);
      byClient.set(m.clientId, { last: !cur || m.createdAt > cur.last.createdAt ? m : cur.last, unread });
    }
    const out = [];
    for (const [clientId, info] of byClient) {
      const c = await ctx.db.get(clientId);
      out.push({
        clientId,
        clientName: c?.name ?? "Unknown",
        clientPhone: c?.phone ?? "",
        last: info.last,
        unread: info.unread,
      });
    }
    return out.sort((a, b) => b.last.createdAt - a.last.createdAt);
  },
});

export const unreadForClient = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const me = await requireUser(ctx, token);
    if (me.role !== "client") return 0;
    const rows = await ctx.db.query("messages").withIndex("by_client", (q) => q.eq("clientId", me._id)).collect();
    return rows.filter((m) => m.senderRole === "admin" && !m.readByClient).length;
  },
});
