import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/server/requireRole";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { ToastProvider } from "@/components/Toast";
import { FlameMark } from "@/components/Logo";

async function SessionGate({ children }: { children: React.ReactNode }) {
  const { token, user } = await getCurrentSession();
  if (!token) redirect("/login");
  if (!user) redirect("/login?expired=1");
  return (
    <SessionProvider token={token} user={user}>
      <ToastProvider>{children}</ToastProvider>
    </SessionProvider>
  );
}

function Splash() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-surface-2">
      <div className="flex flex-col items-center gap-3">
        <span className="grid size-12 animate-pulse place-items-center rounded-2xl bg-brand-600 text-white shadow-soft">
          <FlameMark className="size-6" />
        </span>
        <p className="text-sm text-ink-500">Loading Fiesta Gas PGI…</p>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<Splash />}>
      <SessionGate>{children}</SessionGate>
    </Suspense>
  );
}
