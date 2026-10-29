"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { AlertTriangle, ArrowRight, Banknote, ClipboardList, Flame, MessageSquareText, Phone, Send, Truck, Users } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useSession } from "@/components/providers/SessionProvider";
import { PageHeader } from "@/components/shell/AppShell";
import { Button, ButtonLink, Card, CardHeader, EmptyState, StatCard } from "@/components/ui";
import { GasBadge, RequestStatusBadge } from "@/components/StatusBadges";
import { Modal } from "@/components/Modal";
import { RecordDeliveryForm } from "@/components/admin/RecordDeliveryForm";
import { ReminderComposer } from "@/components/admin/ReminderComposer";
import { estimateGas, formatDate, formatPhone } from "@/lib/gas";

export default function AdminDashboard() {
  const { token } = useSession();
  const summary = useQuery(api.dashboard.summary, { token });
  const requests = useQuery(api.requests.listAll, { token, status: "pending" });
  const [deliverFor, setDeliverFor] = useState<Id<"users"> | null>(null);
  const [remindFor, setRemindFor] = useState<Id<"users">[] | null>(null);

  const ranked = useMemo(() => {
    if (!summary) return [];
    return summary.clients
      .map((c) => ({ c, est: estimateGas(c.lastDeliveryAt, c.avgDaysPerTank, c.tankSize) }))
      .filter((x) => x.est.status !== "unknown")
      .sort((a, b) => (a.est.pct ?? 1) - (b.est.pct ?? 1));
  }, [summary]);
  const attention = ranked.filter((x) => x.est.status !== "ok");

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="What needs your attention today." action={<ButtonLink href="/admin/clients/new" size="sm">+ Add client</ButtonLink>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Clients" value={summary?.clients.length ?? "—"} icon={<Users className="size-4" />} />
        <StatCard label="Low on gas" value={attention.length} icon={<Flame className="size-4" />} tone={attention.length ? "red" : "green"} sub="Based on last delivery & usage" />
        <StatCard label="Pending requests" value={summary?.pendingRequests ?? "—"} icon={<ClipboardList className="size-4" />} tone="amber" />
        <StatCard label="SMS to send" value={summary?.smsPending ?? "—"} icon={<Send className="size-4" />} tone="blue" sub="Waiting in the outbox" />
        <Link href="/admin/inventory" className="block">
          <StatCard
            label="Sales this month"
            value={summary ? `₱${summary.salesMonth.toLocaleString("en-PH", { maximumFractionDigits: 0 })}` : "—"}
            icon={<Banknote className="size-4" />}
            tone={summary?.lowStock.length ? "amber" : "green"}
            sub={summary ? (summary.lowStock.length ? `Low stock: ${summary.lowStock.join(", ")}` : `All time ₱${summary.salesAll.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`) : undefined}
          />
        </Link>
      </div>

      <div className="grid gap-5 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader
            title="Needs attention"
            description="Clients whose gas is low, almost empty, or likely empty."
            action={
              attention.length > 0 ? (
                <Button size="sm" variant="secondary" onClick={() => setRemindFor(attention.map((x) => x.c._id))}>
                  <Send className="size-4" /> Remind all
                </Button>
              ) : undefined
            }
          />
          <div className="p-4">
            {!summary ? (
              <div className="skeleton h-20 rounded-xl" />
            ) : attention.length === 0 ? (
              <EmptyState icon={<AlertTriangle className="size-5" />} title="Everyone has enough gas" description="Nice! Clients with low gas will show up here automatically." />
            ) : (
              <ul className="divide-y divide-line">
                {attention.map(({ c, est }) => (
                  <li key={c._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <Link href={`/admin/clients/${c._id}`} className="font-medium text-ink hover:text-brand-600">
                        {c.name}
                      </Link>
                      <p className="truncate text-xs text-ink-500">
                        {c.tankSize} · last delivery {c.lastDeliveryAt ? formatDate(c.lastDeliveryAt) : "—"} · {c.address}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <GasBadge status={est.status} label={est.label} />
                      <a href={`tel:${c.phone}`} className="grid size-9 place-items-center rounded-lg border border-line text-ink-700 hover:bg-surface-2" title={formatPhone(c.phone)}>
                        <Phone className="size-4" />
                      </a>
                      <Button size="sm" variant="outline" onClick={() => setRemindFor([c._id])}>
                        <Send className="size-4" /> Remind
                      </Button>
                      <Button size="sm" onClick={() => setDeliverFor(c._id)}>
                        <Truck className="size-4" /> Delivered
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="New requests" action={<Link href="/admin/requests" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">All requests <ArrowRight className="size-3.5" /></Link>} />
          <div className="p-4">
            {!requests ? (
              <div className="skeleton h-20 rounded-xl" />
            ) : requests.length === 0 ? (
              <EmptyState icon={<ClipboardList className="size-5" />} title="No pending requests" />
            ) : (
              <ul className="space-y-3">
                {requests.slice(0, 6).map((r) => (
                  <li key={r._id} className="rounded-xl border border-line p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-ink">{r.clientName}</p>
                        <p className="text-xs text-ink-700">{r.type === "refill" ? `Refill · ${r.quantity ?? 1} x ${r.tankSize ?? r.clientTank}` : r.type === "inquiry" ? "Inquiry" : "Request"} — {r.message}</p>
                        <p className="text-[11px] text-ink-300">{formatDate(r.createdAt, true)}</p>
                      </div>
                      <RequestStatusBadge status={r.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/admin/messages" className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-card transition hover:border-brand-300">
          <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-600"><MessageSquareText className="size-5" /></span>
          <div>
            <p className="text-sm font-semibold text-ink">Messages</p>
            <p className="text-xs text-ink-500">{summary?.unreadMessages ?? 0} unread from clients</p>
          </div>
        </Link>
        <Link href="/admin/deliveries" className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-card transition hover:border-brand-300">
          <span className="grid size-10 place-items-center rounded-xl bg-green-50 text-green-600"><Truck className="size-5" /></span>
          <div>
            <p className="text-sm font-semibold text-ink">Deliveries</p>
            <p className="text-xs text-ink-500">{summary?.deliveriesLast30 ?? 0} tanks in the last 30 days</p>
          </div>
        </Link>
        <Link href="/admin/map" className="flex items-center gap-3 rounded-2xl border border-line bg-white p-4 shadow-card transition hover:border-brand-300">
          <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600"><Users className="size-5" /></span>
          <div>
            <p className="text-sm font-semibold text-ink">Client map</p>
            <p className="text-xs text-ink-500">{summary?.clients.filter((c) => c.lat != null).length ?? 0} houses pinned</p>
          </div>
        </Link>
      </div>

      <Modal open={!!deliverFor} onClose={() => setDeliverFor(null)} title="Record a delivery">
        {summary && deliverFor && <RecordDeliveryForm clients={summary.clients} clientId={deliverFor} onDone={() => setDeliverFor(null)} />}
      </Modal>
      <Modal open={!!remindFor} onClose={() => setRemindFor(null)} title="Send a reminder" wide>
        {summary && remindFor && <ReminderComposer clients={summary.clients} preselected={remindFor} onSent={() => setRemindFor(null)} />}
      </Modal>
    </div>
  );
}
