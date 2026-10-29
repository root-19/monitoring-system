"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { MessageSquareText, Search } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useSession } from "@/components/providers/SessionProvider";
import { PageHeader } from "@/components/shell/AppShell";
import { Card, cn, EmptyState, Input } from "@/components/ui";
import { ChatThread } from "@/components/ChatThread";
import { formatPhone, timeAgo } from "@/lib/gas";

export default function AdminMessagesPage() {
  return (
    <Suspense fallback={null}>
      <Inbox />
    </Suspense>
  );
}

function Inbox() {
  const { token } = useSession();
  const params = useSearchParams();
  const router = useRouter();
  const inbox = useQuery(api.messages.inbox, { token });
  const clients = useQuery(api.users.listClients, { token });
  const [q, setQ] = useState("");
  const selected = (params.get("client") ?? null) as Id<"users"> | null;

  // Merge: conversations first, then clients with no conversation yet (so admin can start one)
  const list = useMemo(() => {
    if (!clients) return [];
    const seen = new Set((inbox ?? []).map((i) => i.clientId));
    const convos = (inbox ?? []).map((i) => ({ id: i.clientId, name: i.clientName, phone: i.clientPhone, preview: i.last.body, at: i.last.createdAt, unread: i.unread }));
    const rest = clients.filter((c) => !seen.has(c._id)).map((c) => ({ id: c._id, name: c.name, phone: c.phone, preview: "", at: 0, unread: 0 }));
    return [...convos, ...rest].filter((x) => (x.name + x.phone).toLowerCase().includes(q.toLowerCase()));
  }, [inbox, clients, q]);

  useEffect(() => {
    if (!selected && list.length && list[0].at) router.replace(`/admin/messages?client=${list[0].id}`);
  }, [selected, list, router]);

  const current = list.find((x) => x.id === selected);

  return (
    <div className="space-y-5">
      <PageHeader title="Messages" description="Chat with clients. They also get a notification for every reply." />
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card className="overflow-hidden">
          <div className="relative border-b border-line p-3">
            <Search className="pointer-events-none absolute left-6 top-1/2 size-4 -translate-y-1/2 text-ink-300" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search client…" className="h-10 pl-9 text-sm" />
          </div>
          <ul className="max-h-[65vh] overflow-y-auto">
            {list.length === 0 && <li className="p-4 text-sm text-ink-500">No clients yet.</li>}
            {list.map((x) => (
              <li key={x.id}>
                <button onClick={() => router.replace(`/admin/messages?client=${x.id}`)} className={cn("flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-surface-2", selected === x.id && "bg-brand-50")}>
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">{x.name.slice(0, 1).toUpperCase()}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className={cn("truncate text-sm", x.unread ? "font-semibold text-ink" : "font-medium text-ink")}>{x.name}</span>
                      {x.at > 0 && <span className="shrink-0 text-[11px] text-ink-300">{timeAgo(x.at)}</span>}
                    </span>
                    <span className="block truncate text-xs text-ink-500">{x.preview || formatPhone(x.phone)}</span>
                  </span>
                  {x.unread > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-brand-600 px-1.5 text-[10px] font-bold text-white">{x.unread}</span>}
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="overflow-hidden">
          {selected && current ? (
            <>
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <div>
                  <p className="font-semibold text-ink">{current.name}</p>
                  <p className="text-xs text-ink-500">{formatPhone(current.phone)}</p>
                </div>
                <a href={`/admin/clients/${current.id}`} className="text-sm font-medium text-brand-600 hover:underline">View client</a>
              </div>
              <ChatThread key={selected} clientId={selected} emptyText="No messages yet. Start the conversation." />
            </>
          ) : (
            <div className="p-6"><EmptyState icon={<MessageSquareText className="size-5" />} title="Pick a client to start chatting" /></div>
          )}
        </Card>
      </div>
    </div>
  );
}
