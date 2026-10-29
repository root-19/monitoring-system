import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { rangeStart } from "../../convex/inventory";
import { DAY, seeded } from "./helpers";

const stockOf = async (t: Awaited<ReturnType<typeof seeded>>["t"], token: string, tank: "11kg" | "2.7kg") =>
  (await t.query(api.inventory.overview, { token })).stock.find((s) => s.tankSize === tank)!;

describe("inventory: stock and prices", () => {
  it("starts empty, restocks, and flags low stock", async () => {
    const { t, admin } = await seeded();
    let s = await stockOf(t, admin, "11kg");
    expect(s.onHand).toBe(0);
    expect(s.low).toBe(true);
    expect(s.price).toBeNull();

    expect(await t.mutation(api.inventory.restock, { token: admin, tankSize: "11kg", quantity: 20, note: "depot" })).toBe(20);
    s = await stockOf(t, admin, "11kg");
    expect(s.onHand).toBe(20);
    expect(s.low).toBe(false);

    await expect(t.mutation(api.inventory.restock, { token: admin, tankSize: "11kg", quantity: 0 })).rejects.toThrow(/at least 1/);
    await expect(t.mutation(api.inventory.restock, { token: admin, tankSize: "11kg", quantity: -3 })).rejects.toThrow(/at least 1/);
  });

  it("physical count adjusts to the counted number and logs the delta", async () => {
    const { t, admin } = await seeded();
    await t.mutation(api.inventory.restock, { token: admin, tankSize: "2.7kg", quantity: 10 });
    expect(await t.mutation(api.inventory.adjust, { token: admin, tankSize: "2.7kg", onHand: 7, note: "count" })).toBe(7);
    expect(await t.mutation(api.inventory.adjust, { token: admin, tankSize: "2.7kg", onHand: 7 })).toBe(7); // no-op
    await expect(t.mutation(api.inventory.adjust, { token: admin, tankSize: "2.7kg", onHand: -1 })).rejects.toThrow(/negative/);
    const { movements } = await t.query(api.inventory.overview, { token: admin });
    expect(movements.map((m) => [m.kind, m.delta])).toEqual([
      ["adjustment", -3],
      ["restock", 10],
    ]);
  });

  it("prices are per tank size and validated", async () => {
    const { t, admin } = await seeded();
    await t.mutation(api.inventory.setPrice, { token: admin, tankSize: "11kg", price: 950 });
    await t.mutation(api.inventory.setPrice, { token: admin, tankSize: "2.7kg", price: 300 });
    await t.mutation(api.inventory.setPrice, { token: admin, tankSize: "11kg", price: 980 });
    expect(await t.query(api.inventory.prices, { token: admin })).toEqual({ "11kg": 980, "2.7kg": 300 });
    await expect(t.mutation(api.inventory.setPrice, { token: admin, tankSize: "11kg", price: -1 })).rejects.toThrow(/valid price/);
  });
});

describe("inventory: deliveries move stock and count as sales", () => {
  it("a delivery deducts stock, fills the amount from the price list, and deleting it reverses both", async () => {
    const { t, admin, ids } = await seeded();
    await t.mutation(api.inventory.setPrice, { token: admin, tankSize: "11kg", price: 950 });
    await t.mutation(api.inventory.restock, { token: admin, tankSize: "11kg", quantity: 10 });

    const id = await t.mutation(api.deliveries.record, { token: admin, clientId: ids.c1, deliveredAt: Date.now(), tankSize: "11kg", quantity: 2 });
    const d = await t.run((ctx) => ctx.db.get(id));
    expect(d?.amount).toBe(1900);
    expect((await stockOf(t, admin, "11kg")).onHand).toBe(8);

    let ov = await t.query(api.inventory.overview, { token: admin });
    expect(ov.sales.today).toMatchObject({ revenue: 1900, tanks: 2, deliveries: 1 });
    expect(ov.sales.all.byTank["11kg"]).toEqual({ revenue: 1900, tanks: 2 });
    expect(ov.movements[0]).toMatchObject({ kind: "sale", delta: -2, deliveryId: id });

    await t.mutation(api.deliveries.remove, { token: admin, deliveryId: id });
    expect((await stockOf(t, admin, "11kg")).onHand).toBe(10);
    ov = await t.query(api.inventory.overview, { token: admin });
    expect(ov.sales.all.revenue).toBe(0);
    expect(ov.movements.some((m) => m.deliveryId === id)).toBe(false);
    expect(ov.movements[0]).toMatchObject({ kind: "adjustment", delta: 2 });
  });

  it("an explicit amount wins over the price list; missing price leaves amount empty and is reported", async () => {
    const { t, admin, ids } = await seeded();
    await t.mutation(api.inventory.setPrice, { token: admin, tankSize: "11kg", price: 950 });
    const a = await t.mutation(api.deliveries.record, { token: admin, clientId: ids.c1, deliveredAt: Date.now(), tankSize: "11kg", quantity: 1, amount: 900 });
    const b = await t.mutation(api.deliveries.record, { token: admin, clientId: ids.c2, deliveredAt: Date.now(), tankSize: "2.7kg", quantity: 1 });
    const [da, db] = await t.run(async (ctx) => [await ctx.db.get(a), await ctx.db.get(b)]);
    expect(da?.amount).toBe(900);
    expect(db?.amount).toBeUndefined();
    const ov = await t.query(api.inventory.overview, { token: admin });
    expect(ov.unpriced).toBe(1);
    expect(ov.sales.all).toMatchObject({ revenue: 900, tanks: 2, deliveries: 2 });
    // stock can go negative when deliveries outpace recorded restocks, and shows as out of stock
    expect((await stockOf(t, admin, "2.7kg")).onHand).toBe(-1);
  });

  it("sales ranges only include deliveries after the range start, newest first", async () => {
    const { t, admin, ids } = await seeded();
    const now = Date.now();
    const rec = (ago: number, qty: number, amount: number) =>
      t.mutation(api.deliveries.record, { token: admin, clientId: ids.c1, deliveredAt: now - ago, tankSize: "11kg", quantity: qty, amount });
    await rec(0, 1, 100);
    await rec(3 * DAY, 1, 200);
    await rec(40 * DAY, 1, 400);
    await rec(400 * DAY, 1, 800);

    const ov = await t.query(api.inventory.overview, { token: admin });
    expect(ov.sales.week.revenue).toBe(300);
    expect(ov.sales.all.revenue).toBe(1500);
    expect(ov.sales.year.revenue).toBeLessThanOrEqual(700);
    expect(ov.daily).toHaveLength(30);
    expect(ov.daily.reduce((n, d) => n + d.revenue, 0)).toBe(300);

    const week = await t.query(api.inventory.salesList, { token: admin, range: "week" });
    expect(week.map((d) => d.amount)).toEqual([100, 200]);
    expect(week[0].clientName).toBe("Juan Dela Cruz");
    expect(await t.query(api.inventory.salesList, { token: admin, range: "all" })).toHaveLength(4);
  });

  it("dashboard summary exposes month/all-time sales and low stock sizes", async () => {
    const { t, admin, ids } = await seeded();
    await t.mutation(api.inventory.restock, { token: admin, tankSize: "11kg", quantity: 6 });
    await t.mutation(api.deliveries.record, { token: admin, clientId: ids.c1, deliveredAt: Date.now(), tankSize: "11kg", quantity: 1, amount: 950 });
    const s = await t.query(api.dashboard.summary, { token: admin });
    expect(s.salesMonth).toBe(950);
    expect(s.salesAll).toBe(950);
    expect(s.lowStock).toEqual(["11kg"]); // 6 - 1 = 5 -> low
    expect(s.deliveriesLast30).toBe(1);
  });
});

describe("inventory: Philippine-time range boundaries", () => {
  it("today starts at midnight Manila time, week covers 7 days, month and year start on the 1st", () => {
    // 2026-03-15 10:00 UTC = 18:00 Manila
    const now = Date.UTC(2026, 2, 15, 10, 0, 0);
    expect(new Date(rangeStart("today", now)).toISOString()).toBe("2026-03-14T16:00:00.000Z"); // Mar 15 00:00 +08
    expect(new Date(rangeStart("week", now)).toISOString()).toBe("2026-03-08T16:00:00.000Z");
    expect(new Date(rangeStart("month", now)).toISOString()).toBe("2026-02-28T16:00:00.000Z"); // Mar 1 00:00 +08
    expect(new Date(rangeStart("year", now)).toISOString()).toBe("2025-12-31T16:00:00.000Z");
    expect(rangeStart("all", now)).toBe(0);
  });

  it("just before midnight UTC is already the next day in Manila", () => {
    const now = Date.UTC(2026, 0, 31, 20, 0, 0); // Jan 31 20:00 UTC = Feb 1 04:00 Manila
    expect(new Date(rangeStart("today", now)).toISOString()).toBe("2026-01-31T16:00:00.000Z");
    expect(new Date(rangeStart("month", now)).toISOString()).toBe("2026-01-31T16:00:00.000Z");
  });
});
