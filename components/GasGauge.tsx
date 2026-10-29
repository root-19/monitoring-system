"use client";

import { motion } from "motion/react";
import { statusColor, type GasEstimate } from "@/lib/gas";
import { cn } from "./ui";

/**
 * A stylized LPG tank with an animated fill level.
 * `pct` 0..1 (null = unknown, shows striped empty tank)
 */
export function TankIllustration({
  pct,
  color = "#0b5fff",
  label,
  className,
  animate = true,
}: {
  pct: number | null;
  color?: string;
  label?: string;
  className?: string;
  animate?: boolean;
}) {
  const fill = pct == null ? 0 : Math.max(0.02, Math.min(1, pct));
  // tank body spans y=52..196 in the viewBox (height 144)
  const bodyTop = 52;
  const bodyH = 144;
  const levelH = bodyH * fill;
  const levelY = bodyTop + bodyH - levelH;

  return (
    <svg viewBox="0 0 160 220" className={cn("h-full w-auto", className)} aria-label={label ?? "Gas tank level"}>
      <defs>
        <clipPath id="tankClip">
          <rect x="30" y={bodyTop} width="100" height={bodyH} rx="22" />
        </clipPath>
        <linearGradient id="tankShade" x1="0" x2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.08" />
        </linearGradient>
        <linearGradient id="gasGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.85" />
          <stop offset="1" stopColor={color} />
        </linearGradient>
      </defs>

      {/* valve + handle */}
      <rect x="70" y="14" width="20" height="18" rx="4" fill="#1f2937" />
      <rect x="56" y="30" width="48" height="12" rx="6" fill="#374151" />
      <path d="M44 44 h72 a6 6 0 0 1 6 6 v4 H38 v-4 a6 6 0 0 1 6-6Z" fill="#4b5563" />

      {/* tank body */}
      <rect x="30" y={bodyTop} width="100" height={bodyH} rx="22" fill="#eef2f9" stroke="#d7deea" strokeWidth="2" />

      {/* gas level */}
      <g clipPath="url(#tankClip)">
        {animate ? (
          <motion.rect
            x="30"
            width="100"
            initial={{ y: bodyTop + bodyH, height: 0 }}
            animate={{ y: levelY, height: levelH }}
            transition={{ type: "spring", stiffness: 60, damping: 16, delay: 0.2 }}
            fill="url(#gasGrad)"
          />
        ) : (
          <rect x="30" y={levelY} width="100" height={levelH} fill="url(#gasGrad)" />
        )}
        {/* wave on top of level */}
        {animate && pct != null && (
          <motion.path
            d="M-40 0 Q -20 -6 0 0 T 40 0 T 80 0 T 120 0 T 160 0 T 200 0 T 240 0 V 20 H -40 Z"
            fill={color}
            opacity="0.8"
            initial={{ x: 0 }}
            animate={{ x: [-40, 0], y: levelY }}
            transition={{ x: { repeat: Infinity, duration: 2.4, ease: "linear" }, y: { type: "spring", stiffness: 60, damping: 16, delay: 0.2 } }}
          />
        )}
        {pct == null && (
          <pattern id="stripes" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="4" height="10" fill="#d7deea" />
          </pattern>
        )}
        {pct == null && <rect x="30" y={bodyTop} width="100" height={bodyH} fill="url(#stripes)" opacity="0.7" />}
        <rect x="30" y={bodyTop} width="100" height={bodyH} rx="22" fill="url(#tankShade)" />
      </g>

      {/* label strip */}
      <rect x="44" y="112" width="72" height="28" rx="8" fill="#ffffff" opacity="0.9" />
      <text x="80" y="131" textAnchor="middle" fontSize="13" fontWeight="700" fill="#0b1220">
        {pct == null ? "—" : `${Math.round(fill * 100)}%`}
      </text>

      {/* base ring */}
      <rect x="40" y="198" width="80" height="10" rx="5" fill="#9ca3af" />
      <ellipse cx="80" cy="212" rx="48" ry="5" fill="#0b1220" opacity="0.08" />
    </svg>
  );
}

export function GasStatusCard({ estimate, tank, compact = false }: { estimate: GasEstimate; tank?: string | null; compact?: boolean }) {
  const c = statusColor(estimate.status);
  return (
    <div className={cn("flex items-center gap-4", compact ? "" : "gap-6")}>
      <div className={compact ? "h-24" : "h-44"}>
        <TankIllustration pct={estimate.pct} color={c.hex} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Estimated gas left</p>
        <p className={cn("mt-1 text-2xl font-bold tracking-tight", c.text)}>{estimate.label}</p>
        {tank && <p className="text-sm text-ink-500">{tank} tank</p>}
        {estimate.hint && <p className="mt-2 text-sm text-ink-700">{estimate.hint}</p>}
      </div>
    </div>
  );
}

export function LevelBar({ pct, status }: { pct: number | null; status: GasEstimate["status"] }) {
  const c = statusColor(status);
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
      <motion.div
        className="h-full rounded-full"
        style={{ background: c.hex }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.round((pct ?? 0) * 100)}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
  );
}
