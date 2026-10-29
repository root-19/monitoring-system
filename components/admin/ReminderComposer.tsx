"use client";

import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { Send, Users } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useSession, type SessionUser } from "@/components/providers/SessionProvider";
import { Button, cn, Field, Input, Textarea } from "@/components/ui";
import { errorText, useToast } from "@/components/Toast";
import { estimateGas } from "@/lib/gas";

const templates = [
  {
    key: "low",
    label: "Low gas reminder",
    title: "Your gas may be running low",
    body: "Hi {name}! Based on your last delivery, your {tank} tank may be running low. Reply or call 0998 586 1976 to schedule a refill. - Fiesta Gas PGI",
    type: "low_gas" as const,
  },
  {
    key: "sched",
    label: "Delivery schedule",
    title: "Delivery schedule",
    body: "Hi {name}! Your LPG delivery is scheduled tomorrow. Please keep your empty tank ready. Thank you! - Fiesta Gas PGI",
    type: "reminder" as const,
  },
  {
    key: "announce",
    label: "Announcement / promo",
    title: "Announcement from Fiesta Gas PGI",
    body: "Hi {name}! {message} - Fiesta Gas PGI",
    type: "system" as const,
  },
];

type Audience = "custom" | "low" | "all";

export function ReminderComposer({ clients, preselected = [], onSent }: { clients: SessionUser[]; preselected?: Id<"users">[]; onSent?: () => void }) {
  const { token } = useSession();
  const toast = useToast();
  const send = useMutation(api.notifications.sendReminder);

  const [audience, setAudience] = useState<Audience>(preselected.length ? "custom" : "low");
  const [picked, setPicked] = useState<Set<string>>(new Set(preselected));
  const [search, setSearch] = useState("");
  const [tpl, setTpl] = useState(templates[0]);
  const [title, setTitle] = useState(templates[0].title);
  const [body, setBody] = useState(templates[0].body);
  const [sms, setSms] = useState(true);
  const [busy, setBusy] = useState(false);

  const lowClients = useMemo(
    () => clients.filter((c) => ["low", "critical", "empty"].includes(estimateGas(c.lastDeliveryAt, c.avgDaysPerTank, c.tankSize).status)),
    [clients]
  );
  const targets = audience === "all" ? clients : audience === "low" ? lowClients : clients.filter((c) => picked.has(c._id));
  const filtered = clients.filter((c) => (c.name + c.phone + (c.address ?? "")).toLowerCase().includes(search.toLowerCase()));

  function applyTemplate(t: (typeof templates)[number]) {
    setTpl(t);
    setTitle(t.title);
    setBody(t.body);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (targets.length === 0) return toast("Choose at least one client.", "error");
    if (!title.trim() || !body.trim()) return toast("Title and message are required.", "error");
    // Everything in braces except {name}/{tank} is a placeholder the admin still has to replace.
    const leftover = body.replaceAll("{name}", "").replaceAll("{tank}", "").match(/\{[^}]*\}/);
    if (leftover) return toast(`Replace ${leftover[0]} with your actual text before sending.`, "error");
    setBusy(true);
    try {
      // Personalise per client ({name}, {tank}) so SMS text is ready to copy.
      let count = 0;
      for (const c of targets) {
        const text = body.replaceAll("{name}", c.name.split(" ")[0]).replaceAll("{tank}", c.tankSize ?? "LPG");
        await send({ token, clientIds: [c._id], title, body: text, type: tpl.type, sms });
        count++;
      }
      toast(`Reminder sent to ${count} client(s).${sms ? " Open the SMS outbox to text them." : ""}`);
      onSent?.();
    } catch (err) {
      toast(errorText(err), "error");
    } finally {
      setBusy(false);
    }
  }

  const preview = targets[0]
    ? body.replaceAll("{name}", targets[0].name.split(" ")[0]).replaceAll("{tank}", targets[0].tankSize ?? "LPG")
    : body;

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <span className="mb-1.5 block text-sm font-medium text-ink-700">Send to</span>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["low", `Low gas (${lowClients.length})`],
              ["all", `All clients (${clients.length})`],
              ["custom", `Choose (${picked.size})`],
            ] as Array<[Audience, string]>
          ).map(([v, label]) => (
            <button type="button" key={v} onClick={() => setAudience(v)} className={cn("rounded-xl border px-3 py-2.5 text-sm font-medium transition", audience === v ? "border-brand-500 bg-brand-50 text-brand-700 ring-4 ring-brand-100" : "border-line hover:bg-surface-2")}>
              {label}
            </button>
          ))}
        </div>
        {audience === "custom" && (
          <div className="mt-3 rounded-xl border border-line">
            <div className="border-b border-line p-2">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search client…" className="h-9 text-sm" />
            </div>
            <ul className="max-h-48 overflow-y-auto p-1">
              {filtered.map((c) => (
                <li key={c._id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2">
                    <input
                      type="checkbox"
                      className="size-4 accent-brand-600"
                      checked={picked.has(c._id)}
                      onChange={(e) => {
                        const n = new Set(picked);
                        if (e.target.checked) n.add(c._id);
                        else n.delete(c._id);
                        setPicked(n);
                      }}
                    />
                    <span className="flex-1">{c.name}</span>
                    <span className="text-xs text-ink-500">{c.phone}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-ink-700">Template</span>
        <div className="flex flex-wrap gap-2">
          {templates.map((t) => (
            <button type="button" key={t.key} onClick={() => applyTemplate(t)} className={cn("rounded-full border px-3 py-1.5 text-xs font-medium transition", tpl.key === t.key ? "border-brand-500 bg-brand-600 text-white" : "border-line hover:bg-surface-2")}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <Field label="Title (shown in the app)">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </Field>
      <Field label="Message" hint="Use {name} and {tank} to personalise. Keep under 160 characters for one SMS.">
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} required />
      </Field>
      <div className="rounded-xl bg-surface-2 p-3 text-xs text-ink-700">
        <p className="mb-1 font-semibold text-ink-500">Preview ({preview.length} chars)</p>
        {preview}
      </div>

      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input type="checkbox" checked={sms} onChange={(e) => setSms(e.target.checked)} className="size-4 accent-brand-600" />
        Also send by SMS (adds to the outbox so you can text from your phone)
      </label>

      <Button type="submit" loading={busy} className="w-full" size="lg">
        <Send className="size-4" /> Send to {targets.length} client{targets.length === 1 ? "" : "s"}
        <Users className="ml-1 size-4 opacity-70" />
      </Button>
    </form>
  );
}
