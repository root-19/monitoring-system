import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { convexServer, getSessionToken } from "./session";

/**
 * Current session, resolved once per request (React cache) and shared by every layout
 * that asks for it, so a navigation costs one Convex round-trip instead of one per layout.
 */
export const getCurrentSession = cache(async () => {
  const token = await getSessionToken();
  if (!token) return { token: null, user: null } as const;
  const user = await convexServer().query(api.users.me, { token });
  return { token, user } as const;
});

/** Enforce a role on the server. Convex re-checks authorization on every call regardless. */
export async function requireRole(role: "admin" | "client") {
  const { token, user } = await getCurrentSession();
  if (!token) redirect("/login");
  if (!user) redirect("/login?expired=1");
  if (user.role !== role) redirect(user.role === "admin" ? "/admin" : "/portal");
  return { token, user };
}
