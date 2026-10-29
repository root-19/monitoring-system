import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireAdmin } from "./lib";

export const TANKS = ["11kg", "2.7kg"] as const;
export type Tank = (typeof TANKS)[number];
const tankV = v.union(v.literal("11kg"), v.literal("2.7kg"));
export const LOW_STOCK_AT = 5;

/** Philippine time is UTC+8 year-round; Convex runs in UTC. */
const PH_OFFSET = 8 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
function startOfDayPH(now: number) {
  return Math.floor((now + PH_OFFSET) / DAY) * DAY - PH_OFFSET;
}
function startOfMonthPH(now: number) {
  const d = new Date(now + PH_OFFSET);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) - PH_OFFSET;
}
function startOfYearPH(now: number) {
  const d = new Date(now + PH_OFFSET);
  return Date.UTC(d.getUTCFullYear(), 0, 1) - PH_OFFSET;
}
export function rangeStart(range: "today" | "week" | "month" | "year" | "all", now = Date.now()) {
  switch (range) {
    case "today":
      return startOfDayPH(now);
    case "week":
      return startOfDayPH(now) - 6 * DAY;
    case "month":
      return startOfMonthPH(now);
    case "year":
      return startOfYearPH(now);
    default:
      return 0;
  }
}

// ---------- stock helpers (shared with deliveries.ts) ----------

export async function getStockRow(ctx: QueryCtx | MutationCtx, tankSize: Tank) {
  return ctx.db.query("stock").withIndex("by_tank", (q) => q.eq("tankSize", tankSize)).unique();
}

export async function getPrice(ctx: QueryCtx | MutationCtx, tankSize: Tank) {
  const row = await ctx.db.query("prices").withIndex("by_tank", (q) => q.eq("tankSize", tankSize)).unique();
  return row?.price ?? null;
}

/** Apply a signed change to on-hand stock and log it. Positive = stock in, negative = stock out. */
export async function moveStock(
  ctx: MutationCtx,
  args: {
    tankSize: Tank;
    delta: number;
    kind: Doc<"stockMovements">["kind"];
    note?: string;
    deliveryId?: Id<"deliveries">;
    by: Id<"users">;
  }
) {
  const row = await getStockRow(ctx, args.tankSize);
  const onHand = (row?.onHand ?? 0) + args.delta;
  if (row) await ctx.db.patch(row._id, { onHand, updatedAt: Date.now() });
  else await ctx.db.insert("stock", { tankSize: args.tankSize, onHand, updatedAt: Date.now() });
  await ctx.db.insert("stockMovements", {
    tankSize: args.tankSize,
    delta: args.delta,
    kind: args.kind,
    note: args.note,
    deliveryId: args.deliveryId,
    createdBy: args.by,
    createdAt: Date.now(),
  });
  return onHand;
}

function sumSales(rows: Doc<"deliveries">[]) {
  const out = {
    revenue: 0,
    tanks: 0,
    deliveries: rows.length,
    byTank: { "11kg": { revenue: 0, tanks: 0 }, "2.7kg": { revenue: 0, tanks: 0 } } as Record<Tank, { revenue: number; tanks: number }>,
  };
  for (const r of rows) {
    const amt = r.amount ?? 0;
    out.revenue += amt;
    out.tanks += r.quantity;
    out.byTank[r.tankSize].revenue += amt;
    out.byTank[r.tankSize].tanks += r.quantity;
  }
  return out;
}

// ---------- queries ----------

/** Prices only (used by the delivery form to pre-fill the amount). */
export const prices = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    const rows = await ctx.db.query("prices").collect();
    const map: Partial<Record<Tank, number>> = {};
    for (const r of rows) map[r.tankSize] = r.price;
    return map;
  },
});

/** Everything the Inventory & Sales page needs in one subscription. */
export const overview = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    await requireAdmin(ctx, token);
    const now = Date.now();
    const stockRows = await ctx.db.query("stock").collect();
    const priceRows = await ctx.db.query("prices").collect();
    const stock = TANKS.map((t) => ({
      tankSize: t,
      onHand: stockRows.find((s) => s.tankSize === t)?.onHand ?? 0,
      price: priceRows.find((p) => p.tankSize === t)?.price ?? null,
      low: (stockRows.find((s) => s.tankSize === t)?.onHand ?? 0) <= LOW_STOCK_AT,
    }));

    const all = await ctx.db.query("deliveries").withIndex("by_date").order("desc").collect();
    const since = (r: "today" | "week" | "month" | "year") => all.filter((d) => d.deliveredAt >= rangeStart(r, now));
    const sales = {
      today: sumSales(since("today")),
      week: sumSales(since("week")),
      month: sumSales(since("month")),
      year: sumSales(since("year")),
      all: sumSales(all),
    };

    // last 30 days, per day, for the mini chart
    const dayStart = startOfDayPH(now);
    const daily: { day: number; revenue: number; tanks: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const s = dayStart - i * DAY;
      const rows = all.filter((d) => d.deliveredAt >= s && d.deliveredAt < s + DAY);
      daily.push({ day: s, revenue: rows.reduce((n, d) => n + (d.amount ?? 0), 0), tanks: rows.reduce((n, d) => n + d.quantity, 0) });
    }

    const movements = await ctx.db.query("stockMovements").withIndex("by_date").order("desc").take(25);
    const unpriced = all.filter((d) => d.amount == null).length;
    return { stock, sales, daily, movements, unpriced, lowStockAt: LOW_STOCK_AT };
  },
});

/** Deliveries in a range with client names, for the sales table. */
export const salesList = query({
  args: { token: v.string(), range: v.union(v.literal("today"), v.literal("week"), v.literal("month"), v.literal("year"), v.literal("all")) },
  handler: async (ctx, { token, range }) => {
    await requireAdmin(ctx, token);
    const start = rangeStart(range);
    const rows = await ctx.db
      .query("deliveries")
      .withIndex("by_date", (q) => q.gte("deliveredAt", start))
      .order("desc")
      .take(300);
    const names = new Map<string, string>();
    const out = [];
    for (const r of rows) {
      if (!names.has(r.clientId)) names.set(r.clientId, (await ctx.db.get(r.clientId))?.name ?? "Unknown");
      out.push({ ...r, clientName: names.get(r.clientId)! });
    }
    return out;
  },
});

// ---------- mutations ----------

export const restock = mutation({
  args: { token: v.string(), tankSize: tankV, quantity: v.number(), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.token);
    const qty = Math.floor(args.quantity);
    if (!(qty > 0)) throw new Error("Quantity must be at least 1.");
    return moveStock(ctx, { tankSize: args.tankSize, delta: qty, kind: "restock", note: args.note?.trim() || undefined, by: admin._id });
  },
});

/** Physical count correction: sets on-hand to the counted number. */
export const adjust = mutation({
  args: { token: v.string(), tankSize: tankV, onHand: v.number(), note: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.token);
    const target = Math.floor(args.onHand);
    if (target < 0) throw new Error("Stock cannot be negative.");
    const row = await getStockRow(ctx, args.tankSize);
    const delta = target - (row?.onHand ?? 0);
    if (delta === 0) return target;
    return moveStock(ctx, { tankSize: args.tankSize, delta, kind: "adjustment", note: args.note?.trim() || "Physical count", by: admin._id });
  },
});

export const setPrice = mutation({
  args: { token: v.string(), tankSize: tankV, price: v.number() },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx, args.token);
    if (!(args.price >= 0)) throw new Error("Enter a valid price.");
    const row = await ctx.db.query("prices").withIndex("by_tank", (q) => q.eq("tankSize", args.tankSize)).unique();
    if (row) await ctx.db.patch(row._id, { price: args.price, updatedAt: Date.now(), updatedBy: admin._id });
    else await ctx.db.insert("prices", { tankSize: args.tankSize, price: args.price, updatedAt: Date.now(), updatedBy: admin._id });
  },
});
