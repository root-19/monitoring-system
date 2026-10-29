import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getSessionUser, requireAdmin, requireUser, stripUser } from "./lib";

/** Who am I (null if not signed in). */
export const me = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const u = await getSessionUser(ctx, token);
    return u ? stripUser(u) : null;
  },
});

export const hasAdmin = query({
  args: {},
  handler: async (ctx) => {
    const a = await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "admin")).first();
    return !!a;
  },
});

/** Admin: list all clients. */
export const listClients = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    const clients = await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "client")).collect();
    return clients.map(stripUser).sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const getClient = query({
  args: { token: v.string(), clientId: v.id("users") },
  handler: async (ctx, { token, clientId }) => {
    const me = await requireUser(ctx, token);
    if (me.role !== "admin" && me._id !== clientId) throw new Error("Not allowed.");
    const u = await ctx.db.get(clientId);
    return u ? stripUser(u) : null;
  },
});

/** Client updates own profile; admin can update any client. */
export const updateProfile = mutation({
  args: {
    token: v.string(),
    userId: v.optional(v.id("users")),
    name: v.optional(v.string()),
    address: v.optional(v.string()),
    landmark: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    tankSize: v.optional(v.union(v.literal("11kg"), v.literal("2.7kg"))),
    avgDaysPerTank: v.optional(v.number()),
    notes: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    lastDeliveryAt: v.optional(v.number()),
  },
  handler: async (ctx, { token, userId, ...patch }) => {
    const me = await requireUser(ctx, token);
    const target = userId ?? me._id;
    if (me.role !== "admin") {
      if (target !== me._id) throw new Error("Not allowed.");
      // clients cannot change these
      delete patch.notes;
      delete patch.isActive;
      delete patch.avgDaysPerTank;
      delete patch.lastDeliveryAt;
    } else if (target !== me._id) {
      // admins manage clients only; other admin accounts are off-limits
      const t = await ctx.db.get(target);
      if (!t || t.role !== "client") throw new Error("Not allowed.");
    } else if (patch.isActive === false) {
      throw new Error("You cannot deactivate your own account.");
    }
    const clean = Object.fromEntries(Object.entries(patch).filter(([, val]) => val !== undefined));
    await ctx.db.patch(target, clean);
  },
});

export const listAdmins = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    const admins = await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "admin")).collect();
    return admins.map(stripUser);
  },
});
