import "server-only";
import { cookies } from "next/headers";
import { ConvexHttpClient } from "convex/browser";

export const SESSION_COOKIE = "pgi_session";

export function convexServer() {
  const url = (process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL ?? "").trim();
  if (!/^https?:\/\//.test(url)) {
    throw new Error(
      `NEXT_PUBLIC_CONVEX_URL is missing or invalid in .env.local (got "${url}"). ` +
        "It must start with http:// or https://. Restart `npm run dev` after editing .env.local.",
    );
  }
  return new ConvexHttpClient(url);
}

export async function getSessionToken() {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

export async function setSessionCookie(token: string, expiresAt: number) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
