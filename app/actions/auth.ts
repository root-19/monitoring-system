"use server";

import { redirect } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { clearSessionCookie, convexServer, getSessionToken, setSessionCookie } from "@/lib/server/session";

export type AuthState = { error?: string } | undefined;

function errorMessage(e: unknown) {
  const msg = e instanceof Error ? e.message : String(e);
  // Convex wraps thrown errors; keep only the human part.
  const m = msg.match(/Uncaught Error: (.*?)(\n|$)/);
  return m ? m[1] : msg.replace(/^\[.*?\]\s*/, "");
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const phone = String(formData.get("phone") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "");
  if (!phone || !password) return { error: "Enter your mobile number and password." };

  let role: "admin" | "client";
  try {
    const res = await convexServer().action(api.auth.signIn, { phone, password });
    await setSessionCookie(res.token, res.expiresAt);
    role = res.role;
  } catch (e) {
    return { error: errorMessage(e) };
  }
  redirect(next && next.startsWith("/") ? next : role === "admin" ? "/admin" : "/portal");
}

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const name = String(formData.get("name") ?? "");
  const phone = String(formData.get("phone") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const address = String(formData.get("address") ?? "");
  const landmark = String(formData.get("landmark") ?? "");
  // Tank size is no longer asked at sign-up; PGI sets it on the first delivery. Default to the common 11 kg.
  const tankSize: "11kg" | "2.7kg" = String(formData.get("tankSize") || "") === "2.7kg" ? "2.7kg" : "11kg";
  const lat = formData.get("lat") ? Number(formData.get("lat")) : undefined;
  const lng = formData.get("lng") ? Number(formData.get("lng")) : undefined;

  if (password !== confirm) return { error: "Passwords do not match." };
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { error: "Please set your location so we know where to deliver." };
  const resolvedAddress = address.trim() || `${(lat as number).toFixed(5)}, ${(lng as number).toFixed(5)}`;

  try {
    const res = await convexServer().action(api.auth.register, {
      name,
      phone,
      password,
      address: resolvedAddress,
      landmark: landmark || undefined,
      tankSize,
      lat: Number.isFinite(lat) ? lat : undefined,
      lng: Number.isFinite(lng) ? lng : undefined,
    });
    await setSessionCookie(res.token, res.expiresAt);
  } catch (e) {
    return { error: errorMessage(e) };
  }
  redirect("/portal");
}

export async function setupAdminAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const name = String(formData.get("name") ?? "");
  const phone = String(formData.get("phone") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password !== confirm) return { error: "Passwords do not match." };
  try {
    const res = await convexServer().action(api.auth.setupAdmin, { name, phone, password });
    await setSessionCookie(res.token, res.expiresAt);
  } catch (e) {
    return { error: errorMessage(e) };
  }
  redirect("/admin");
}

export async function logoutAction() {
  const token = await getSessionToken();
  if (token) {
    try {
      await convexServer().action(api.auth.signOut, { token });
    } catch {
      // ignore: cookie is cleared regardless
    }
  }
  await clearSessionCookie();
  redirect("/");
}
