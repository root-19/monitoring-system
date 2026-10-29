"use client";

import { useMutation, useQuery } from "convex/react";
import { Bell, CheckCheck, Flame, MessageSquareText, PackageCheck, Truck, Info } from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { useSession } from "@/components/providers/SessionProvider";
import { PageHeader } from "@/components/shell/AppShell";
import { Badge, Button, Card, cn, EmptyState } from "@/components/ui";
import { timeAgo } from "@/lib/gas";

const icons: Record<Doc<"notifications">["type"], { icon: React.ElementType; cls: string }> = {
  reminder: { icon: Bell, cls: "bg-amber-50 text-amber-600" },
  low_gas: { icon: Flame, cls: "bg-red-50 text-red-600" },
  delivery: { icon: Truck, cls: "bg-green-50 text-green-600" },
  request: { icon: PackageCheck, cls: "bg-brand-50 text-brand-600" },
  message: { icon: MessageSquareText, cls: "bg-blue-50 text-blue-600" },
  system: { icon: Info, cls: "bg-gray-100 text-ink-500" },
};

export function NotificationList({ title = "Notifications", description }: { title?: string; description?: string }) {
  const { token } = useSession();
  const items = useQuery(api.notifications.listMine, { token });
  const markAll = useMutation(api.notifications.markAllRead);
  const markOne = useMutation(api.notifications.markRead);
  const unread = (items ?? []).filter((n) => !n.readAt).length;

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        action={
          unread > 0 ? (
            <Button variant="outline" size="sm" onClick={() => markAll({ token })}>
              <CheckCheck className="size-4" /> Mark all as read
            </Button>
          ) : undefined
        }
      />
      <Card>
        {!items ? (
          <div className="p-5"><div className="skeleton h-16 rounded-xl" /></div>
        ) : items.length === 0 ? (
          <div className="p-5"><EmptyState icon={<Bell className="size-5" />} title="Nothing here yet" /></div>
        ) : (
          <ul className="divide-y divide-line">
            {items.map((n) => {
              const I = icons[n.type];
              return (
                <li key={n._id} onClick={() => !n.readAt && markOne({ token, id: n._id })} className={cn("flex cursor-pointer gap-3 px-5 py-4 transition hover:bg-surface-2", !n.readAt && "bg-brand-50/40")}>
                  <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", I.cls)}>
                    <I.icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className={cn("text-sm text-ink", !n.readAt ? "font-semibold" : "font-medium")}>{n.title}</p>
                      {!n.readAt && <span className="size-2 rounded-full bg-brand-600" />}
                      {n.smsStatus === "sent" && <Badge tone="green">Sent by SMS</Badge>}
                      {n.smsStatus === "pending" && <Badge tone="amber">SMS queued</Badge>}
                    </div>
                    <p className="mt-0.5 text-sm text-ink-700">{n.body}</p>
                    <p className="mt-1 text-xs text-ink-300">{timeAgo(n.createdAt)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
