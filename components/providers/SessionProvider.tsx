"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { Doc } from "@/convex/_generated/dataModel";

export type SessionUser = Omit<Doc<"users">, "passwordHash">;

type SessionValue = { token: string; user: SessionUser };

const SessionContext = createContext<SessionValue | null>(null);

let client: ConvexReactClient | null = null;
function getClient() {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is missing in .env.local");
    client = new ConvexReactClient(url);
  }
  return client;
}

export function SessionProvider({
  token,
  user,
  children,
}: {
  token: string;
  user: SessionUser;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ token, user }), [token, user]);
  return (
    <ConvexProvider client={getClient()}>
      <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
    </ConvexProvider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}

/** Convex provider without a session (public pages that still need live data). */
export function PublicConvexProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={getClient()}>{children}</ConvexProvider>;
}
