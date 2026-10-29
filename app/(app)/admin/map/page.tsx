"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSession } from "@/components/providers/SessionProvider";
import { PageHeader } from "@/components/shell/AppShell";
import { ClientsMap } from "@/components/maps/ClientsMap";
import { PageLoading } from "@/components/ui";

const legend = [
  ["#16a34a", "Good"],
  ["#f59e0b", "Getting low"],
  ["#ea580c", "Almost empty"],
  ["#dc2626", "Likely empty"],
  ["#9ca3af", "No delivery yet"],
];

export default function MapPage() {
  const { token } = useSession();
  const clients = useQuery(api.users.listClients, { token });
  return (
    <div className="space-y-4">
      <PageHeader title="Client map" description="Every pinned house, colored by gas status. Tap a pin for details and directions." />
      <div className="flex flex-wrap gap-3 text-xs text-ink-700">
        {legend.map(([c, l]) => (
          <span key={l} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1">
            <span className="size-2.5 rounded-full" style={{ background: c }} /> {l}
          </span>
        ))}
        {clients && <span className="ml-auto text-ink-500">{clients.filter((c) => c.lat != null).length} of {clients.length} clients pinned</span>}
      </div>
      {!clients ? <PageLoading /> : <ClientsMap clients={clients} height="calc(100vh - 260px)" />}
    </div>
  );
}
