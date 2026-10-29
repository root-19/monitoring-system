"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { Bell, LogOut, Menu, X, type LucideIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { api } from "@/convex/_generated/api";
import { useSession } from "@/components/providers/SessionProvider";
import { logoutAction } from "@/app/actions/auth";
import { Logo } from "@/components/Logo";
import { cn } from "@/components/ui";

export type NavItem = { href: string; label: string; icon: LucideIcon; badgeKey?: "notifications" | "messages" | "requests" | "sms" };

export function AppShell({
  items,
  role,
  children,
  notificationsHref,
  badges = {},
}: {
  items: NavItem[];
  role: "admin" | "client";
  children: ReactNode;
  notificationsHref: string;
  badges?: Partial<Record<NonNullable<NavItem["badgeKey"]>, number>>;
}) {
  const { token, user } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const unread = useQuery(api.notifications.unreadCount, { token }) ?? 0;

  // Role guard: wrong area -> send to the right home
  useEffect(() => {
    if (user.role !== role) router.replace(user.role === "admin" ? "/admin" : "/portal");
  }, [user.role, role, router]);

  const isActive = (href: string) => (href === "/admin" || href === "/portal" ? pathname === href : pathname.startsWith(href));
  const allBadges = { ...badges, notifications: unread };

  const nav = (
    <nav className="flex flex-1 flex-col gap-1">
      {items.map((it) => {
        const count = it.badgeKey ? allBadges[it.badgeKey] ?? 0 : 0;
        return (
          <Link
            key={it.href}
            href={it.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
              isActive(it.href) ? "bg-brand-600 text-white shadow-soft" : "text-ink-700 hover:bg-brand-50 hover:text-brand-700"
            )}
          >
            <it.icon className="size-[18px]" />
            <span className="flex-1">{it.label}</span>
            {count > 0 && (
              <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", isActive(it.href) ? "bg-white/20 text-white" : "bg-brand-600 text-white")}>
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const userBox = (
    <div className="rounded-2xl border border-line bg-surface-2 p-3">
      <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
      <p className="text-xs text-ink-500">{role === "admin" ? "PGI Administrator" : "Client"}</p>
      <form action={logoutAction} className="mt-2">
        <button type="submit" className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-danger">
          <LogOut className="size-3.5" /> Log out
        </button>
      </form>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-1 bg-surface-2">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 border-r border-line bg-white p-4 lg:flex">
        <Logo href={role === "admin" ? "/admin" : "/portal"} />
        {nav}
        {userBox}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-ink/40 lg:hidden" onClick={() => setOpen(false)} />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col gap-6 bg-white p-4 shadow-2xl lg:hidden"
            >
              <div className="flex items-center justify-between">
                <Logo href={role === "admin" ? "/admin" : "/portal"} />
                <button onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-lg hover:bg-surface-2" aria-label="Close menu">
                  <X className="size-5" />
                </button>
              </div>
              {nav}
              {userBox}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-line bg-white/80 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2">
            <button onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-xl hover:bg-surface-2 lg:hidden" aria-label="Open menu">
              <Menu className="size-5" />
            </button>
            <span className="lg:hidden">
              <Logo href={role === "admin" ? "/admin" : "/portal"} />
            </span>
            <p className="hidden text-sm text-ink-500 lg:block">
              {role === "admin" ? "Fiesta Gas PGI · Admin" : `Hello, ${user.name.split(" ")[0]}!`}
            </p>
          </div>
          <Link href={notificationsHref} className="relative grid size-10 place-items-center rounded-xl text-ink-700 hover:bg-surface-2" aria-label="Notifications">
            <Bell className="size-5" />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white ring-2 ring-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <motion.div key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="mx-auto w-full max-w-6xl">
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
