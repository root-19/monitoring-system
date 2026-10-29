import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import { CLIENT, DAY, seeded } from "./helpers";

describe("refill request lifecycle", () => {
  it("creating a request notifies every admin and the client", async () => {
    const { t, admin, c1, ids } = await seeded();
    const id = await t.mutation(api.requests.create, { token: c1, type: "refill", message: "Please deliver tomorrow", tankSize: "11kg", quantity: 2 });

    const adminNotes = await t.query(api.notifications.listMine, { token: admin });
    expect(adminNotes.some((n) => n.title === `New refill request from ${CLIENT.name}` && n.body.includes("2 x 11kg"))).toBe(true);
    const mine = await t.query(api.notifications.listMine, { token: c1 });
    expect(mine.some((n) => n.title === "Refill request received")).toBe(true);

    const all = await t.query(api.requests.listAll, { token: admin, status: "pending" });
    expect(all.map((r) => r._id)).toContain(id);
    const s = await t.query(api.dashboard.summary, { token: admin });
    expect(s.pendingRequests).toBe(1);
    expect(ids.admin).toBeDefined();
  });

  it("admin schedules it with an SMS, then a delivery closes it and updates the gas estimate", async () => {
    const { t, admin, c1, ids } = await seeded();
    const id = await t.mutation(api.requests.create, { token: c1, type: "refill", message: "gas po" });
    const when = Date.now() + DAY;
    await t.mutation(api.requests.updateStatus, { token: admin, requestId: id, status: "scheduled", scheduledAt: when, adminNote: "morning", sendSms: true });

    const mine = await t.query(api.requests.listMine, { token: c1 });
    expect(mine[0]).toMatchObject({ status: "scheduled", scheduledAt: when, adminNote: "morning" });

    const outbox = await t.query(api.notifications.smsOutbox, { token: admin });
    const sms = outbox.find((o) => o.title === "Request scheduled")!;
    expect(sms.clientPhone).toBe(CLIENT.phone);
    expect(sms.body).toMatch(/scheduled on .* Note: morning/);
    expect(sms.smsStatus).toBe("pending");

    const deliveredAt = Date.now();
    await t.mutation(api.deliveries.record, { token: admin, clientId: ids.c1, deliveredAt, tankSize: "11kg", quantity: 1, requestId: id, sendSms: true });
    expect((await t.query(api.requests.listMine, { token: c1 }))[0].status).toBe("delivered");
    const me = await t.query(api.users.me, { token: c1 });
    expect(me?.lastDeliveryAt).toBe(deliveredAt);

    await t.mutation(api.notifications.markSmsSent, { token: admin, ids: [sms._id] });
    expect((await t.query(api.notifications.smsOutbox, { token: admin })).map((o) => o._id)).not.toContain(sms._id);
    const sent = await t.query(api.notifications.smsOutbox, { token: admin, status: "sent" });
    expect(sent.map((o) => o._id)).toContain(sms._id);
    expect(sent[0].smsSentAt).toBeTypeOf("number");
  });

  it("an older delivery does not move lastDeliveryAt backwards", async () => {
    const { t, admin, c1, ids } = await seeded();
    const recent = Date.now();
    await t.mutation(api.deliveries.record, { token: admin, clientId: ids.c1, deliveredAt: recent, tankSize: "11kg", quantity: 1 });
    await t.mutation(api.deliveries.record, { token: admin, clientId: ids.c1, deliveredAt: recent - 10 * DAY, tankSize: "2.7kg", quantity: 1 });
    const me = await t.query(api.users.me, { token: c1 });
    expect(me?.lastDeliveryAt).toBe(recent);
    expect(me?.tankSize).toBe("11kg");
  });

  it("a delivered request cannot be cancelled by the client", async () => {
    const { t, admin, c1 } = await seeded();
    const id = await t.mutation(api.requests.create, { token: c1, type: "refill", message: "x" });
    await t.mutation(api.requests.updateStatus, { token: admin, requestId: id, status: "delivered" });
    await expect(t.mutation(api.requests.cancelMine, { token: c1, requestId: id })).rejects.toThrow(/Already delivered/);
  });
});

describe("messages", () => {
  it("client message lands in the admin inbox as unread and notifies admins; reading clears it", async () => {
    const { t, admin, c1, c2, ids } = await seeded();
    await t.mutation(api.messages.send, { token: c1, body: "Pwede po bukas?" });
    await t.mutation(api.messages.send, { token: c2, body: "Hi" });
    await t.mutation(api.messages.send, { token: c1, body: "Umaga po sana" });

    let inbox = await t.query(api.messages.inbox, { token: admin });
    expect(inbox).toHaveLength(2);
    expect(inbox[0]).toMatchObject({ clientId: ids.c1, unread: 2 });
    expect(inbox[0].last.body).toBe("Umaga po sana");
    expect((await t.query(api.dashboard.summary, { token: admin })).unreadMessages).toBe(3);

    await t.mutation(api.messages.markRead, { token: admin, clientId: ids.c1 });
    inbox = await t.query(api.messages.inbox, { token: admin });
    expect(inbox.find((r) => r.clientId === ids.c1)?.unread).toBe(0);

    await t.mutation(api.messages.send, { token: admin, clientId: ids.c1, body: "Sige po, 9am." });
    expect(await t.query(api.messages.unreadForClient, { token: c1 })).toBe(1);
    expect(await t.query(api.messages.unreadForClient, { token: admin })).toBe(0);
    await t.mutation(api.messages.markRead, { token: c1 });
    expect(await t.query(api.messages.unreadForClient, { token: c1 })).toBe(0);
    const notes = await t.query(api.notifications.listMine, { token: c1 });
    expect(notes.some((n) => n.type === "message")).toBe(true);
  });

  it("rejects empty messages", async () => {
    const { t, c1 } = await seeded();
    await expect(t.mutation(api.messages.send, { token: c1, body: "   " })).rejects.toThrow(/empty/);
  });
});

describe("reminders and notifications", () => {
  it("bulk reminder queues one SMS per client and shows in each client's list", async () => {
    const { t, admin, c1, c2, ids } = await seeded();
    const n = await t.mutation(api.notifications.sendReminder, { token: admin, clientIds: [ids.c1, ids.c2], title: "Low gas", body: "Refill na po", type: "low_gas", sms: true });
    expect(n).toBe(2);
    expect((await t.query(api.notifications.smsOutbox, { token: admin })).filter((o) => o.title === "Low gas")).toHaveLength(2);
    expect((await t.query(api.notifications.listMine, { token: c1 })).some((x) => x.title === "Low gas" && x.type === "low_gas")).toBe(true);
    expect((await t.query(api.notifications.listMine, { token: c2 })).some((x) => x.title === "Low gas")).toBe(true);
    await expect(t.mutation(api.notifications.sendReminder, { token: admin, clientIds: [ids.c1], title: " ", body: "x", sms: false })).rejects.toThrow(/required/);
  });

  it("markAllRead only touches the caller's notifications", async () => {
    const { t, admin, c1, c2, ids } = await seeded();
    await t.mutation(api.notifications.sendReminder, { token: admin, clientIds: [ids.c1, ids.c2], title: "A", body: "b", sms: false });
    await t.mutation(api.notifications.markAllRead, { token: c1 });
    expect(await t.query(api.notifications.unreadCount, { token: c1 })).toBe(0);
    expect(await t.query(api.notifications.unreadCount, { token: c2 })).toBeGreaterThan(0);
  });
});

describe("public landing data", () => {
  it("coveragePins exposes only rounded coordinates and tank size of active clients with a pin", async () => {
    const { t, admin, ids } = await seeded();
    const pins = await t.query(api.publicData.coveragePins, {});
    expect(pins).toEqual([{ lat: 14.604, lng: 120.982, tank: "11kg" }]); // c2 has no coordinates
    expect(Object.keys(pins[0]).sort()).toEqual(["lat", "lng", "tank"]);

    await t.mutation(api.users.updateProfile, { token: admin, userId: ids.c1, isActive: false });
    expect(await t.query(api.publicData.coveragePins, {})).toEqual([]);
  });
});
