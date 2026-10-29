"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { HelpCircle, PackagePlus, Send, XCircle } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useSession } from "@/components/providers/SessionProvider";
import { PageHeader } from "@/components/shell/AppShell";
import { Button, Card, CardHeader, cn, EmptyState, Field, Input, Textarea } from "@/components/ui";
import { TankSizePicker } from "@/components/TankSizePicker";
import { RequestStatusBadge } from "@/components/StatusBadges";
import { errorText, useToast } from "@/components/Toast";
import { formatDate } from "@/lib/gas";

type Kind = "refill" | "inquiry" | "other";

export default function RequestPage() {
  const { token, user } = useSession();
  const toast = useToast();
  const create = useMutation(api.requests.create);
  const cancel = useMutation(api.requests.cancelMine);
  const requests = useQuery(api.requests.listMine, { token });

  const [kind, setKind] = useState<Kind>("refill");
  const [tank, setTank] = useState<"11kg" | "2.7kg">(user.tankSize ?? "11kg");
  const [qty, setQty] = useState(1);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await create({
        token,
        type: kind,
        message: message.trim() || (kind === "refill" ? "Please deliver when available." : ""),
        tankSize: kind === "refill" ? tank : undefined,
        quantity: kind === "refill" ? qty : undefined,
      });
      toast(kind === "refill" ? "Refill request sent! PGI will confirm shortly." : "Message sent to PGI.");
      setMessage("");
    } catch (err) {
      toast(errorText(err), "error");
    } finally {
      setBusy(false);
    }
  }

  const kinds: Array<{ v: Kind; label: string; icon: React.ReactNode }> = [
    { v: "refill", label: "Refill", icon: <PackagePlus className="size-4" /> },
    { v: "inquiry", label: "Inquiry", icon: <HelpCircle className="size-4" /> },
    { v: "other", label: "Other", icon: <Send className="size-4" /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Request refill or send an inquiry" description="We will confirm here and by SMS." />
      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="p-6 lg:col-span-3">
          <form onSubmit={submit} className="space-y-5">
            <div className="grid grid-cols-3 gap-2">
              {kinds.map((k) => (
                <button
                  type="button"
                  key={k.v}
                  onClick={() => setKind(k.v)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition",
                    kind === k.v ? "border-brand-500 bg-brand-50 text-brand-700 ring-4 ring-brand-100" : "border-line hover:bg-surface-2"
                  )}
                >
                  {k.icon} {k.label}
                </button>
              ))}
            </div>

            {kind === "refill" && (
              <>
                <div>
                  <span className="mb-1.5 block text-sm font-medium text-ink-700">Tank size</span>
                  <TankSizePicker value={tank} onChange={setTank} />
                </div>
                <Field label="How many tanks?">
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</Button>
                    <Input type="number" min={1} max={20} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} className="w-20 text-center" />
                    <Button type="button" variant="outline" size="sm" onClick={() => setQty((q) => Math.min(20, q + 1))}>+</Button>
                  </div>
                </Field>
              </>
            )}

            <Field label={kind === "refill" ? "Notes for the rider (optional)" : "Your message"} hint={kind === "refill" ? "e.g. Deliver in the afternoon, call before arriving." : undefined}>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} required={kind !== "refill"} placeholder={kind === "refill" ? "Any instructions…" : "Type your question or concern…"} />
            </Field>

            <div className="rounded-xl bg-surface-2 p-3 text-xs text-ink-500">
              Delivering to: <span className="font-medium text-ink">{user.address ?? "No address on file"}</span>
              {user.landmark && <> · {user.landmark}</>}
            </div>

            <Button type="submit" size="lg" className="w-full" loading={busy}>
              <Send className="size-4" /> {kind === "refill" ? "Send refill request" : "Send"}
            </Button>
          </form>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="My requests" />
          <div className="max-h-[560px] overflow-y-auto p-4">
            {!requests ? (
              <div className="skeleton h-16 rounded-xl" />
            ) : requests.length === 0 ? (
              <EmptyState title="No requests yet" />
            ) : (
              <ul className="space-y-3">
                {requests.map((r) => (
                  <li key={r._id} className="rounded-xl border border-line p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-ink">{r.type === "refill" ? `Refill · ${r.quantity ?? 1} x ${r.tankSize}` : r.type === "inquiry" ? "Inquiry" : "Request"}</p>
                        <p className="text-xs text-ink-500">{r.message}</p>
                        <p className="mt-1 text-[11px] text-ink-300">{formatDate(r.createdAt, true)}</p>
                        {r.scheduledAt && <p className="mt-1 text-xs font-medium text-brand-700">Scheduled: {formatDate(r.scheduledAt, true)}</p>}
                        {r.adminNote && <p className="mt-1 text-xs text-ink-700">PGI: {r.adminNote}</p>}
                      </div>
                      <RequestStatusBadge status={r.status} />
                    </div>
                    {(r.status === "pending" || r.status === "accepted") && (
                      <button
                        onClick={async () => {
                          try {
                            await cancel({ token, requestId: r._id });
                            toast("Request cancelled.", "info");
                          } catch (e) {
                            toast(errorText(e), "error");
                          }
                        }}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-ink-500 hover:text-danger"
                      >
                        <XCircle className="size-3.5" /> Cancel request
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
