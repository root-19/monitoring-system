import { query } from "./_generated/server";

/**
 * Public, anonymised pins for the landing-page coverage map.
 * Only approximate coordinates (rounded to ~100 m) and the tank size are exposed.
 * No names, phones, or addresses.
 */
export const coveragePins = query({
  args: {},
  handler: async (ctx) => {
    const clients = await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "client")).collect();
    return clients
      .filter((c) => c.isActive && c.lat != null && c.lng != null)
      .map((c) => ({
        lat: Math.round((c.lat as number) * 1000) / 1000,
        lng: Math.round((c.lng as number) * 1000) / 1000,
        tank: c.tankSize ?? "11kg",
      }));
  },
});
