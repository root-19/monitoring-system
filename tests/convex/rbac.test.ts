import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { seeded } from "./helpers";

describe("RBAC: admin-only functions reject clients and anonymous callers", () => {
  it("queries", async () => {
    const { t, c1, ids } = await seeded();
    const adminOnly = [
      () => t.query(api.users.listClients, { token: c1 }),
      () => t.query(api.users.listAdmins, { token: c1 }),
      () => t.query(api.dashboard.summary, { token: c1 }),
      () => t.query(api.deliveries.listRecent, { token: c1 }),
      () => t.query(api.requests.listAll, { token: c1 }),
      () => t.query(api.messages.inbox, { token: c1 }),
      () => t.query(api.notifications.smsOutbox, { token: c1 }),
      () => t.query(api.inventory.overview, { token: c1 }),
      () => t.query(api.inventory.prices, { token: c1 }),
      () => t.query(api.inventory.salesList, { token: c1, range: "all" }),
      () => t.query(api.deliveries.listForClient, { token: c1, clientId: ids.c2 }),
      () => t.query(api.users.getClient, { token: c1, clientId: ids.c2 }),
    ];
    for (const call of adminOnly) await expect(call()).rejects.toThrow(/Admin access only|Not allowed/);
    await expect(t.query(api.users.listClients, { token: "" })).rejects.toThrow(/Not signed in/);
    await expect(t.query(api.users.listClients, { token: "bogus" })).rejects.toThrow(/Not signed in/);
  });

  it("mutations", async () => {
    const { t, c1, ids } = await seeded();
    const now = Date.now();
    const adminOnly = [
      () => t.mutation(api.deliveries.record, { token: c1, clientId: ids.c2, deliveredAt: now, tankSize: "11kg", quantity: 1 }),
      () => t.mutation(api.notifications.sendReminder, { token: c1, clientIds: [ids.c2], title: "x", body: "y", sms: true }),
      () => t.mutation(api.notifications.markSmsSent, { token: c1, ids: [] }),
      () => t.mutation(api.inventory.restock, { token: c1, tankSize: "11kg", quantity: 5 }),
      () => t.mutation(api.inventory.adjust, { token: c1, tankSize: "11kg", onHand: 5 }),
      () => t.mutation(api.inventory.setPrice, { token: c1, tankSize: "11kg", price: 900 }),
    ];
    for (const call of adminOnly) await expect(call()).rejects.toThrow(/Admin access only/);
  });
});

describe("RBAC: clients only touch their own data", () => {
  it("profile updates: a client cannot edit someone else or privileged fields", async () => {
    const { t, c1, ids } = await seeded();
    await expect(t.mutation(api.users.updateProfile, { token: c1, userId: ids.c2, name: "Hacked" })).rejects.toThrow(/Not allowed/);

    await t.mutation(api.users.updateProfile, { token: c1, name: "Juan D. Cruz", notes: "vip", isActive: false, avgDaysPerTank: 1, lastDeliveryAt: 123, landmark: "blue gate" });
    const me = await t.query(api.users.me, { token: c1 });
    expect(me?.name).toBe("Juan D. Cruz");
    expect(me?.landmark).toBe("blue gate");
    expect(me?.notes).toBeUndefined();
    expect(me?.isActive).toBe(true);
    expect(me?.avgDaysPerTank).toBe(30);
    expect(me?.lastDeliveryAt).toBeUndefined();
  });

  it("profile updates: admins manage clients, never other admins, and cannot deactivate themselves", async () => {
    const { t, admin, ids } = await seeded();
    await t.mutation(api.users.updateProfile, { token: admin, userId: ids.c1, notes: "pays on time", avgDaysPerTank: 21 });
    const c = await t.query(api.users.getClient, { token: admin, clientId: ids.c1 });
    expect(c?.notes).toBe("pays on time");
    expect(c?.avgDaysPerTank).toBe(21);

    await expect(t.mutation(api.users.updateProfile, { token: admin, isActive: false })).rejects.toThrow(/cannot deactivate your own/);

    const other = await t.run((ctx) =>
      ctx.db.insert("users", { name: "Other Admin", phone: "09000000001", passwordHash: "x:y", role: "admin", isActive: true, createdAt: Date.now() })
    );
    await expect(t.mutation(api.users.updateProfile, { token: admin, userId: other, name: "pwned" })).rejects.toThrow(/Not allowed/);
  });

  it("requests: only clients create; only the owner cancels", async () => {
    const { t, admin, c1, c2 } = await seeded();
    await expect(t.mutation(api.requests.create, { token: admin, type: "refill", message: "x" })).rejects.toThrow(/Only clients/);
    const id = await t.mutation(api.requests.create, { token: c1, type: "refill", message: "need gas", tankSize: "11kg", quantity: 1 });
    await expect(t.mutation(api.requests.cancelMine, { token: c2, requestId: id })).rejects.toThrow(/Not allowed/);
    await t.mutation(api.requests.cancelMine, { token: c1, requestId: id });
    const mine = await t.query(api.requests.listMine, { token: c1 });
    expect(mine[0].status).toBe("cancelled");
  });

  it("messages: a client only sees their own thread; an admin must target a client", async () => {
    const { t, admin, c1, c2, ids } = await seeded();
    await t.mutation(api.messages.send, { token: c1, body: "hello from juan" });
    await t.mutation(api.messages.send, { token: c2, body: "hello from maria" });
    // a client passing another clientId is ignored, they still get their own thread
    const seenByC2 = await t.query(api.messages.thread, { token: c2, clientId: ids.c1 });
    expect(seenByC2.map((m) => m.body)).toEqual(["hello from maria"]);

    await expect(t.mutation(api.messages.send, { token: admin, body: "no target" })).rejects.toThrow(/Choose a client/);
    await expect(t.mutation(api.messages.send, { token: admin, body: "to admin?", clientId: ids.admin })).rejects.toThrow(/Client not found/);
    await t.mutation(api.messages.send, { token: admin, body: "on the way po", clientId: ids.c1 });
    const juan = await t.query(api.messages.thread, { token: c1 });
    expect(juan.map((m) => m.body)).toEqual(["hello from juan", "on the way po"]);
  });

  it("notifications: markRead ignores notifications that belong to someone else", async () => {
    const { t, admin, c1, c2, ids } = await seeded();
    await t.mutation(api.notifications.sendReminder, { token: admin, clientIds: [ids.c2], title: "Low gas", body: "Refill soon", sms: false });
    const target = (await t.query(api.notifications.listMine, { token: c2 })).find((n) => n.title === "Low gas")!;
    await t.mutation(api.notifications.markRead, { token: c1, id: target._id });
    expect(await t.query(api.notifications.unreadCount, { token: c2 })).toBeGreaterThan(0);
    await t.mutation(api.notifications.markRead, { token: c2, id: target._id });
    const after = (await t.query(api.notifications.listMine, { token: c2 })).find((n) => n._id === target._id)!;
    expect(after.readAt).toBeTypeOf("number");
  });

  it("deliveries: clients read only their own history", async () => {
    const { t, admin, c1, c2, ids } = await seeded();
    await t.mutation(api.deliveries.record, { token: admin, clientId: ids.c1, deliveredAt: Date.now(), tankSize: "11kg", quantity: 1 });
    expect(await t.query(api.deliveries.listForClient, { token: c1 })).toHaveLength(1);
    expect(await t.query(api.deliveries.listForClient, { token: c2 })).toHaveLength(0);
    await expect(t.query(api.deliveries.listForClient, { token: c2, clientId: ids.c1 })).rejects.toThrow(/Not allowed/);
    expect(await t.query(api.deliveries.listForClient, { token: admin, clientId: ids.c1 })).toHaveLength(1);
  });
});
