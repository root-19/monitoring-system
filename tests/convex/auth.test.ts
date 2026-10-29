import { describe, expect, it } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import { ADMIN, CLIENT, fresh, seeded } from "./helpers";

describe("auth: registration", () => {
  it("registers a client, hashes the password, and opens a session", async () => {
    const t = fresh();
    const res = await t.action(api.auth.register, CLIENT);
    expect(res.token).toMatch(/^[0-9a-f]{64}$/);
    expect(res.expiresAt).toBeGreaterThan(Date.now());

    const user = await t.run((ctx) => ctx.db.query("users").first());
    expect(user?.role).toBe("client");
    expect(user?.isActive).toBe(true);
    expect(user?.passwordHash).not.toContain(CLIENT.password);
    expect(user?.passwordHash).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);
    expect(user?.avgDaysPerTank).toBe(30);

    const me = await t.query(api.users.me, { token: res.token });
    expect(me?.phone).toBe(CLIENT.phone);
    expect(me && "passwordHash" in me).toBe(false);
  });

  it("normalises +63 numbers and rejects invalid ones", async () => {
    const t = fresh();
    await t.action(api.auth.register, { ...CLIENT, phone: "+63 917 123 4567" });
    const user = await t.run((ctx) => ctx.db.query("users").first());
    expect(user?.phone).toBe("09171234567");

    await expect(t.action(api.auth.register, { ...CLIENT, phone: "12345" })).rejects.toThrow(/valid mobile number/);
    await expect(t.action(api.auth.register, { ...CLIENT, phone: "09181234567", password: "123" })).rejects.toThrow(/at least 6/);
    await expect(t.action(api.auth.register, { ...CLIENT, phone: "09181234567", name: "J" })).rejects.toThrow(/full name/);
  });

  it("refuses a duplicate mobile number", async () => {
    const t = fresh();
    await t.action(api.auth.register, CLIENT);
    await expect(t.action(api.auth.register, CLIENT)).rejects.toThrow(/already registered/);
  });

  it("sends a welcome notification to new clients only", async () => {
    const { t, ids } = await seeded();
    const forClient = await t.run((ctx) => ctx.db.query("notifications").withIndex("by_user", (q) => q.eq("userId", ids.c1)).collect());
    const forAdmin = await t.run((ctx) => ctx.db.query("notifications").withIndex("by_user", (q) => q.eq("userId", ids.admin)).collect());
    expect(forClient.map((n) => n.title)).toContain("Welcome to Fiesta Gas PGI");
    expect(forAdmin).toHaveLength(0);
  });
});

describe("auth: sign in / out", () => {
  it("signs in with the right password and reports the role", async () => {
    const { t } = await seeded();
    const res = await t.action(api.auth.signIn, { phone: ADMIN.phone, password: ADMIN.password });
    expect(res.role).toBe("admin");
    const c = await t.action(api.auth.signIn, { phone: "0917 123 4567", password: CLIENT.password });
    expect(c.role).toBe("client");
  });

  it("rejects a wrong password or unknown number with the same message", async () => {
    const { t } = await seeded();
    await expect(t.action(api.auth.signIn, { phone: ADMIN.phone, password: "nope" })).rejects.toThrow(/Wrong mobile number or password/);
    await expect(t.action(api.auth.signIn, { phone: "09990000000", password: "nope" })).rejects.toThrow(/Wrong mobile number or password/);
  });

  it("blocks deactivated accounts and invalidates their existing sessions", async () => {
    const { t, admin, c1, ids } = await seeded();
    await t.mutation(api.users.updateProfile, { token: admin, userId: ids.c1, isActive: false });
    await expect(t.action(api.auth.signIn, { phone: CLIENT.phone, password: CLIENT.password })).rejects.toThrow(/deactivated/);
    expect(await t.query(api.users.me, { token: c1 })).toBeNull();
  });

  it("signOut deletes the session", async () => {
    const { t, c1 } = await seeded();
    await t.action(api.auth.signOut, { token: c1 });
    expect(await t.query(api.users.me, { token: c1 })).toBeNull();
  });

  it("expired sessions are not accepted", async () => {
    const { t, c1 } = await seeded();
    await t.run(async (ctx) => {
      const s = await ctx.db.query("sessions").withIndex("by_token", (q) => q.eq("token", c1)).unique();
      await ctx.db.patch(s!._id, { expiresAt: Date.now() - 1000 });
    });
    expect(await t.query(api.users.me, { token: c1 })).toBeNull();
  });
});

describe("auth: admin provisioning", () => {
  it("setupAdmin only works once", async () => {
    const t = fresh();
    await t.action(api.auth.setupAdmin, ADMIN);
    expect(await t.query(api.users.hasAdmin, {})).toBe(true);
    await expect(t.action(api.auth.setupAdmin, { ...ADMIN, phone: "09000000000" })).rejects.toThrow(/already exists/);
  });

  it("seedAdmin creates the admin, then resets its password and promotes an existing user", async () => {
    const t = fresh();
    const first = await t.action(internal.auth.seedAdmin, ADMIN);
    expect(first).toEqual({ phone: ADMIN.phone, created: true });
    await t.action(api.auth.signIn, { phone: ADMIN.phone, password: ADMIN.password });

    const second = await t.action(internal.auth.seedAdmin, { ...ADMIN, password: "NewPass#1" });
    expect(second.created).toBe(false);
    await expect(t.action(api.auth.signIn, { phone: ADMIN.phone, password: ADMIN.password })).rejects.toThrow();
    await t.action(api.auth.signIn, { phone: ADMIN.phone, password: "NewPass#1" });

    await t.action(api.auth.register, CLIENT);
    await t.action(internal.auth.seedAdmin, { phone: CLIENT.phone, password: "Promote1" });
    const promoted = await t.action(api.auth.signIn, { phone: CLIENT.phone, password: "Promote1" });
    expect(promoted.role).toBe("admin");
    const admins = await t.run((ctx) => ctx.db.query("users").withIndex("by_role", (q) => q.eq("role", "admin")).collect());
    expect(admins).toHaveLength(2);
  });

  it("seedAdmin refuses to run without credentials", async () => {
    const t = fresh();
    delete process.env.ADMIN_PHONE;
    delete process.env.ADMIN_PASSWORD;
    await expect(t.action(internal.auth.seedAdmin, {})).rejects.toThrow(/Provide phone and password/);
  });
});

describe("auth: passwords", () => {
  it("changePassword needs the current password", async () => {
    const { t, c1 } = await seeded();
    await expect(t.action(api.auth.changePassword, { token: c1, currentPassword: "wrong", newPassword: "newpass1" })).rejects.toThrow(/Current password is wrong/);
    await t.action(api.auth.changePassword, { token: c1, currentPassword: CLIENT.password, newPassword: "newpass1" });
    await t.action(api.auth.signIn, { phone: CLIENT.phone, password: "newpass1" });
  });

  it("adminResetPassword is admin-only", async () => {
    const { t, admin, c1, ids } = await seeded();
    await expect(t.action(api.auth.adminResetPassword, { token: c1, userId: ids.c2, newPassword: "hacked1" })).rejects.toThrow(/Admin access only/);
    await t.action(api.auth.adminResetPassword, { token: admin, userId: ids.c2, newPassword: "reset123" });
    await t.action(api.auth.signIn, { phone: "09181234567", password: "reset123" });
  });

  it("adminCreateClient is admin-only and validates like registration", async () => {
    const { t, admin, c1 } = await seeded();
    const args = { name: "Pedro Penduko", phone: "09190000000", password: "pedro123", address: "Quezon City", tankSize: "11kg" as const };
    await expect(t.action(api.auth.adminCreateClient, { ...args, token: c1 })).rejects.toThrow(/Admin access only/);
    await t.action(api.auth.adminCreateClient, { ...args, token: admin });
    await expect(t.action(api.auth.adminCreateClient, { ...args, token: admin })).rejects.toThrow(/already registered/);
    const created = await t.action(api.auth.signIn, { phone: args.phone, password: args.password });
    expect(created.role).toBe("client");
  });
});
