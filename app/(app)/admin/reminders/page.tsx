"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { CheckCheck, Copy, MessageSquareMore, Send, Smartphone } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { useSession } from "@/components/providers/SessionProvider";
import { PageHeader } from "@/components/shell/AppShell";
import { Badge, Button, Card, CardHeader, cn, EmptyState } from "@/components/ui";
import { ReminderComposer } from "@/components/admin/ReminderComposer";
import { errorText, useToast } from "@/components/Toast";
import { formatPhone, timeAgo } from "@/lib/gas";
import { smsLink } from "@/lib/sms";

export default function RemindersPage() {
  const { token } = useSession();
  const toast = useToast();
  const clients = useQuery(api.users.listClients, { token });
  const [tab, setTab] = useState<"pending" | "sent">("pending");
  const outbox = useQuery(api.notifications.smsOutbox, { token, status: tab });
  const markSent = useMutation(api.notifications.markSmsSent);

  async function mark(ids: Parameters<typeof markSent>[0]["ids"]) {
    try {
      await markSent({ token, ids });
      toast(`${ids.length} message(s) marked as sent.`);
    } catch (e) {
      toast(errorText(e), "error");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Reminders & SMS" description="Write a reminder once, send it to many clients. Then text each one from your phone with one tap." />

      <div className="grid gap-5 xl:grid-cols-5">
        <Card className="xl:col-span-2">
          <CardHeader title="Compose reminder" description="Shows in the client's app; optionally queued for SMS." />
          <div className="p-5">{clients ? <ReminderComposer clients={clients} /> : <div className="skeleton h-40 rounded-xl" />}</div>
        </Card>

        <Card className="xl:col-span-3">
          <CardHeader
            title="SMS outbox"
            description="Tap “Open SMS app” on your phone: the number and message are prefilled. Then mark it as sent."
            action={
              tab === "pending" && outbox && outbox.length > 0 ? (
                <Button size="sm" variant="outline" onClick={() => mark(outbox.map((o) => o._id))}>
                  <CheckCheck className="size-4" /> Mark all sent
                </Button>
              ) : undefined
            }
          />
          <div className="flex gap-2 border-b border-line px-5 py-3">
            {(["pending", "sent"] as const).map((v) => (
              <button key={v} onClick={() => setTab(v)} className={cn("rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition", tab === v ? "bg-brand-600 text-white" : "text-ink-700 hover:bg-surface-2")}>
                {v}
              </button>
            ))}
          </div>
          {!outbox ? (
            <div className="p-5"><div className="skeleton h-20 rounded-xl" /></div>
          ) : outbox.length === 0 ? (
            <div className="p-5"><EmptyState icon={<MessageSquareMore className="size-5" />} title={tab === "pending" ? "Nothing waiting to be texted" : "No sent SMS yet"} description={tab === "pending" ? "Reminders, delivery confirmations, and schedules with “send by SMS” will appear here." : undefined} /></div>
          ) : (
            <ul className="divide-y divide-line">
              {outbox.map((o) => (
                <li key={o._id} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-ink">{o.clientName}</p>
                        <span className="text-xs text-ink-500">{formatPhone(o.clientPhone)}</span>
                        <Badge tone={o.smsStatus === "sent" ? "green" : "amber"}>{o.smsStatus === "sent" ? `Sent ${o.smsSentAt ? timeAgo(o.smsSentAt) : ""}` : `Queued ${timeAgo(o.createdAt)}`}</Badge>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap rounded-xl bg-surface-2 p-3 text-sm text-ink-700">{o.body}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a href={smsLink(o.clientPhone, o.body)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white hover:bg-brand-700">
                        <Smartphone className="size-4" /> Open SMS app
                      </a>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(o.body);
                            toast("Message copied.", "info");
                          } catch {
                            toast("Could not copy.", "error");
                          }
                        }}
                      >
                        <Copy className="size-4" /> Copy
                      </Button>
                      {o.smsStatus === "pending" && (
                        <Button size="sm" variant="secondary" onClick={() => mark([o._id])}>
                          <Send className="size-4" /> Mark sent
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
