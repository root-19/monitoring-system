"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { APIProvider, AdvancedMarker, InfoWindow, Map, Pin } from "@vis.gl/react-google-maps";
import { ExternalLink, MapPin, Phone } from "lucide-react";
import { estimateGas, formatPhone, statusColor } from "@/lib/gas";
import type { SessionUser } from "@/components/providers/SessionProvider";
import { Badge, EmptyState } from "@/components/ui";
import { MAPS_KEY, PH_CENTER } from "./LocationPicker";

type Client = SessionUser;

export function statusTone(status: ReturnType<typeof estimateGas>["status"]) {
  return status === "ok" ? "green" : status === "low" ? "amber" : status === "critical" ? "orange" : status === "empty" ? "red" : "neutral";
}

export function ClientsMap({ clients, height = "520px" }: { clients: Client[]; height?: string }) {
  const [active, setActive] = useState<Client | null>(null);
  const pinned = useMemo(() => clients.filter((c) => c.lat != null && c.lng != null), [clients]);

  const center = useMemo(() => {
    if (!pinned.length) return PH_CENTER;
    const lat = pinned.reduce((s, c) => s + (c.lat as number), 0) / pinned.length;
    const lng = pinned.reduce((s, c) => s + (c.lng as number), 0) / pinned.length;
    return { lat, lng };
  }, [pinned]);

  if (!MAPS_KEY) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
          Add <code className="rounded bg-white px-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> in <code className="rounded bg-white px-1">.env.local</code> to see all clients on one Google Map. Meanwhile, each pinned client has an “Open in Google Maps” link below.
        </div>
        {pinned.length === 0 ? (
          <EmptyState icon={<MapPin className="size-5" />} title="No pinned houses yet" description="Add a client and pin their house to see them here." />
        ) : (
          <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
            {pinned.map((c) => {
              const est = estimateGas(c.lastDeliveryAt, c.avgDaysPerTank, c.tankSize);
              return (
                <li key={c._id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="font-medium text-ink">{c.name}</p>
                    <p className="text-xs text-ink-500">{c.address}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={statusTone(est.status)}>{est.label}</Badge>
                    <a href={`https://www.google.com/maps?q=${c.lat},${c.lng}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline">
                      Open in Google Maps <ExternalLink className="size-3" />
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-line" style={{ height }}>
      <APIProvider apiKey={MAPS_KEY}>
        <Map defaultCenter={center} defaultZoom={pinned.length ? 13 : 6} mapId="PGI_CLIENTS" gestureHandling="greedy" style={{ width: "100%", height: "100%" }}>
          {pinned.map((c) => {
            const est = estimateGas(c.lastDeliveryAt, c.avgDaysPerTank, c.tankSize);
            const col = statusColor(est.status).hex;
            return (
              <AdvancedMarker key={c._id} position={{ lat: c.lat as number, lng: c.lng as number }} onClick={() => setActive(c)} title={c.name}>
                <Pin background={col} glyphColor="#fff" borderColor="#0b1220" />
              </AdvancedMarker>
            );
          })}
          {active && active.lat != null && active.lng != null && (
            <InfoWindow position={{ lat: active.lat, lng: active.lng }} onCloseClick={() => setActive(null)} headerDisabled>
              <div className="min-w-[200px] p-1 text-ink">
                <p className="font-semibold">{active.name}</p>
                <p className="text-xs text-ink-500">{active.address}</p>
                {active.landmark && <p className="text-xs text-ink-500">Landmark: {active.landmark}</p>}
                <div className="mt-2 flex items-center gap-2">
                  <Badge tone={statusTone(estimateGas(active.lastDeliveryAt, active.avgDaysPerTank, active.tankSize).status)}>
                    {estimateGas(active.lastDeliveryAt, active.avgDaysPerTank, active.tankSize).label}
                  </Badge>
                  <span className="text-xs text-ink-500">{active.tankSize}</span>
                </div>
                <div className="mt-2 flex gap-3 text-xs font-medium">
                  <a href={`tel:${active.phone}`} className="inline-flex items-center gap-1 text-brand-600">
                    <Phone className="size-3" /> {formatPhone(active.phone)}
                  </a>
                  <Link href={`/admin/clients/${active._id}`} className="text-brand-600 underline">
                    View client
                  </Link>
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${active.lat},${active.lng}`} target="_blank" rel="noreferrer" className="text-brand-600 underline">
                    Directions
                  </a>
                </div>
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>
    </div>
  );
}
