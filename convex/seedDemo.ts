"use node";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { hashPassword } from "./auth";

/**
 * Demo data for presentations: 12 clients around Metro Manila with delivery history,
 * open requests, chats, queued SMS, prices and stock. Safe to re-run (skips existing phones).
 *
 *   npx convex run seedDemo:run
 *   npx convex run seedDemo:run '{"password":"client123"}'
 */
export const run = internalAction({
  args: { password: v.optional(v.string()) },
  handler: async (ctx, args): Promise<{ created: string[]; skipped: string[]; note: string }> => {
    const password = args.password ?? "client123";
    if (password.length < 6) throw new Error("Password must be at least 6 characters.");
    return ctx.runMutation(internal.seedInternal.insertDemo, { passwordHash: hashPassword(password) });
  },
});
