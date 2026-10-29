import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { moveStock } from "./inventory";
import { notify } from "./lib";

const DAY = 24 * 60 * 60 * 1000;
type Tank = "11kg" | "2.7kg";

/**
 * Demo clients for presentations. lastDays = days since the latest delivery, chosen so the
 * dashboard shows every gas status: Good, Getting low, Almost empty, Likely empty, No delivery yet.
 */
const CLIENTS: { name: string; phone: string; address: string; landmark?: string; lat: number; lng: number; tank: Tank; avg: number; lastDays: number | null; count: number; notes?: string }[] = [
  { name: "Juan Dela Cruz", phone: "09171000001", address: "123 Rizal St, Sampaloc, Manila", landmark: "beside 7-Eleven", lat: 14.6091, lng: 120.9893, tank: "11kg", avg: 30, lastDays: 2, count: 4 },
  { name: "Maria Santos", phone: "09171000002", address: "45 Kamuning Rd, Quezon City", landmark: "blue gate", lat: 14.6352, lng: 121.0401, tank: "11kg", avg: 28, lastDays: 9, count: 5, notes: "Pays via GCash" },
  { name: "Pedro Reyes", phone: "09171000003", address: "8 P. Burgos St, Makati", landmark: "near the barangay hall", lat: 14.5676, lng: 121.0294, tank: "2.7kg", avg: 14, lastDays: 4, count: 6 },
  { name: "Ana Villanueva", phone: "09171000004", address: "Block 3 Lot 12, BF Homes, Parañaque", lat: 14.4445, lng: 121.0245, tank: "11kg", avg: 30, lastDays: 19, count: 3 },
  { name: "Jose Bautista", phone: "09171000005", address: "77 Shaw Blvd, Mandaluyong", landmark: "above the bakery", lat: 14.5833, lng: 121.0333, tank: "11kg", avg: 25, lastDays: 16, count: 4 },
  { name: "Liza Mendoza", phone: "09171000006", address: "21 Aurora Blvd, San Juan", lat: 14.6019, lng: 121.0355, tank: "2.7kg", avg: 14, lastDays: 9, count: 5 },
  { name: "Ramon Garcia", phone: "09171000007", address: "Lot 5, Pasig Greenpark Village", landmark: "red roof, corner lot", lat: 14.5764, lng: 121.0851, tank: "11kg", avg: 30, lastDays: 25, count: 4, notes: "Big family, call before delivering" },
  { name: "Carmen Torres", phone: "09171000008", address: "9 Dr. A. Santos Ave, Sucat", lat: 14.4687, lng: 121.0346, tank: "11kg", avg: 30, lastDays: 27, count: 2 },
  { name: "Edgar Flores", phone: "09171000009", address: "C. Raymundo Ave, Pasig", landmark: "in front of Puregold", lat: 14.5716, lng: 121.0745, tank: "11kg", avg: 30, lastDays: 33, count: 3 },
  { name: "Grace Lim", phone: "09171000010", address: "Taft Ave, Pasay", lat: 14.5378, lng: 120.9957, tank: "2.7kg", avg: 14, lastDays: 16, count: 4 },
  { name: "Noel Aquino", phone: "09171000011", address: "Tandang Sora, Quezon City", landmark: "white gate, beside sari-sari store", lat: 14.6765, lng: 121.0498, tank: "11kg", avg: 30, lastDays: 12, count: 5 },
  { name: "Rosa Fernandez", phone: "09171000012", address: "Caloocan City, 10th Ave", lat: 14.6488, lng: 120.9778, tank: "11kg", avg: 30, lastDays: null, count: 0 },
];

const PRICE: Record<Tank, number> = { "11kg": 950, "2.7kg": 300 };

export const insertDemo = internalMutation({
  args: { passwordHash: v.string() },
  handler: async (ctx, { passwordHash }) => {
    const admin = await ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "admin")).first();
    if (!admin) throw new Error("No admin yet. Run auth:seedAdmin first.");
    const now = Date.now();
    const created: string[] = [];
    const skipped: string[] = [];

    // Remove leftovers from automated checks
    for (const u of await ctx.db.query("users").collect()) {
      if (u.name.startsWith("Test Client (deactivated")) await ctx.db.delete(u._id);
    }

    // Prices and a starting stock so sales and inventory have numbers
    for (const tank of ["11kg", "2.7kg"] as const) {
      const p = await ctx.db.query("prices").withIndex("by_tank", (q) => q.eq("tankSize", tank)).unique();
      if (!p) await ctx.db.insert("prices", { tankSize: tank, price: PRICE[tank], updatedAt: now, updatedBy: admin._id });
      const s = await ctx.db.query("stock").withIndex("by_tank", (q) => q.eq("tankSize", tank)).unique();
      if (!s || s.onHand <= 0) await moveStock(ctx, { tankSize: tank, delta: tank === "11kg" ? 60 : 25, kind: "restock", note: "Opening stock (demo)", by: admin._id });
    }

    const ids: Record<string, Awaited<ReturnType<typeof ctx.db.insert<"users">>>> = {};
    for (const c of CLIENTS) {
      const exists = await ctx.db.query("users").withIndex("by_phone", (q) => q.eq("phone", c.phone)).unique();
      if (exists) {
        skipped.push(c.name);
        ids[c.phone] = exists._id;
        continue;
      }
      const last = c.lastDays == null ? undefined : now - c.lastDays * DAY;
      const id = await ctx.db.insert("users", {
        name: c.name,
        phone: c.phone,
        passwordHash,
        role: "client",
        address: c.address,
        landmark: c.landmark,
        lat: c.lat,
        lng: c.lng,
        tankSize: c.tank,
        avgDaysPerTank: c.avg,
        lastDeliveryAt: last,
        notes: c.notes,
        isActive: true,
        createdAt: now - (c.count * c.avg + 10) * DAY,
      });
      ids[c.phone] = id;
      created.push(c.name);

      // Delivery history: newest at lastDays ago, older ones roughly one tank-life apart
      for (let i = 0; i < c.count; i++) {
        const jitter = ((i * 7) % 5) - 2; // -2..+2 days so it does not look generated
        const deliveredAt = (last as number) - i * (c.avg + jitter) * DAY;
        const qty = i === 1 && c.tank === "2.7kg" ? 2 : 1;
        const dId = await ctx.db.insert("deliveries", {
          clientId: id,
          deliveredAt,
          tankSize: c.tank,
          quantity: qty,
          amount: PRICE[c.tank] * qty,
          notes: i === 0 && c.notes ? "Paid cash" : undefined,
          recordedBy: admin._id,
        });
        await moveStock(ctx, { tankSize: c.tank, delta: -qty, kind: "sale", deliveryId: dId, note: `Delivery to ${c.name}`, by: admin._id });
      }
      await notify(ctx, {
        userId: id,
        title: "Welcome to Fiesta Gas PGI",
        body: "Your account is ready. You can request a refill, send us a message, and see your gas status here.",
        type: "system",
      });
    }

    if (created.length === 0) return { created, skipped, note: "Demo clients already exist; nothing else added." };

    // Requests in different states
    const req = async (phone: string, msg: string, status: "pending" | "accepted" | "scheduled", ageHours: number, scheduledAt?: number) => {
      const clientId = ids[phone];
      const createdAt = now - ageHours * 60 * 60 * 1000;
      const rId = await ctx.db.insert("requests", { clientId, type: "refill", message: msg, tankSize: CLIENTS.find((c) => c.phone === phone)!.tank, quantity: 1, status, scheduledAt, createdAt, updatedAt: createdAt });
      const who = CLIENTS.find((c) => c.phone === phone)!;
      await notify(ctx, { userId: admin._id, title: `New refill request from ${who.name}`, body: `1 x ${who.tank} - ${msg}`, type: "request" });
      return rId;
    };
    await req("09171000007", "Paubos na po, pwede bukas ng umaga?", "pending", 2);
    await req("09171000008", "Need refill po, wala nang gas.", "pending", 5);
    await req("09171000004", "Refill po please, after 5pm.", "pending", 20);
    await req("09171000009", "Ubos na po talaga.", "scheduled", 30, now + DAY);
    await req("09171000005", "Pa-refill po sa Sabado.", "accepted", 48);

    // Chats
    const chat = async (phone: string, lines: [from: "client" | "admin", body: string, minutesAgo: number][]) => {
      const clientId = ids[phone];
      for (const [from, body, minutesAgo] of lines) {
        await ctx.db.insert("messages", {
          clientId,
          senderId: from === "admin" ? admin._id : clientId,
          senderRole: from,
          body,
          createdAt: now - minutesAgo * 60 * 1000,
          readByAdmin: from === "admin" || minutesAgo > 60,
          readByClient: from === "client",
        });
      }
    };
    await chat("09171000007", [
      ["client", "Good morning po! Pwede po ba bukas ang delivery?", 180],
      ["admin", "Yes po, 9am bukas. Please have the empty tank ready.", 150],
      ["client", "Sige po, salamat!", 140],
      ["client", "Pwede po ba mag-add ng isa pang tank?", 15],
    ]);
    await chat("09171000002", [
      ["client", "Magkano po ang 11kg ngayon?", 40],
      ["admin", "₱950 po, free delivery.", 35],
      ["client", "Okay po, next week na lang po ako magpa-refill.", 10],
    ]);
    await chat("09171000010", [["client", "Hello po, may 2.7kg pa po ba kayo?", 5]]);

    // Queued SMS reminders for the low ones, one already sent
    for (const phone of ["09171000007", "09171000008", "09171000009"]) {
      const who = CLIENTS.find((c) => c.phone === phone)!;
      await notify(ctx, { userId: ids[phone], title: "Gas reminder", body: `Hi ${who.name.split(" ")[0]}! Your ${who.tank} tank is almost empty. Reply or tap Request refill and Fiesta Gas PGI will deliver. 0998 586 1976`, type: "low_gas", sms: true, createdBy: admin._id });
    }
    const sentId = await notify(ctx, { userId: ids["09171000004"], title: "Gas reminder", body: "Hi Ana! Your tank is getting low. Request a refill anytime.", type: "low_gas", sms: true, createdBy: admin._id });
    await ctx.db.patch(sentId, { smsStatus: "sent", smsSentAt: now - 3 * 60 * 60 * 1000 });

    return { created, skipped, note: "Client password for all demo accounts: client123" };
  },
});
