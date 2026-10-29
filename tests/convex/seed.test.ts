import { describe, expect, it } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import { estimateGas } from "../../lib/gas";
import { ADMIN, fresh } from "./helpers";

describe("demo seed", () => {
  it("needs an admin first", async () => {
    const t = fresh();
    await expect(t.action(internal.seedDemo.run, {})).rejects.toThrow(/Run auth:seedAdmin first/);
  });

  it("creates at least 10 clients with history covering every gas status, and is safe to re-run", async () => {
    const t = fresh();
    const admin = (await t.action(api.auth.setupAdmin, ADMIN)).token;
    const res = await t.action(internal.seedDemo.run, {});
    expect(res.created.length).toBeGreaterThanOrEqual(10);
    expect(res.skipped).toEqual([]);

    const clients = await t.query(api.users.listClients, { token: admin });
    expect(clients.length).toBe(res.created.length);
    expect(clients.every((c) => c.lat != null && c.lng != null && c.address)).toBe(true);
    const statuses = new Set(clients.map((c) => estimateGas(c.lastDeliveryAt, c.avgDaysPerTank, c.tankSize).status));
    expect([...statuses].sort()).toEqual(["critical", "empty", "low", "ok", "unknown"]);

    // every demo client can log in with the shared demo password
    const login = await t.action(api.auth.signIn, { phone: "09171000001", password: "client123" });
    expect(login.role).toBe("client");

    const s = await t.query(api.dashboard.summary, { token: admin });
    expect(s.pendingRequests).toBe(3);
    expect(s.scheduledRequests).toBe(1);
    expect(s.smsPending).toBe(3);
    expect(s.unreadMessages).toBeGreaterThan(0);
    expect(s.salesAll).toBeGreaterThan(0);

    const inv = await t.query(api.inventory.overview, { token: admin });
    const deliveries = await t.query(api.deliveries.listRecent, { token: admin, limit: 500 });
    expect(deliveries.length).toBeGreaterThanOrEqual(40);
    expect(inv.unpriced).toBe(0);
    // stock = opening stock minus every seeded delivery
    const sold11 = deliveries.filter((d) => d.tankSize === "11kg").reduce((n, d) => n + d.quantity, 0);
    expect(inv.stock.find((x) => x.tankSize === "11kg")?.onHand).toBe(60 - sold11);
    expect(inv.stock.find((x) => x.tankSize === "11kg")?.price).toBe(950);

    const again = await t.action(internal.seedDemo.run, {});
    expect(again.created).toEqual([]);
    expect(again.skipped.length).toBe(res.created.length);
    expect((await t.query(api.users.listClients, { token: admin })).length).toBe(res.created.length);
    expect((await t.query(api.dashboard.summary, { token: admin })).pendingRequests).toBe(3);
  });
});
