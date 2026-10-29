"use client";

import { Component, useMemo, type ReactNode } from "react";
import { useQuery } from "convex/react";
import { motion } from "motion/react";
import { MapPin, Navigation, Users } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { PublicConvexProvider } from "@/components/providers/SessionProvider";
import { ButtonLink } from "@/components/ui";
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
              When you sign up, your house is pinned on our delivery map. Our rider sees exactly where to go, and Fiesta Gas PGI can plan the fastest route for the day.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Stat icon={<Users className="size-4" />} value={`${pins.length}${isDemo ? "+" : ""}`} label="customers pinned" />
            <Stat icon={<Navigation className="size-4" />} value="1 tap" label="directions for the rider" />
          </div>
        </motion.div>

        <motion.div variants={reveal} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} className="relative mt-10 overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl">
          <IllustratedMap pins={pins} />
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

/** 2D Philippines map (slight 3D tilt) with customer pins placed by their real coordinates. */
function IllustratedMap({ pins }: { pins: Pin[] }) {
  // Project to map space, then merge pins that would overlap into one bubble with a count.
  const clusters = useMemo(() => {
    const placed = pins.map((p) => ({
      x: ((p.lng - PH_BBOX.minLng) / (PH_BBOX.maxLng - PH_BBOX.minLng)) * PH_W,
      y: ((PH_BBOX.maxLat - p.lat) / (PH_BBOX.maxLat - PH_BBOX.minLat)) * PH_H,
    }));
    const RADIUS = 60; // map units; a pin this close to a bubble joins it
    const groups: { x: number; y: number; n: number }[] = [];
    for (const p of placed) {
      const g = groups.find((c) => Math.hypot(c.x - p.x, c.y - p.y) < RADIUS);
      if (g) {
        g.x = (g.x * g.n + p.x) / (g.n + 1);
        g.y = (g.y * g.n + p.y) / (g.n + 1);
        g.n += 1;
      } else groups.push({ x: p.x, y: p.y, n: 1 });
    }
    return groups;
  }, [pins]);

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
        {clusters.length > 1 && (
          <motion.path
            d={clusters.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ")}
            stroke="#4a85ff"
            strokeWidth={8}
            fill="none"
            strokeDasharray="20 24"
            initial={{ pathLength: 0, opacity: 0 }}
            whileInView={{ pathLength: 1, opacity: 0.85 }}
            viewport={{ once: true }}
            transition={{ duration: 2.2, ease: "easeInOut", delay: 0.6 }}
          />
        )}

        {clusters.map((c, i) => (
          <motion.g
            key={i}
            initial={{ opacity: 0, scale: 0.4 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 + i * 0.1, type: "spring", stiffness: 260, damping: 16 }}
            style={{ transformOrigin: `${c.x}px ${c.y}px` }}
          >
            <circle cx={c.x} cy={c.y} r={c.n > 1 ? 80 : 50} fill="#4a85ff" opacity={0.25}>
              <animate attributeName="r" values={c.n > 1 ? "60;120;60" : "36;80;36"} dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.35;0;0.35" dur="2.4s" repeatCount="indefinite" />
            </circle>
            {c.n > 1 ? (
              <>
                <circle cx={c.x} cy={c.y} r={58} fill="#0b5fff" stroke="#fff" strokeWidth={8} />
                <text x={c.x} y={c.y + 20} textAnchor="middle" fill="#fff" fontSize="56" fontWeight="800">
                  {c.n}
                </text>
              </>
            ) : (
              <circle cx={c.x} cy={c.y} r={28} fill="#0b5fff" stroke="#fff" strokeWidth={8} />
            )}
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
