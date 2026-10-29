"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { MapPin, Phone, Search, UserPlus, Users } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useSession } from "@/components/providers/SessionProvider";
import { PageHeader } from "@/components/shell/AppShell";
import { Badge, ButtonLink, Card, cn, EmptyState, Input } from "@/components/ui";
import { GasBadge } from "@/components/StatusBadges";
import { LevelBar } from "@/components/GasGauge";
import { estimateGas, formatDate, formatPhone } from "@/lib/gas";

type Filter = "all" | "attention" | "unknown";

export default function ClientsPage() {
  const { token } = useSession();
  const clients = useQuery(api.users.listClients, { token });
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const rows = useMemo(() => {
    if (!clients) return [];
    return clients
      .map((c) => ({ c, est: estimateGas(c.lastDeliveryAt, c.avgDaysPerTank, c.tankSize) }))
      .filter(({ c, est }) => {
        const hay = `${c.name} ${c.phone} ${c.address ?? ""} ${c.landmark ?? ""}`.toLowerCase();
        if (q && !hay.includes(q.toLowerCase())) return false;
        if (filter === "attention") return est.status !== "ok" && est.status !== "unknown";
        if (filter === "unknown") return est.status === "unknown";
        return true;
      })
      .sort((a, b) => (a.est.pct ?? 2) - (b.est.pct ?? 2));
  }, [clients, q, filter]);

  return (
    <div className="space-y-5">
      <PageHeader title="Clients" description="Everyone who gets gas from Fiesta Gas PGI." action={<ButtonLink href="/admin/clients/new" size="sm"><UserPlus className="size-4" /> Add client</ButtonLink>} />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-300" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, number, address…" className="pl-9" />
        </div>
        {(
          [
            ["all", "All"],
            ["attention", "Low gas"],
            ["unknown", "No delivery yet"],
          ] as Array<[Filter, string]>
        ).map(([v, label]) => (
          <button key={v} onClick={() => setFilter(v)} className={cn("h-11 rounded-xl border px-4 text-sm font-medium transition", filter === v ? "border-brand-500 bg-brand-50 text-brand-700" : "border-line bg-white hover:bg-surface-2")}>
            {label}
          </button>
        ))}
      </div>

      <Card>
        {!clients ? (
          <div className="p-5"><div className="skeleton h-24 rounded-xl" /></div>
        ) : rows.length === 0 ? (
          <div className="p-5">
            <EmptyState icon={<Users className="size-5" />} title={clients.length === 0 ? "No clients yet" : "No matches"} description={clients.length === 0 ? "Add your first client to start tracking their gas." : "Try another search or filter."} action={clients.length === 0 ? <ButtonLink href="/admin/clients/new" size="sm">Add client</ButtonLink> : undefined} />
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map(({ c, est }) => (
              <li key={c._id}>
                <Link href={`/admin/clients/${c._id}`} className="grid gap-3 px-5 py-4 transition hover:bg-surface-2 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ink">{c.name}</p>
                      <GasBadge status={est.status} label={est.label} />
                      {c.tankSize && <Badge tone="neutral">{c.tankSize}</Badge>}
                      {!c.isActive && <Badge tone="red">Inactive</Badge>}
                    </div>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-ink-500">
                      <span className="inline-flex items-center gap-1"><Phone className="size-3" /> {formatPhone(c.phone)}</span>
                      <span className="inline-flex items-center gap-1"><MapPin className="size-3" /> {c.address ?? "No address"}{c.lat != null ? " · pinned" : ""}</span>
                    </p>
                    <div className="mt-2 max-w-xs"><LevelBar pct={est.pct} status={est.status} /></div>
                  </div>
                  <div className="text-right text-xs text-ink-500">
                    <p>Last delivery</p>
                    <p className="font-medium text-ink">{c.lastDeliveryAt ? formatDate(c.lastDeliveryAt) : "—"}</p>
                    {est.daysLeft != null && <p className="mt-1">~{Math.round(est.daysLeft)} day(s) left</p>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
