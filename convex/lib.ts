import { Doc, Id } from "./_generated/dataModel";
import { MutationCtx, QueryCtx } from "./_generated/server";

export const SESSION_DAYS = 30;

export function normalizePhone(raw: string) {
  let p = raw.replace(/[^\d+]/g, "");
  if (p.startsWith("+63")) p = "0" + p.slice(3);
  else if (p.startsWith("63") && p.length === 12) p = "0" + p.slice(2);
  return p;
}

export function isValidPhone(p: string) {
  return /^09\d{9}$/.test(p);
}

export type SafeUser = Omit<Doc<"users">, "passwordHash">;

export function stripUser(u: Doc<"users">): SafeUser {
  const { passwordHash: _ph, ...rest } = u;
  void _ph;
  return rest;
}

export async function getSessionUser(ctx: QueryCtx | MutationCtx, token: string) {
  if (!token) return null;
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q) => q.eq("token", token))
    .unique();
  if (!session || session.expiresAt < Date.now()) return null;
  const user = await ctx.db.get(session.userId);
  if (!user || !user.isActive) return null;
  return user;
}

export async function requireUser(ctx: QueryCtx | MutationCtx, token: string) {
  const user = await getSessionUser(ctx, token);
  if (!user) throw new Error("Not signed in. Please log in again.");
  return user;
}

export async function requireAdmin(ctx: QueryCtx | MutationCtx, token: string) {
  const user = await requireUser(ctx, token);
  if (user.role !== "admin") throw new Error("Admin access only.");
  return user;
}

export async function notify(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    title: string;
    body: string;
    type: Doc<"notifications">["type"];
    sms?: boolean;
    createdBy?: Id<"users">;
  }
) {
  return ctx.db.insert("notifications", {
    userId: args.userId,
    title: args.title,
    body: args.body,
    type: args.type,
    createdAt: Date.now(),
    smsStatus: args.sms ? "pending" : "none",
    createdBy: args.createdBy,
  });
}

export async function adminIds(ctx: QueryCtx | MutationCtx) {
  const admins = await ctx.db
    .query("users")
    .withIndex("by_role", (q) => q.eq("role", "admin"))
    .collect();
  return admins.map((a) => a._id);
}
