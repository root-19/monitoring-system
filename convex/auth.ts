"use node";
import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { normalizePhone, isValidPhone, SESSION_DAYS } from "./lib";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const test = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return test.length === expected.length && timingSafeEqual(test, expected);
}

function newToken() {
  return randomBytes(32).toString("hex");
}

function sessionExpiry() {
  return Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
}

/** Client self-registration. */
export const register = action({
  args: {
    name: v.string(),
    phone: v.string(),
    password: v.string(),
    address: v.string(),
    landmark: v.optional(v.string()),
    tankSize: v.union(v.literal("11kg"), v.literal("2.7kg")),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ token: string; expiresAt: number }> => {
    const phone = normalizePhone(args.phone);
    if (!isValidPhone(phone)) throw new Error("Enter a valid mobile number (09XXXXXXXXX).");
    if (args.password.length < 6) throw new Error("Password must be at least 6 characters.");
    if (args.name.trim().length < 2) throw new Error("Please enter your full name.");
    const existing = await ctx.runQuery(internal.authInternal.userByPhone, { phone });
    if (existing) throw new Error("This mobile number is already registered. Please log in.");

    const userId = await ctx.runMutation(internal.authInternal.createUser, {
      name: args.name.trim(),
      phone,
      passwordHash: hashPassword(args.password),
      role: "client",
      address: args.address.trim(),
      landmark: args.landmark?.trim(),
      tankSize: args.tankSize,
      lat: args.lat,
      lng: args.lng,
    });
    const token = newToken();
    const expiresAt = sessionExpiry();
    await ctx.runMutation(internal.authInternal.createSession, { userId, token, expiresAt });
    return { token, expiresAt };
  },
});

/** First-time setup: create the very first admin account (only works if no admin exists). */
export const setupAdmin = action({
  args: { name: v.string(), phone: v.string(), password: v.string() },
  handler: async (ctx, args): Promise<{ token: string; expiresAt: number }> => {
    const hasAdmin = await ctx.runQuery(internal.authInternal.hasAdmin, {});
    if (hasAdmin) throw new Error("An admin account already exists.");
    const phone = normalizePhone(args.phone);
    if (!isValidPhone(phone)) throw new Error("Enter a valid mobile number (09XXXXXXXXX).");
    if (args.password.length < 6) throw new Error("Password must be at least 6 characters.");
    const userId = await ctx.runMutation(internal.authInternal.createUser, {
      name: args.name.trim(),
      phone,
      passwordHash: hashPassword(args.password),
      role: "admin",
    });
    const token = newToken();
    const expiresAt = sessionExpiry();
    await ctx.runMutation(internal.authInternal.createSession, { userId, token, expiresAt });
    return { token, expiresAt };
  },
});

export const signIn = action({
  args: { phone: v.string(), password: v.string() },
  handler: async (
    ctx,
    args
  ): Promise<{ token: string; expiresAt: number; role: "admin" | "client" }> => {
    const phone = normalizePhone(args.phone);
    const user = await ctx.runQuery(internal.authInternal.userByPhone, { phone });
    if (!user || !verifyPassword(args.password, user.passwordHash)) {
      throw new Error("Wrong mobile number or password.");
    }
    if (!user.isActive) throw new Error("This account is deactivated. Please contact PGI.");
    const token = newToken();
    const expiresAt = sessionExpiry();
    await ctx.runMutation(internal.authInternal.createSession, { userId: user._id, token, expiresAt });
    return { token, expiresAt, role: user.role };
  },
});

export const signOut = action({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.authInternal.deleteSession, { token: args.token });
  },
});

/** Admin creates a client account (sets the initial password). */
export const adminCreateClient = action({
  args: {
    token: v.string(),
    name: v.string(),
    phone: v.string(),
    password: v.string(),
    address: v.string(),
    landmark: v.optional(v.string()),
    tankSize: v.union(v.literal("11kg"), v.literal("2.7kg")),
    avgDaysPerTank: v.optional(v.number()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<string> => {
    const admin = await ctx.runQuery(internal.authInternal.sessionUser, { token: args.token });
    if (!admin || admin.role !== "admin") throw new Error("Admin access only.");
    const phone = normalizePhone(args.phone);
    if (!isValidPhone(phone)) throw new Error("Enter a valid mobile number (09XXXXXXXXX).");
    if (args.password.length < 6) throw new Error("Password must be at least 6 characters.");
    const existing = await ctx.runQuery(internal.authInternal.userByPhone, { phone });
    if (existing) throw new Error("This mobile number is already registered.");
    const id = await ctx.runMutation(internal.authInternal.createUser, {
      name: args.name.trim(),
      phone,
      passwordHash: hashPassword(args.password),
      role: "client",
      address: args.address.trim(),
      landmark: args.landmark?.trim(),
      tankSize: args.tankSize,
      avgDaysPerTank: args.avgDaysPerTank,
      lat: args.lat,
      lng: args.lng,
      notes: args.notes,
    });
    return id;
  },
});

export const changePassword = action({
  args: { token: v.string(), currentPassword: v.string(), newPassword: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(internal.authInternal.sessionUser, { token: args.token });
    if (!user) throw new Error("Not signed in.");
    if (!verifyPassword(args.currentPassword, user.passwordHash)) throw new Error("Current password is wrong.");
    if (args.newPassword.length < 6) throw new Error("New password must be at least 6 characters.");
    await ctx.runMutation(internal.authInternal.setPassword, {
      userId: user._id,
      passwordHash: hashPassword(args.newPassword),
    });
  },
});

/** Admin resets a client's password. */
export const adminResetPassword = action({
  args: { token: v.string(), userId: v.id("users"), newPassword: v.string() },
  handler: async (ctx, args) => {
    const admin = await ctx.runQuery(internal.authInternal.sessionUser, { token: args.token });
    if (!admin || admin.role !== "admin") throw new Error("Admin access only.");
    if (args.newPassword.length < 6) throw new Error("Password must be at least 6 characters.");
    await ctx.runMutation(internal.authInternal.setPassword, {
      userId: args.userId,
      passwordHash: hashPassword(args.newPassword),
    });
  },
});

/**
 * Seed / reset the PGI admin account. Internal only (not callable from the browser).
 * Run:  npx convex run auth:seedAdmin '{"phone":"09XXXXXXXXX","password":"..."}'
 * or set ADMIN_PHONE / ADMIN_PASSWORD / ADMIN_NAME in the deployment env and run with {}.
 */
export const seedAdmin = internalAction({
  args: { name: v.optional(v.string()), phone: v.optional(v.string()), password: v.optional(v.string()) },
  handler: async (ctx, args): Promise<{ phone: string; created: boolean }> => {
    const rawPhone = args.phone ?? process.env.ADMIN_PHONE;
    const password = args.password ?? process.env.ADMIN_PASSWORD;
    const name = args.name ?? process.env.ADMIN_NAME ?? "Fiesta Gas PGI";
    if (!rawPhone || !password) throw new Error("Provide phone and password (args or ADMIN_PHONE / ADMIN_PASSWORD env).");
    const phone = normalizePhone(rawPhone);
    if (!isValidPhone(phone)) throw new Error("Enter a valid mobile number (09XXXXXXXXX).");
    if (password.length < 6) throw new Error("Password must be at least 6 characters.");
    const res = await ctx.runMutation(internal.authInternal.upsertAdmin, { name, phone, passwordHash: hashPassword(password) });
    return { phone, created: res.created };
  },
});
