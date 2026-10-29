import { beforeEach, describe, expect, it, vi } from "vitest";

const { query, getSessionToken } = vi.hoisted(() => ({ query: vi.fn(), getSessionToken: vi.fn() }));
vi.mock("@/lib/server/session", () => ({ convexServer: () => ({ query }), getSessionToken }));
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));
// React's cache() is a no-op outside a server render; make it identity but observable.
vi.mock("react", async (orig) => ({ ...(await orig<typeof import("react")>()), cache: <T>(fn: T) => fn }));

import { getCurrentSession, requireRole } from "@/lib/server/requireRole";

beforeEach(() => {
  query.mockReset();
  getSessionToken.mockReset();
});

describe("requireRole", () => {
  it("sends anonymous visitors to login without calling Convex", async () => {
    getSessionToken.mockResolvedValue(null);
    await expect(requireRole("admin")).rejects.toThrow("REDIRECT:/login");
    expect(query).not.toHaveBeenCalled();
  });

  it("treats an unknown or expired token as expired", async () => {
    getSessionToken.mockResolvedValue("stale");
    query.mockResolvedValue(null);
    await expect(requireRole("client")).rejects.toThrow("REDIRECT:/login?expired=1");
  });

  it("bounces a client away from admin pages and an admin away from the portal", async () => {
    getSessionToken.mockResolvedValue("tok");
    query.mockResolvedValue({ role: "client", name: "Juan" });
    await expect(requireRole("admin")).rejects.toThrow("REDIRECT:/portal");
    query.mockResolvedValue({ role: "admin", name: "PGI" });
    await expect(requireRole("client")).rejects.toThrow("REDIRECT:/admin");
  });

  it("returns the session when the role matches", async () => {
    getSessionToken.mockResolvedValue("tok");
    query.mockResolvedValue({ role: "admin", name: "PGI" });
    expect(await requireRole("admin")).toEqual({ token: "tok", user: { role: "admin", name: "PGI" } });
    expect(await getCurrentSession()).toEqual({ token: "tok", user: { role: "admin", name: "PGI" } });
  });
});
