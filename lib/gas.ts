export type GasStatus = "ok" | "low" | "critical" | "empty" | "unknown";

export type GasEstimate = {
  status: GasStatus;
  /** 0..1, null when unknown */
  pct: number | null;
  daysUsed: number | null;
  daysLeft: number | null;
  label: string;
  hint: string;
};

const DAY = 24 * 60 * 60 * 1000;

export function defaultDaysPerTank(tank?: "11kg" | "2.7kg" | null) {
  return tank === "2.7kg" ? 14 : 30;
}

/**
 * Estimates how much gas is left based on the last delivery date and the
 * client's usual consumption (days per tank). Simple, explainable, and good
 * enough for reminders. Admin can tune avgDaysPerTank per client.
 */
export function estimateGas(
  lastDeliveryAt: number | null | undefined,
  avgDaysPerTank: number | null | undefined,
  tank?: "11kg" | "2.7kg" | null,
  now: number = Date.now()
): GasEstimate {
  if (!lastDeliveryAt) {
    return {
      status: "unknown",
      pct: null,
      daysUsed: null,
      daysLeft: null,
      label: "No delivery yet",
      hint: "Record the first delivery to start tracking.",
    };
  }
  const avg = avgDaysPerTank && avgDaysPerTank > 0 ? avgDaysPerTank : defaultDaysPerTank(tank);
  const daysUsed = Math.max(0, (now - lastDeliveryAt) / DAY);
  const pct = Math.min(1, Math.max(0, 1 - daysUsed / avg));
  const daysLeft = Math.max(0, avg - daysUsed);

  let status: GasStatus = "ok";
  if (pct <= 0.05) status = "empty";
  else if (pct <= 0.2) status = "critical";
  else if (pct <= 0.4) status = "low";

  const labels: Record<GasStatus, [string, string]> = {
    ok: ["Good", `About ${Math.round(daysLeft)} day(s) left.`],
    low: ["Getting low", `Around ${Math.round(daysLeft)} day(s) left. Plan a refill soon.`],
    critical: ["Almost empty", `Only ~${Math.ceil(daysLeft)} day(s) left. Order a refill now.`],
    empty: ["Likely empty", "Tank is probably empty. Deliver as soon as possible."],
    unknown: ["No delivery yet", ""],
  };
  return {
    status,
    pct,
    daysUsed,
    daysLeft,
    label: labels[status][0],
    hint: labels[status][1],
  };
}

export function statusColor(status: GasStatus) {
  switch (status) {
    case "ok":
      return { text: "text-ok", bg: "bg-green-50", ring: "ring-green-200", hex: "#16a34a" };
    case "low":
      return { text: "text-warn", bg: "bg-amber-50", ring: "ring-amber-200", hex: "#f59e0b" };
    case "critical":
      return { text: "text-orange-600", bg: "bg-orange-50", ring: "ring-orange-200", hex: "#ea580c" };
    case "empty":
      return { text: "text-danger", bg: "bg-red-50", ring: "ring-red-200", hex: "#dc2626" };
    default:
      return { text: "text-ink-500", bg: "bg-gray-50", ring: "ring-gray-200", hex: "#9ca3af" };
  }
}

export function formatPhone(p: string) {
  // 09985861976 -> 0998 586 1976
  const d = p.replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  return p;
}

export function toE164(p: string) {
  const d = p.replace(/\D/g, "");
  if (d.startsWith("0") && d.length === 11) return `+63${d.slice(1)}`;
  if (d.startsWith("63")) return `+${d}`;
  return p;
}

export function formatDate(ts: number, withTime = false) {
  return new Date(ts).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

export function timeAgo(ts: number, now = Date.now()) {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} day(s) ago`;
  return formatDate(ts);
}

export const PGI_PHONE = "09985861976";
export const PGI_PHONE_DISPLAY = "0998 586 1976";
