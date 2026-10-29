"use client";

import { Component, useMemo, type ReactNode } from "react";
import { useQuery } from "convex/react";
import { APIProvider, AdvancedMarker, Map } from "@vis.gl/react-google-maps";
import { motion } from "motion/react";
import { MapPin, Navigation, Users } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { PublicConvexProvider } from "@/components/providers/SessionProvider";
import { ButtonLink } from "@/components/ui";
import { MAPS_KEY, PH_CENTER } from "@/components/maps/LocationPicker";
import { PH_BBOX, PH_H, PH_PATH, PH_W } from "./philippines";

type Pin = { lat: number; lng: number; tank: string };

// Demo pins shown while there are no real pinned customers yet (or backend unreachable).
const DEMO_PINS: Pin[] = [
  { lat: 14.5995, lng: 120.9842, tank: "11kg" }, // Manila
  { lat: 14.676, lng: 121.0437, tank: "2.7kg" }, // Quezon City
  { lat: 16.4023, lng: 120.596, tank: "11kg" }, // Baguio
  { lat: 18.1978, lng: 120.5936, tank: "11kg" }, // Laoag
  { lat: 15.4755, lng: 120.5963, tank: "2.7kg" }, // Tarlac
  { lat: 13.1391, lng: 123.7438, tank: "11kg" }, // Legazpi
  { lat: 10.3157, lng: 123.8854, tank: "11kg" }, // Cebu
  { lat: 10.7202, lng: 122.5621, tank: "2.7kg" }, // Iloilo
  { lat: 11.2442, lng: 125.0039, tank: "11kg" }, // Tacloban
  { lat: 7.1907, lng: 125.4553, tank: "11kg" }, // Davao
  { lat: 8.4542, lng: 124.6319, tank: "2.7kg" }, // Cagayan de Oro
  { lat: 6.9214, lng: 122.079, tank: "11kg" }, // Zamboanga
  { lat: 9.7392, lng: 118.7353, tank: "11kg" }, // Puerto Princesa
];

const reveal = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" as const } },
};

export function CoverageMap() {
  return (
    <PublicConvexProvider>
      <QueryErrorBoundary fallback={<CoverageSection live={null} />}>
        <LiveCoverage />
      </QueryErrorBoundary>
    </PublicConvexProvider>
  );
}

/** Subscribes to the live pins; if the backend lacks the function or is unreachable, the boundary above shows demo pins. */
function LiveCoverage() {
  const live = useQuery(api.publicData.coveragePins, {});
  return <CoverageSection live={live} />;
}

class QueryErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.warn("[CoverageMap] live pins unavailable, showing demo pins:", err);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function CoverageSection({ live }: { live: Pin[] | null | undefined }) {
  const pins = live && live.length > 0 ? live : DEMO_PINS;
  const isDemo = !(live && live.length > 0);

  return (
    <section id="map" className="scroll-mt-20 bg-ink py-20 text-white sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <motion.div variants={reveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-80px" }} className="grid items-end gap-6 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-brand-300">Delivery map</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Every customer, pinned on the map.</h2>
            <p className="mt-3 max-w-lg text-white/70">
              When you sign up, your house is pinned on Google Maps. Our rider sees exactly where to go, and Fiesta Gas PGI can plan the fastest route for the day.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Stat icon={<Users className="size-4" />} value={`${pins.length}${isDemo ? "+" : ""}`} label="customers pinned" />
            <Stat icon={<Navigation className="size-4" />} value="1 tap" label="directions for the rider" />
          </div>
        </motion.div>

        <motion.div variants={reveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} className="relative mt-10 overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl">
          {MAPS_KEY ? <LiveMap pins={pins} /> : <IllustratedMap pins={pins} />}
          <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 rounded-full bg-ink/80 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-brand-400" />
            </span>
            {isDemo ? "Sample coverage preview" : "Live: active customer locations (approximate)"}
          </div>
          <div className="absolute bottom-4 right-4">
            <ButtonLink href="/register" size="sm">
              <MapPin className="size-4" /> Pin my house
            </ButtonLink>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <span className="grid size-9 place-items-center rounded-xl bg-brand-600 text-white">{icon}</span>
      <div>
        <p className="text-lg font-bold leading-tight">{value}</p>
        <p className="text-xs text-white/60">{label}</p>
      </div>
    </div>
  );
}

function LiveMap({ pins }: { pins: Pin[] }) {
  const center = useMemo(() => {
    const lat = pins.reduce((s, p) => s + p.lat, 0) / pins.length;
    const lng = pins.reduce((s, p) => s + p.lng, 0) / pins.length;
    return Number.isFinite(lat) ? { lat, lng } : PH_CENTER;
  }, [pins]);
  return (
    <div className="h-[460px] w-full">
      <APIProvider apiKey={MAPS_KEY}>
        <Map defaultCenter={center} defaultZoom={13} mapId="PGI_COVERAGE" gestureHandling="cooperative" disableDefaultUI zoomControl style={{ width: "100%", height: "100%" }}>
          {pins.map((p, i) => (
            <AdvancedMarker key={i} position={{ lat: p.lat, lng: p.lng }}>
              <PinDot delay={i * 0.08} />
            </AdvancedMarker>
          ))}
        </Map>
      </APIProvider>
    </div>
  );
}

function PinDot({ delay = 0 }: { delay?: number }) {
  return (
    <motion.span initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay, type: "spring", stiffness: 300, damping: 18 }} className="relative block size-5">
      <span className="absolute inset-0 animate-pulse-ring rounded-full bg-brand-500/60" />
      <span className="absolute inset-1 rounded-full bg-brand-600 ring-2 ring-white shadow-soft" />
    </motion.span>
  );
}

/** Keyless fallback: a 2D Philippines map (slight 3D tilt) with pins placed by their real coordinates. */
function IllustratedMap({ pins }: { pins: Pin[] }) {
  const placed = useMemo(
    () =>
      pins.map((p) => ({
        x: ((p.lng - PH_BBOX.minLng) / (PH_BBOX.maxLng - PH_BBOX.minLng)) * PH_W,
        y: ((PH_BBOX.maxLat - p.lat) / (PH_BBOX.maxLat - PH_BBOX.minLat)) * PH_H,
        tank: p.tank,
      })),
    [pins],
  );

  return (
    <div className="relative h-[460px] w-full overflow-hidden bg-[#0f1a33] [perspective:1400px] sm:h-[560px]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(11,95,255,0.22),transparent_65%)]" />
      <motion.svg
        viewBox={`0 0 ${PH_W} ${PH_H}`}
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid meet"
        aria-label="Map of the Philippines showing customer locations"
        initial={{ rotateX: 18, opacity: 0 }}
        whileInView={{ rotateX: 8, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        style={{ transformOrigin: "50% 60%" }}
      >
        <defs>
          <linearGradient id="land" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2b4a8f" />
            <stop offset="1" stopColor="#1a2f5e" />
          </linearGradient>
          <filter id="landShadow" x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow dx="0" dy="18" stdDeviation="14" floodColor="#000" floodOpacity="0.45" />
          </filter>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M50 0 H0 V50" fill="none" stroke="#1b2a4f" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={PH_W} height={PH_H} fill="url(#grid)" />
        {/* 3D base layer */}
        <path d={PH_PATH} transform="translate(0 14)" fill="#0c1a3a" />
        <path d={PH_PATH} fill="url(#land)" stroke="#5f8dff" strokeWidth={2.5} strokeLinejoin="round" filter="url(#landShadow)" />

        {/* delivery route between pins */}
        {placed.length > 1 && (
          <motion.path
            d={placed.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ")}
            stroke="#4a85ff"
            strokeWidth={4}
            fill="none"
            strokeDasharray="10 12"
            initial={{ pathLength: 0, opacity: 0 }}
            whileInView={{ pathLength: 1, opacity: 0.85 }}
            viewport={{ once: true }}
            transition={{ duration: 2.2, ease: "easeInOut", delay: 0.6 }}
          />
        )}

        {placed.map((p, i) => (
          <motion.g
            key={i}
            initial={{ opacity: 0, scale: 0.4 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 + i * 0.1, type: "spring", stiffness: 260, damping: 16 }}
            style={{ transformOrigin: `${p.x}px ${p.y}px` }}
          >
            <circle cx={p.x} cy={p.y} r={26} fill="#4a85ff" opacity={0.25}>
              <animate attributeName="r" values="18;40;18" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.35;0;0.35" dur="2.4s" repeatCount="indefinite" />
            </circle>
            <circle cx={p.x} cy={p.y} r={14} fill="#0b5fff" stroke="#fff" strokeWidth={4} />
            <text x={p.x + 18} y={p.y - 14} fill="#fff" fontSize="26" fontWeight="700" style={{ paintOrder: "stroke" }} stroke="#0f1a33" strokeWidth={6}>
              {p.tank === "2.7kg" ? "2.7" : "11"}
            </text>
          </motion.g>
        ))}
      </motion.svg>

      {/* HQ marker */}
      <div className="absolute bottom-6 left-6 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-ink shadow-card">
        <span className="grid size-6 place-items-center rounded-lg bg-brand-600 text-white">
          <Navigation className="size-3.5" />
        </span>
        Fiesta Gas PGI rider
      </div>
    </div>
  );
}
