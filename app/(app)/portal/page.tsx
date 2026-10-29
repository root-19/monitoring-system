"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { ArrowRight, Bell, MessageSquareText, PackagePlus, Phone, Truck } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useSession } from "@/components/providers/SessionProvider";
import { GasStatusCard, LevelBar } from "@/components/GasGauge";
import { estimateGas, formatDate, PGI_PHONE, PGI_PHONE_DISPLAY, timeAgo } from "@/lib/gas";
import { Badge, Card, CardHeader, EmptyState } from "@/components/ui";
import { RequestStatusBadge } from "@/components/StatusBadges";

export default function PortalHome() {
  const { token, user: sessionUser } = useSession();
  const me = useQuery(api.users.me, { token }) ?? sessionUser;
  const notifications = useQuery(api.notifications.listMine, { token, limit: 4 });
  const deliveries = useQuery(api.deliveries.listForClient, { token });
  const requests = useQuery(api.requests.listMine, { token });
  const est = estimateGas(me.lastDeliveryAt, me.avgDaysPerTank, me.tankSize);
  const active = (requests ?? []).filter((r) => r.status === "pending" || r.status === "accepted" || r.status === "scheduled");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Hello, {me.name.split(" ")[0]}!</h1>
        <p className="text-sm text-ink-500">Here is your gas status and latest updates from Fiesta Gas PGI.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <GasStatusCard estimate={est} tank={me.tankSize} />
          <div className="mt-5">
            <LevelBar pct={est.pct} status={est.status} />
            <div className="mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-ink-500">
              <span>Last delivery: {me.lastDeliveryAt ? formatDate(me.lastDeliveryAt) : "none yet"}</span>
              <span>Usual: one tank per ~{me.avgDaysPerTank ?? 30} days</span>
            </div>
          </div>
          {(est.status === "low" || est.status === "critical" || est.status === "empty") && (
            <Link href="/portal/request" className="mt-5 flex items-center justify-between rounded-xl bg-brand-600 px-4 py-3 text-white shadow-soft transition hover:bg-brand-700">
              <span className="flex items-center gap-2 font-semibold">
                <PackagePlus className="size-5" /> Request a refill now
              </span>
              <ArrowRight className="size-4" />
            </Link>
          )}
        </Card>

        <Card className="p-5">
          <p className="text-sm font-semibold text-ink">Quick actions</p>
          <div className="mt-3 grid gap-2">
            <Link href="/portal/request" className="flex items-center gap-3 rounded-xl border border-line px-3 py-3 transition hover:border-brand-300 hover:bg-brand-50">
              <span className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-600"><PackagePlus className="size-4" /></span>
              <span className="text-sm font-medium">Request refill</span>
            </Link>
            <Link href="/portal/messages" className="flex items-center gap-3 rounded-xl border border-line px-3 py-3 transition hover:border-brand-300 hover:bg-brand-50">
              <span className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-600"><MessageSquareText className="size-4" /></span>
              <span className="text-sm font-medium">Message PGI</span>
            </Link>
            <a href={`tel:${PGI_PHONE}`} className="flex items-center gap-3 rounded-xl border border-line px-3 py-3 transition hover:border-brand-300 hover:bg-brand-50">
              <span className="grid size-9 place-items-center rounded-lg bg-green-50 text-green-600"><Phone className="size-4" /></span>
              <span className="text-sm font-medium">Call {PGI_PHONE_DISPLAY}</span>
            </a>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Active requests" action={<Link href="/portal/request" className="text-sm font-medium text-brand-600 hover:underline">View all</Link>} />
          <div className="p-5">
            {!requests ? (
              <div className="skeleton h-16 rounded-xl" />
            ) : active.length === 0 ? (
              <EmptyState title="No active requests" description="Tap “Request refill” when you need gas." />
            ) : (
              <ul className="space-y-3">
                {active.map((r) => (
                  <li key={r._id} className="flex items-start justify-between gap-3 rounded-xl border border-line p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">{r.type === "refill" ? `Refill · ${r.quantity ?? 1} x ${r.tankSize ?? me.tankSize}` : r.type === "inquiry" ? "Inquiry" : "Request"}</p>
                      <p className="break-words text-xs text-ink-500">{r.message}</p>
                      {r.scheduledAt && <p className="mt-1 text-xs font-medium text-brand-700">Scheduled: {formatDate(r.scheduledAt, true)}</p>}
                    </div>
                    <RequestStatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader title="Latest notifications" action={<Link href="/portal/notifications" className="text-sm font-medium text-brand-600 hover:underline">See all</Link>} />
          <div className="p-5">
            {!notifications ? (
              <div className="skeleton h-16 rounded-xl" />
            ) : notifications.length === 0 ? (
              <EmptyState icon={<Bell className="size-5" />} title="No notifications yet" />
            ) : (
              <ul className="space-y-3">
                {notifications.map((n) => (
                  <li key={n._id} className="flex gap-3">
                    <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.readAt ? "bg-gray-200" : "bg-brand-600"}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">{n.title}</p>
                      <p className="truncate text-xs text-ink-500">{n.body}</p>
                      <p className="text-[11px] text-ink-300">{timeAgo(n.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Delivery history" description="Each delivery resets your gas estimate." />
        <div className="p-5">
          {!deliveries ? (
            <div className="skeleton h-16 rounded-xl" />
          ) : deliveries.length === 0 ? (
            <EmptyState icon={<Truck className="size-5" />} title="No deliveries recorded yet" description="Your first delivery will appear here." />
          ) : (
            <ul className="divide-y divide-line">
              {deliveries.slice(0, 8).map((d) => (
                <li key={d._id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-9 place-items-center rounded-lg bg-green-50 text-green-600"><Truck className="size-4" /></span>
                    <div>
                      <p className="text-sm font-medium text-ink">{d.quantity} x {d.tankSize}</p>
                      <p className="text-xs text-ink-500">{formatDate(d.deliveredAt)}{d.notes ? ` · ${d.notes}` : ""}</p>
                    </div>
                  </div>
                  {d.amount != null && <Badge tone="neutral">₱{d.amount.toLocaleString()}</Badge>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
