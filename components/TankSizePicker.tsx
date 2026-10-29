"use client";

import { cn } from "./ui";
import { TankIllustration } from "./GasGauge";

export function TankSizePicker({ value, onChange }: { value: "11kg" | "2.7kg"; onChange: (v: "11kg" | "2.7kg") => void }) {
  const options: Array<{ v: "11kg" | "2.7kg"; title: string; sub: string; h: string }> = [
    { v: "11kg", title: "11 kg", sub: "Standard household tank", h: "h-16" },
    { v: "2.7kg", title: "2.7 kg", sub: "Small / portable tank", h: "h-11" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((o) => (
        <button
          type="button"
          key={o.v}
          onClick={() => onChange(o.v)}
          className={cn(
            "flex items-center gap-3 rounded-2xl border p-3 text-left transition",
            value === o.v ? "border-brand-500 bg-brand-50 ring-4 ring-brand-100" : "border-line bg-white hover:border-brand-200"
          )}
        >
          <div className={cn("flex h-16 w-12 items-end justify-center", "")}>
            <div className={o.h}>
              <TankIllustration pct={0.9} animate={false} color={value === o.v ? "#0b5fff" : "#9ca3af"} />
            </div>
          </div>
          <div>
            <p className="font-semibold text-ink">{o.title}</p>
            <p className="text-xs text-ink-500">{o.sub}</p>
          </div>
        </button>
      ))}
    </div>
  );
}
