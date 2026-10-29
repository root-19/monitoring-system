"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Truck } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useSession, type SessionUser } from "@/components/providers/SessionProvider";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { errorText, useToast } from "@/components/Toast";

function toLocalInput(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function RecordDeliveryForm({
  clients,
  clientId: initialClient,
  requestId,
  defaultTank,
  defaultQty,
  onDone,
}: {
  clients: SessionUser[];
  clientId?: Id<"users">;
  requestId?: Id<"requests">;
  defaultTank?: "11kg" | "2.7kg";
  defaultQty?: number;
  onDone?: () => void;
}) {
  const { token } = useSession();
  const toast = useToast();
  const record = useMutation(api.deliveries.record);
  const prices = useQuery(api.inventory.prices, { token });
  const [clientId, setClientId] = useState<string>(initialClient ?? "");
  const selected = clients.find((c) => c._id === clientId);
  const [tank, setTank] = useState<"11kg" | "2.7kg">(defaultTank ?? selected?.tankSize ?? "11kg");
  const [qty, setQty] = useState(defaultQty ?? 1);
  const [when, setWhen] = useState(() => toLocalInput(Date.now()));
  const [amount, setAmount] = useState("");
  const [amountTouched, setAmountTouched] = useState(false);
  const unit = prices?.[tank];
  const suggested = unit != null ? unit * qty : null;
  // Pre-fill the amount from the price list until the admin types their own number
  const shownAmount = amountTouched ? amount : suggested != null ? String(suggested) : amount;
  const [notes, setNotes] = useState("");
  const [sms, setSms] = useState(true);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) return toast("Choose a client.", "error");
    setBusy(true);
    try {
      await record({
        token,
        clientId: clientId as Id<"users">,
        deliveredAt: new Date(when).getTime(),
        tankSize: tank,
        quantity: qty,
        amount: shownAmount ? Number(shownAmount) : undefined,
        notes: notes || undefined,
        requestId,
        sendSms: sms,
      });
      toast(sms ? "Delivery recorded. SMS added to the outbox." : "Delivery recorded.");
      onDone?.();
    } catch (err) {
      toast(errorText(err), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Client">
        <Select
          value={clientId}
          onChange={(e) => {
            setClientId(e.target.value);
            const c = clients.find((x) => x._id === e.target.value);
            if (c?.tankSize) setTank(c.tankSize);
          }}
          disabled={!!initialClient}
          required
        >
          <option value="">Choose a client…</option>
          {clients.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name} · {c.phone}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tank size">
          <Select value={tank} onChange={(e) => setTank(e.target.value as "11kg" | "2.7kg")}>
            <option value="11kg">11 kg</option>
            <option value="2.7kg">2.7 kg</option>
          </Select>
        </Field>
        <Field label="Quantity">
          <Input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Delivered on">
          <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} required />
        </Field>
        <Field label="Amount (₱)" hint={suggested != null && !amountTouched ? `From price list: ₱${unit!.toLocaleString()} x ${qty}` : unit == null ? "Set prices in Inventory & Sales to auto-fill." : undefined}>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={shownAmount}
            onChange={(e) => {
              setAmountTouched(true);
              setAmount(e.target.value);
            }}
            placeholder="e.g. 950"
          />
        </Field>
      </div>
      <Field label="Notes (optional)">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[64px]" placeholder="e.g. paid cash, left with helper" />
      </Field>
      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input type="checkbox" checked={sms} onChange={(e) => setSms(e.target.checked)} className="size-4 rounded border-line accent-brand-600" />
        Also send an SMS confirmation to the client (goes to the SMS outbox)
      </label>
      <Button type="submit" loading={busy} className="w-full">
        <Truck className="size-4" /> Save delivery
      </Button>
    </form>
  );
}
