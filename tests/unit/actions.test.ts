import { beforeEach, describe, expect, it, vi } from "vitest";

const { action, setSessionCookie, clearSessionCookie, getSessionToken } = vi.hoisted(() => ({
  action: vi.fn(),
  setSessionCookie: vi.fn(),
  clearSessionCookie: vi.fn(),
  getSessionToken: vi.fn(),
}));

vi.mock("@/lib/server/session", () => ({
  convexServer: () => ({ action }),
  setSessionCookie,
  clearSessionCookie,
  getSessionToken,
}));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));

import { loginAction, logoutAction, registerAction, setupAdminAction } from "@/app/actions/auth";

const fd = (o: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(o)) f.set(k, v);
  return f;
};

beforeEach(() => {
  action.mockReset();
  setSessionCookie.mockReset();
  clearSessionCookie.mockReset();
  getSessionToken.mockReset();
});

describe("loginAction", () => {
  it("requires both fields", async () => {
    expect(await loginAction(undefined, fd({ phone: "", password: "x" }))).toEqual({ error: "Enter your mobile number and password." });
    expect(action).not.toHaveBeenCalled();
  });

  it("sets the cookie and redirects by role", async () => {
    action.mockResolvedValue({ token: "tok", expiresAt: 123, role: "admin" });
    await expect(loginAction(undefined, fd({ phone: "09304878996", password: "Admin@123" }))).rejects.toThrow("REDIRECT:/admin");
    expect(setSessionCookie).toHaveBeenCalledWith("tok", 123);

    action.mockResolvedValue({ token: "tok2", expiresAt: 1, role: "client" });
    await expect(loginAction(undefined, fd({ phone: "0917", password: "x" }))).rejects.toThrow("REDIRECT:/portal");
  });

  it("honours a safe next= path and ignores external ones", async () => {
    action.mockResolvedValue({ token: "t", expiresAt: 1, role: "client" });
    await expect(loginAction(undefined, fd({ phone: "a", password: "b", next: "/portal/request" }))).rejects.toThrow("REDIRECT:/portal/request");
    await expect(loginAction(undefined, fd({ phone: "a", password: "b", next: "https://evil.example" }))).rejects.toThrow("REDIRECT:/portal");
  });

  it("surfaces the human part of a Convex error", async () => {
    action.mockRejectedValue(new Error("[CONVEX A(auth:signIn)] [Request ID: abc] Server Error\nUncaught Error: Wrong mobile number or password.\n  at ..."));
    expect(await loginAction(undefined, fd({ phone: "a", password: "b" }))).toEqual({ error: "Wrong mobile number or password." });
  });
});

describe("registerAction", () => {
  const base = { name: "Juan", phone: "09171234567", password: "secret1", confirm: "secret1", lat: "14.6", lng: "120.98", address: "Rizal St, Manila" };

  it("rejects mismatched passwords before touching the backend", async () => {
    expect(await registerAction(undefined, fd({ ...base, confirm: "other" }))).toEqual({ error: "Passwords do not match." });
    expect(action).not.toHaveBeenCalled();
  });

  it("requires a location now that the address field is gone", async () => {
    expect(await registerAction(undefined, fd({ ...base, lat: "", lng: "" }))).toEqual({ error: "Please set your location so we know where to deliver." });
    expect(await registerAction(undefined, fd({ ...base, lat: "abc" }))).toMatchObject({ error: expect.stringMatching(/location/) });
    expect(action).not.toHaveBeenCalled();
  });

  it("sends the geocoded address, defaults tank size to 11kg, and redirects to the portal", async () => {
    action.mockResolvedValue({ token: "t", expiresAt: 9 });
    await expect(registerAction(undefined, fd(base))).rejects.toThrow("REDIRECT:/portal");
    expect(action).toHaveBeenCalledTimes(1);
    const [, args] = action.mock.calls[0];
    expect(args).toMatchObject({ name: "Juan", phone: "09171234567", password: "secret1", address: "Rizal St, Manila", tankSize: "11kg", lat: 14.6, lng: 120.98, landmark: undefined });
    expect(setSessionCookie).toHaveBeenCalledWith("t", 9);
  });

  it("falls back to coordinates when reverse geocoding produced no address", async () => {
    action.mockResolvedValue({ token: "t", expiresAt: 9 });
    await expect(registerAction(undefined, fd({ ...base, address: "  ", landmark: "blue gate" }))).rejects.toThrow("REDIRECT");
    expect(action.mock.calls[0][1]).toMatchObject({ address: "14.60000, 120.98000", landmark: "blue gate" });
  });

  it("only accepts a known tank size if one is somehow posted", async () => {
    action.mockResolvedValue({ token: "t", expiresAt: 9 });
    await expect(registerAction(undefined, fd({ ...base, tankSize: "50kg" }))).rejects.toThrow("REDIRECT");
    expect(action.mock.calls[0][1].tankSize).toBe("11kg");
    await expect(registerAction(undefined, fd({ ...base, tankSize: "2.7kg" }))).rejects.toThrow("REDIRECT");
    expect(action.mock.calls[1][1].tankSize).toBe("2.7kg");
  });
});

describe("setupAdminAction and logoutAction", () => {
  it("setup checks password confirmation and redirects to /admin", async () => {
    expect(await setupAdminAction(undefined, fd({ name: "A", phone: "0930", password: "a", confirm: "b" }))).toEqual({ error: "Passwords do not match." });
    action.mockResolvedValue({ token: "t", expiresAt: 1 });
    await expect(setupAdminAction(undefined, fd({ name: "A", phone: "0930", password: "Admin@123", confirm: "Admin@123" }))).rejects.toThrow("REDIRECT:/admin");
  });

  it("logout clears the cookie even if the backend call fails", async () => {
    getSessionToken.mockResolvedValue("tok");
    action.mockRejectedValue(new Error("offline"));
    await expect(logoutAction()).rejects.toThrow("REDIRECT:/");
    expect(clearSessionCookie).toHaveBeenCalled();
  });
});
