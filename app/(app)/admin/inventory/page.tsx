"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { ArrowDownToLine, Banknote, Boxes, ClipboardCheck, PackagePlus, Tag, TrendingUp } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useSession } from "@/components/providers/SessionProvider";
import { PageHeader } from "@/components/shell/AppShell";
import { Badge, Button, Card, CardHeader, EmptyState, Field, Input, Select, StatCard } from "@/components/ui";
import { Modal } from "@/components/Modal";
import { errorText, useToast } from "@/components/Toast";
import { formatDate, timeAgo } from "@/lib/gas";

type Tank = "11kg" | "2.7kg";
type Range = "today" | "week" | "month" | "year" | "all";

const peso = (n: number) => `₱${n.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
const RANGES: { key: Range; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "7 days" },
  { key: "month", label: "This month" },
  { key: "year", label: "This year" },
  { key: "all", label: "All time" },
];

export default function InventoryPage() {
  const { token } = useSession();
  const data = useQuery(api.inventory.overview, { token });
  const [range, setRange] = useState<Range>("month");
  const sales = useQuery(api.inventory.salesList, { token, range });
  const [modal, setModal] = useState<null | { kind: "restock" | "adjust" | "price"; tank: Tank }>(null);

  const totals = data?.sales[range];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory & Sales"
        description="Tanks on hand, prices, and how much you have sold."
        action={
          <Button size="sm" onClick={() => setModal({ kind: "restock", tank: "11kg" })}>
            <PackagePlus className="size-4" /> Restock
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Total sales (all time)" value={data ? peso(data.sales.all.revenue) : "—"} icon={<Banknote className="size-4" />} tone="green" sub={data ? `${data.sales.all.tanks} tanks delivered` : undefined} />
        <StatCard label="Sales this month" value={data ? peso(data.sales.month.revenue) : "—"} icon={<TrendingUp className="size-4" />} tone="blue" sub={data ? `Today: ${peso(data.sales.today.revenue)}` : undefined} />
        {data?.stock.map((s) => (
          <StatCard
            key={s.tankSize}
            label={`${s.tankSize} tanks on hand`}
            value={s.onHand}
            icon={<Boxes className="size-4" />}
            tone={s.onHand <= 0 ? "red" : s.low ? "amber" : "blue"}
            sub={s.onHand <= 0 ? "Out of stock" : s.low ? `Low stock (≤ ${data.lowStockAt})` : s.price != null ? `Selling at ${peso(s.price)}` : "No price set"}
          />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-5">
        {/* Stock */}
        <Card className="xl:col-span-2">
          <CardHeader title="Stock" description="Every delivery you record takes tanks out automatically." />
          {!data ? (
            <div className="p-5"><div className="skeleton h-24 rounded-xl" /></div>
          ) : (
            <ul className="divide-y divide-line">
              {data.stock.map((s) => (
                <li key={s.tankSize} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="text-lg font-bold text-ink">
                      {s.tankSize} <span className="text-sm font-medium text-ink-500">· {s.onHand} on hand</span>
                    </p>
                    <p className="text-xs text-ink-500">{s.price != null ? `Price ${peso(s.price)} each` : "Set a price so sales are counted automatically"}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setModal({ kind: "restock", tank: s.tankSize })}><ArrowDownToLine className="size-4" /> Stock in</Button>
                    <Button size="sm" variant="ghost" onClick={() => setModal({ kind: "adjust", tank: s.tankSize })}><ClipboardCheck className="size-4" /> Count</Button>
                    <Button size="sm" variant="ghost" onClick={() => setModal({ kind: "price", tank: s.tankSize })}><Tag className="size-4" /> Price</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {data && data.unpriced > 0 && (
            <p className="border-t border-line px-5 py-3 text-xs text-amber-700">
              {data.unpriced} past deliver{data.unpriced === 1 ? "y has" : "ies have"} no amount, so they count as tanks but not as ₱ sales.
            </p>
          )}
        </Card>

        {/* Sales */}
        <Card className="xl:col-span-3">
          <CardHeader
            title="Sales"
            action={
              <div className="flex flex-wrap gap-1 rounded-xl bg-surface-2 p-1">
                {RANGES.map((r) => (
                  <button key={r.key} onClick={() => setRange(r.key)} className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${range === r.key ? "bg-white text-brand-700 shadow-card" : "text-ink-500 hover:text-ink"}`}>
                    {r.label}
                  </button>
                ))}
              </div>
            }
          />
          <div className="grid grid-cols-3 gap-3 px-5 pt-4">
            <Mini label="Revenue" value={totals ? peso(totals.revenue) : "—"} />
            <Mini label="Tanks sold" value={totals ? String(totals.tanks) : "—"} />
            <Mini label="Deliveries" value={totals ? String(totals.deliveries) : "—"} />
          </div>
          {totals && (
            <div className="flex flex-wrap gap-2 px-5 pt-3 text-xs text-ink-500">
              <Badge tone="blue">11kg · {totals.byTank["11kg"].tanks} tanks · {peso(totals.byTank["11kg"].revenue)}</Badge>
              <Badge tone="neutral">2.7kg · {totals.byTank["2.7kg"].tanks} tanks · {peso(totals.byTank["2.7kg"].revenue)}</Badge>
            </div>
          )}
          {data && <DailyBars daily={data.daily} />}
          <div className="mt-2 border-t border-line">
            {!sales ? (
              <div className="p-5"><div className="skeleton h-20 rounded-xl" /></div>
            ) : sales.length === 0 ? (
              <div className="p-5"><EmptyState icon={<Banknote className="size-5" />} title="No sales in this period" description="Deliveries you record appear here with their amount." /></div>
            ) : (
              <ul className="max-h-[420px] divide-y divide-line overflow-y-auto">
                {sales.map((d) => (
                  <li key={d._id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                    <div className="min-w-0">
                      <Link href={`/admin/clients/${d.clientId}`} className="font-medium text-ink hover:text-brand-600">{d.clientName}</Link>
                      <p className="text-xs text-ink-500">{formatDate(d.deliveredAt, true)} · {d.quantity} x {d.tankSize}</p>
                    </div>
                    <span className={`font-semibold ${d.amount != null ? "text-ink" : "text-ink-300"}`}>{d.amount != null ? peso(d.amount) : "no amount"}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      {/* Movements */}
      <Card>
        <CardHeader title="Stock movements" description="Stock in, sales out, and count corrections." />
        {!data ? (
          <div className="p-5"><div className="skeleton h-16 rounded-xl" /></div>
        ) : data.movements.length === 0 ? (
          <div className="p-5"><EmptyState icon={<Boxes className="size-5" />} title="No movements yet" description="Tap Restock to add your first tanks." /></div>
        ) : (
          <ul className="divide-y divide-line">
            {data.movements.map((m) => (
              <li key={m._id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                <div className="flex items-center gap-3">
                  <Badge tone={m.kind === "restock" ? "green" : m.kind === "sale" ? "blue" : "amber"}>{m.kind}</Badge>
                  <span className="text-ink">{m.tankSize}</span>
                  {m.note && <span className="text-xs text-ink-500">· {m.note}</span>}
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${m.delta >= 0 ? "text-green-700" : "text-ink"}`}>{m.delta >= 0 ? `+${m.delta}` : m.delta}</p>
                  <p className="text-[11px] text-ink-300">{timeAgo(m.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.kind === "restock" ? "Stock in" : modal?.kind === "adjust" ? "Physical count" : "Set price"}>
        {modal && data && <StockForm kind={modal.kind} tank={modal.tank} current={data.stock.find((s) => s.tankSize === modal.tank)} onDone={() => setModal(null)} />}
      </Modal>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-ink-500">{label}</p>
      <p className="text-lg font-bold text-ink">{value}</p>
    </div>
  );
}

/** Last 30 days of revenue as simple bars. */
function DailyBars({ daily }: { daily: { day: number; revenue: number; tanks: number }[] }) {
  const max = Math.max(1, ...daily.map((d) => d.revenue));
  if (daily.every((d) => d.revenue === 0 && d.tanks === 0)) return null;
  return (
    <div className="px-5 pt-4">
      <p className="mb-1 text-[11px] uppercase tracking-wide text-ink-500">Last 30 days</p>
      <div className="flex h-16 items-end gap-[3px]">
        {daily.map((d) => (
          <div key={d.day} className="group relative flex-1">
            <div className="w-full rounded-t bg-brand-600/80 transition group-hover:bg-brand-600" style={{ height: `${Math.max(d.revenue > 0 ? 6 : 2, (d.revenue / max) * 64)}px` }} />
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[10px] text-white group-hover:block">
              {formatDate(d.day)} · {peso(d.revenue)} · {d.tanks} tank{d.tanks === 1 ? "" : "s"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StockForm({ kind, tank: initialTank, current, onDone }: { kind: "restock" | "adjust" | "price"; tank: Tank; current?: { onHand: number; price: number | null }; onDone: () => void }) {
  const { token } = useSession();
  const toast = useToast();
  const restock = useMutation(api.inventory.restock);
  const adjust = useMutation(api.inventory.adjust);
  const setPrice = useMutation(api.inventory.setPrice);
  const [tank, setTank] = useState<Tank>(initialTank);
  const [value, setValue] = useState(kind === "adjust" ? String(current?.onHand ?? 0) : kind === "price" ? String(current?.price ?? "") : "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(value);
    if (!Number.isFinite(n)) return toast("Enter a number.", "error");
    setBusy(true);
    try {
      if (kind === "restock") {
        await restock({ token, tankSize: tank, quantity: n, note: note || undefined });
        toast(`Added ${n} x ${tank} to stock.`);
      } else if (kind === "adjust") {
        await adjust({ token, tankSize: tank, onHand: n, note: note || undefined });
        toast(`${tank} stock set to ${n}.`);
      } else {
        await setPrice({ token, tankSize: tank, price: n });
        toast(`${tank} price set to ${peso(n)}.`);
      }
      onDone();
    } catch (err) {
      toast(errorText(err), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Tank size">
        <Select value={tank} onChange={(e) => setTank(e.target.value as Tank)}>
          <option value="11kg">11 kg</option>
          <option value="2.7kg">2.7 kg</option>
        </Select>
      </Field>
      <Field label={kind === "restock" ? "Tanks received" : kind === "adjust" ? "Tanks actually on hand" : "Selling price (₱ per tank)"}>
        <Input type="number" min={0} step={kind === "price" ? "0.01" : "1"} value={value} onChange={(e) => setValue(e.target.value)} required autoFocus placeholder={kind === "price" ? "e.g. 950" : "e.g. 20"} />
      </Field>
      {kind !== "price" && (
        <Field label="Note (optional)">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={kind === "restock" ? "e.g. from Petron depot, OR #1234" : "e.g. monthly count"} />
        </Field>
      )}
      <Button type="submit" loading={busy} className="w-full">
        {kind === "restock" ? "Add to stock" : kind === "adjust" ? "Save count" : "Save price"}
      </Button>
    </form>
  );
}
