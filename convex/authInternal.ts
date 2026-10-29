import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { getSessionUser } from "./lib";

export const userByPhone = internalQuery({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) =>
    ctx.db.query("users").withIndex("by_phone", (q) => q.eq("phone", phone)).unique(),
});

export const hasAdmin = internalQuery({
  args: {},
  handler: async (ctx) => {
    const a = await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "admin")).first();
    return !!a;
  },
});

export const sessionUser = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, { token }) => getSessionUser(ctx, token),
});

export const createUser = internalMutation({
  args: {
    name: v.string(),
    phone: v.string(),
    passwordHash: v.string(),
    role: v.union(v.literal("admin"), v.literal("client")),
    address: v.optional(v.string()),
    landmark: v.optional(v.string()),
    tankSize: v.optional(v.union(v.literal("11kg"), v.literal("2.7kg"))),
    avgDaysPerTank: v.optional(v.number()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("users", {
      ...args,
      avgDaysPerTank: args.avgDaysPerTank ?? (args.tankSize === "2.7kg" ? 14 : 30),
      isActive: true,
      createdAt: Date.now(),
    });
    if (args.role === "client") {
      await ctx.db.insert("notifications", {
        userId: id,
        title: "Welcome to Fiesta Gas PGI",
        body: "Your account is ready. You can request a refill, send us a message, and see your gas status here.",
        type: "system",
        createdAt: Date.now(),
        smsStatus: "none",
      });
    }
    return id;
  },
});

export const createSession = internalMutation({
  args: { userId: v.id("users"), token: v.string(), expiresAt: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.insert("sessions", args);
  },
});

export const deleteSession = internalMutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const s = await ctx.db.query("sessions").withIndex("by_token", (q) => q.eq("token", token)).unique();
    if (s) await ctx.db.delete(s._id);
  },
});

export const setPassword = internalMutation({
  args: { userId: v.id("users"), passwordHash: v.string() },
  handler: async (ctx, { userId, passwordHash }) => {
    await ctx.db.patch(userId, { passwordHash });
  },
});

/** Idempotent admin upsert used by the seed script. Promotes an existing user with this phone to admin. */
export const upsertAdmin = internalMutation({
  args: { name: v.string(), phone: v.string(), passwordHash: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("users").withIndex("by_phone", (q) => q.eq("phone", args.phone)).unique();
    if (existing) {
      await ctx.db.patch(existing._id, { role: "admin", passwordHash: args.passwordHash, isActive: true, name: existing.name || args.name });
      return { id: existing._id, created: false };
    }
    const id = await ctx.db.insert("users", {
      name: args.name,
      phone: args.phone,
      passwordHash: args.passwordHash,
      role: "admin",
      isActive: true,
      createdAt: Date.now(),
    });
    return { id, created: true };
  },
});
