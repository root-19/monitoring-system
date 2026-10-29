import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";

/** All Convex function modules, resolved relative to the convex/ folder. */
export const modules = import.meta.glob("../../convex/**/*.*s");

export const ADMIN = { name: "PGI Admin", phone: "09304878996", password: "Admin@123" };
export const CLIENT = { name: "Juan Dela Cruz", phone: "09171234567", password: "secret1", address: "123 Rizal St, Manila", tankSize: "11kg" as const, lat: 14.6042, lng: 120.9822 };
export const CLIENT2 = { name: "Maria Santos", phone: "09181234567", password: "secret2", address: "Cebu City", tankSize: "2.7kg" as const };

export function fresh() {
  return convexTest(schema, modules);
}

/** A backend with one admin and two registered clients, returning their session tokens and ids. */
export async function seeded() {
  const t = fresh();
  const admin = await t.action(api.auth.setupAdmin, ADMIN);
  const c1 = await t.action(api.auth.register, CLIENT);
  const c2 = await t.action(api.auth.register, CLIENT2);
  const ids = await t.run(async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const byPhone = (p: string) => users.find((u) => u.phone === p)!._id;
    return { admin: byPhone(ADMIN.phone), c1: byPhone(CLIENT.phone), c2: byPhone(CLIENT2.phone) };
  });
  return { t, admin: admin.token, c1: c1.token, c2: c2.token, ids };
}

export const DAY = 24 * 60 * 60 * 1000;
