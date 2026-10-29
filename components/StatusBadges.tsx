"use client";

import { Badge } from "./ui";
import type { Doc } from "@/convex/_generated/dataModel";
import { estimateGas } from "@/lib/gas";

export function RequestStatusBadge({ status }: { status: Doc<"requests">["status"] }) {
  const map = {
    pending: { tone: "amber", label: "Pending" },
    accepted: { tone: "blue", label: "Accepted" },
    scheduled: { tone: "blue", label: "Scheduled" },
    delivered: { tone: "green", label: "Delivered" },
    cancelled: { tone: "neutral", label: "Cancelled" },
  } as const;
  const m = map[status];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

export function GasBadge({ status, label }: { status: ReturnType<typeof estimateGas>["status"]; label: string }) {
  const tone = status === "ok" ? "green" : status === "low" ? "amber" : status === "critical" ? "orange" : status === "empty" ? "red" : "neutral";
  return <Badge tone={tone}>{label}</Badge>;
}
