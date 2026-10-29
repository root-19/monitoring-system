import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff } from "lucide-react";
import { PGI_PHONE, PGI_PHONE_DISPLAY } from "@/lib/gas";

export const metadata: Metadata = { title: "You are offline" };

/** Shown by the service worker when a page cannot be loaded without internet. */
export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-surface-2 px-4">
      <div className="w-full max-w-sm rounded-3xl border border-line bg-white p-8 text-center shadow-card">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          <WifiOff className="size-7" />
        </span>
        <h1 className="mt-4 text-xl font-bold text-ink">You are offline</h1>
        <p className="mt-2 text-sm text-ink-500">Connect to the internet to see your gas status, requests and messages. Your data is safe on our servers.</p>
        <Link href="/" className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700">
          Try again
        </Link>
        <p className="mt-4 text-xs text-ink-500">
          Need gas now? Call{" "}
          <a href={`tel:${PGI_PHONE}`} className="font-semibold text-brand-600">
            {PGI_PHONE_DISPLAY}
          </a>
        </p>
      </div>
    </main>
  );
}
