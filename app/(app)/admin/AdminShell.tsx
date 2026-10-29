"use client";

import { useQuery } from "convex/react";
import { Bell, Boxes, ClipboardList, LayoutDashboard, Map, MessageSquareText, Send, Truck, Users } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { AppShell, type NavItem } from "@/components/shell/AppShell";
import { useSession } from "@/components/providers/SessionProvider";

const items: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/map", label: "Map", icon: Map },
  { href: "/admin/requests", label: "Requests", icon: ClipboardList, badgeKey: "requests" },
  { href: "/admin/deliveries", label: "Deliveries", icon: Truck },
  { href: "/admin/inventory", label: "Inventory & Sales", icon: Boxes },
  { href: "/admin/reminders", label: "Reminders & SMS", icon: Send, badgeKey: "sms" },
  { href: "/admin/messages", label: "Messages", icon: MessageSquareText, badgeKey: "messages" },
  { href: "/admin/notifications", label: "Notifications", icon: Bell, badgeKey: "notifications" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { token, user } = useSession();
  const summary = useQuery(api.dashboard.summary, user.role === "admin" ? { token } : "skip");
  return (
    <AppShell
      items={items}
      role="admin"
      notificationsHref="/admin/notifications"
      badges={{ requests: summary?.pendingRequests ?? 0, sms: summary?.smsPending ?? 0, messages: summary?.unreadMessages ?? 0 }}
    >
      {children}
    </AppShell>
  );
}
