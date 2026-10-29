"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { CalendarClock, Check, ClipboardList, MapPin, Phone, Truck, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { useSession } from "@/components/providers/SessionProvider";
import { PageHeader } from "@/components/shell/AppShell";
import { Button, Card, cn, EmptyState, Field, Input } from "@/components/ui";
import { RequestStatusBadge } from "@/components/StatusBadges";
import { Modal } from "@/components/Modal";
import { RecordDeliveryForm } from "@/components/admin/RecordDeliveryForm";
import { errorText, useToast } from "@/components/Toast";
import { formatDate, formatPhone } from "@/lib/gas";

type Status = Doc<"requests">["status"];
type Tab = "pending" | "accepted" | "scheduled" | "delivered" | "cancelled" | "all";

export default function RequestsPage() {
  const { token } = useSession();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("pending");
  const requests = useQuery(api.requests.listAll, { token, status: tab === "all" ? undefined : tab });
  const clients = useQuery(api.users.listClients, { token });
  const update = useMutation(api.requests.updateStatus);

  const [schedFor, setSchedFor] = useState<(typeof requests extends (infer T)[] | undefined ? T : never) | null>(null);
  const [schedAt, setSchedAt] = useState("");
  const [note, setNote] = useState("");
  const [sms, setSms] = useState(true);
  const [deliverFor, setDeliverFor] = useState<(typeof requests extends (infer T)[] | undefined ? T : never) | null>(null);

  async function setStatus(id: Id<"requests">, status: Status, extra?: { scheduledAt?: number; adminNote?: string; sendSms?: boolean }) {
    try {
      await update({ token, requestId: id, status, ...extra });
      toast(`Request marked as ${status}.${extra?.sendSms ? " SMS added to the outbox." : ""}`);
    } catch (e) {
      toast(errorText(e), "error");
    }
  }

  const tabs: Array<[Tab, string]> = [
    ["pending", "Pending"],
    ["accepted", "Accepted"],
    ["scheduled", "Scheduled"],
    ["delivered", "Delivered"],
    ["cancelled", "Cancelled"],
    ["all", "All"],
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Requests & inquiries" description="Refill requests and questions from clients. Accept, schedule, then record the delivery." />
      <div className="flex flex-wrap gap-2">
        {tabs.map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} className={cn("rounded-xl border px-4 py-2 text-sm font-medium transition", tab === v ? "border-brand-500 bg-brand-50 text-brand-700" : "border-line bg-white hover:bg-surface-2")}>
            {l}
          </button>
        ))}
      </div>

      {!requests ? (
        <div className="skeleton h-28 rounded-2xl" />
      ) : requests.length === 0 ? (
        <Card className="p-5"><EmptyState icon={<ClipboardList className="size-5" />} title={`No ${tab === "all" ? "" : tab} requests`} /></Card>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r._id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/clients/${r.clientId}`} className="font-semibold text-ink hover:text-brand-600">{r.clientName}</Link>
                    <RequestStatusBadge status={r.status} />
                    <span className="text-xs text-ink-300">{formatDate(r.createdAt, true)}</span>
                  </div>
                  <p className="mt-1 text-sm text-ink">
                    <span className="font-medium">{r.type === "refill" ? `Refill · ${r.quantity ?? 1} x ${r.tankSize ?? r.clientTank ?? "tank"}` : r.type === "inquiry" ? "Inquiry" : "Request"}</span>
                    {r.message && <> — {r.message}</>}
                  </p>
                  <p className="mt-1 flex flex-wrap gap-x-3 text-xs text-ink-500">
                    <a href={`tel:${r.clientPhone}`} className="inline-flex items-center gap-1 hover:text-brand-600"><Phone className="size-3" /> {formatPhone(r.clientPhone)}</a>
                    <span className="inline-flex items-center gap-1"><MapPin className="size-3" /> {r.clientAddress || "No address"}</span>
                  </p>
                  {r.scheduledAt && <p className="mt-1 text-xs font-medium text-brand-700">Scheduled: {formatDate(r.scheduledAt, true)}</p>}
                  {r.adminNote && <p className="mt-1 text-xs text-ink-700">Note: {r.adminNote}</p>}
                </div>

                {(r.status === "pending" || r.status === "accepted" || r.status === "scheduled") && (
                  <div className="flex flex-wrap gap-2">
                    {r.status === "pending" && (
                      <Button size="sm" variant="secondary" onClick={() => setStatus(r._id, "accepted", { sendSms: true })}>
                        <Check className="size-4" /> Accept
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => { setSchedFor(r); setSchedAt(""); setNote(""); setSms(true); }}>
                      <CalendarClock className="size-4" /> Schedule
                    </Button>
                    {r.type === "refill" && (
                      <Button size="sm" onClick={() => setDeliverFor(r)}>
                        <Truck className="size-4" /> Delivered
                      </Button>
                    )}
                    {r.type !== "refill" && (
                      <Button size="sm" onClick={() => setStatus(r._id, "delivered", { sendSms: false })}>
                        <Check className="size-4" /> Resolved
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => { if (confirm("Cancel this request?")) setStatus(r._id, "cancelled", { sendSms: true }); }}>
                      <X className="size-4" /> Cancel
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!schedFor} onClose={() => setSchedFor(null)} title={`Schedule delivery for ${schedFor?.clientName ?? ""}`}>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!schedFor || !schedAt) return;
            await setStatus(schedFor._id, "scheduled", { scheduledAt: new Date(schedAt).getTime(), adminNote: note || undefined, sendSms: sms });
            setSchedFor(null);
          }}
          className="space-y-4"
        >
          <Field label="Delivery date & time">
            <Input type="datetime-local" value={schedAt} onChange={(e) => setSchedAt(e.target.value)} required />
          </Field>
          <Field label="Note to client (optional)">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Please prepare the empty tank." />
          </Field>
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" checked={sms} onChange={(e) => setSms(e.target.checked)} className="size-4 accent-brand-600" /> Notify by SMS too
          </label>
          <Button type="submit" className="w-full"><CalendarClock className="size-4" /> Save schedule</Button>
        </form>
      </Modal>

      <Modal open={!!deliverFor} onClose={() => setDeliverFor(null)} title={`Record delivery for ${deliverFor?.clientName ?? ""}`}>
        {deliverFor && clients && (
          <RecordDeliveryForm clients={clients} clientId={deliverFor.clientId} requestId={deliverFor._id} defaultTank={deliverFor.tankSize ?? deliverFor.clientTank} defaultQty={deliverFor.quantity ?? 1} onDone={() => setDeliverFor(null)} />
        )}
      </Modal>
    </div>
  );
}
