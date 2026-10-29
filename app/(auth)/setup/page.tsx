import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { api } from "@/convex/_generated/api";
import { convexServer } from "@/lib/server/session";
import { SetupForm } from "./SetupForm";
import { Alert } from "@/components/ui";
import Link from "next/link";

export const metadata: Metadata = { title: "First-time setup" };

async function SetupGate() {
  await connection();
  let hasAdmin = false;
  let backendError: string | null = null;
  try {
    hasAdmin = await convexServer().query(api.users.hasAdmin, {});
  } catch (e) {
    backendError = e instanceof Error ? e.message.split("\n")[0] : String(e);
  }
  if (backendError) {
    return (
      <div className="space-y-4">
        <Alert>
          Cannot reach the Convex backend yet. Run <code className="rounded bg-white/60 px-1">npx convex dev</code> in the project folder once, then reload this page.
          <span className="mt-1 block text-xs opacity-70">{backendError}</span>
        </Alert>
        <SetupForm />
      </div>
    );
  }
  if (hasAdmin) {
    return (
      <div className="rounded-3xl border border-line bg-white p-8 shadow-card">
        <Alert tone="info">An admin account already exists. Setup is finished.</Alert>
        <Link href="/login" className="mt-4 inline-block text-sm font-semibold text-brand-600 hover:underline">
          Go to login
        </Link>
      </div>
    );
  }
  return <SetupForm />;
}

export default function SetupPage() {
  return (
    <Suspense fallback={<div className="skeleton h-80 rounded-3xl" />}>
      <SetupGate />
    </Suspense>
  );
}
