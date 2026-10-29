"use client";

import { useQuery } from "convex/react";
import { Bell, Home, MessageSquareText, PackagePlus, UserCircle2 } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { AppShell, type NavItem } from "@/components/shell/AppShell";
import { useSession } from "@/components/providers/SessionProvider";

const items: NavItem[] = [
  { href: "/portal", label: "Home", icon: Home },
  { href: "/portal/request", label: "Request refill", icon: PackagePlus },
  { href: "/portal/messages", label: "Messages", icon: MessageSquareText, badgeKey: "messages" },
  { href: "/portal/notifications", label: "Notifications", icon: Bell, badgeKey: "notifications" },
  { href: "/portal/profile", label: "My profile", icon: UserCircle2 },
];

export function PortalShell({ children }: { children: React.ReactNode }) {
  const { token } = useSession();
  const unreadMsgs = useQuery(api.messages.unreadForClient, { token }) ?? 0;
  return (
    <AppShell items={items} role="client" notificationsHref="/portal/notifications" badges={{ messages: unreadMsgs }}>
      {children}
    </AppShell>
  );
}
