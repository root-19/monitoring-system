import { describe, expect, it } from "vitest";
import { defaultDaysPerTank, estimateGas, formatPhone, statusColor, timeAgo, toE164 } from "@/lib/gas";
import { isValidPhone, normalizePhone } from "@/convex/lib";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 29, 4, 0, 0);

describe("estimateGas", () => {
  it("is unknown without a delivery", () => {
    const e = estimateGas(null, 30, "11kg", NOW);
    expect(e.status).toBe("unknown");
    expect(e.pct).toBeNull();
    expect(e.label).toBe("No delivery yet");
  });

  it("walks through ok -> low -> critical -> empty as days pass (30-day tank)", () => {
    const at = (days: number) => estimateGas(NOW - days * DAY, 30, "11kg", NOW);
    expect(at(0)).toMatchObject({ status: "ok", pct: 1, daysLeft: 30 });
    expect(at(15).status).toBe("ok");
    expect(at(18.5).status).toBe("low"); // 38% left
    expect(at(24.5).status).toBe("critical"); // 18% left
    expect(at(29).status).toBe("empty"); // 3% left
    expect(at(45)).toMatchObject({ status: "empty", pct: 0, daysLeft: 0 });
  });

  it("uses the tank-size default when avgDaysPerTank is missing or invalid", () => {
    expect(defaultDaysPerTank("2.7kg")).toBe(14);
    expect(defaultDaysPerTank("11kg")).toBe(30);
    expect(defaultDaysPerTank(null)).toBe(30);
    expect(estimateGas(NOW - 7 * DAY, 0, "2.7kg", NOW).pct).toBeCloseTo(0.5);
    expect(estimateGas(NOW - 7 * DAY, undefined, "2.7kg", NOW).status).toBe("ok");
    expect(estimateGas(NOW - 7 * DAY, 10, "2.7kg", NOW).status).toBe("low");
  });

  it("a delivery dated in the future counts as full", () => {
    expect(estimateGas(NOW + DAY, 30, "11kg", NOW)).toMatchObject({ pct: 1, daysUsed: 0 });
  });

  it("hints mention the days left", () => {
    expect(estimateGas(NOW - 10 * DAY, 30, "11kg", NOW).hint).toBe("About 20 day(s) left.");
    expect(estimateGas(NOW - 25 * DAY, 30, "11kg", NOW).hint).toMatch(/Only ~5 day\(s\) left/);
  });

  it("every status has a colour", () => {
    for (const s of ["ok", "low", "critical", "empty", "unknown"] as const) expect(statusColor(s).hex).toMatch(/^#/);
  });
});

describe("phone helpers", () => {
  it("normalises Philippine numbers", () => {
    expect(normalizePhone("0917 123 4567")).toBe("09171234567");
    expect(normalizePhone("+63 917 123 4567")).toBe("09171234567");
    expect(normalizePhone("639171234567")).toBe("09171234567");
    expect(normalizePhone("(0917)-123-4567")).toBe("09171234567");
  });

  it("validates 11-digit 09 numbers only", () => {
    expect(isValidPhone("09171234567")).toBe(true);
    expect(isValidPhone("0917123456")).toBe(false);
    expect(isValidPhone("08171234567")).toBe(false);
    expect(isValidPhone("+639171234567")).toBe(false);
  });

  it("formats for display and E.164", () => {
    expect(formatPhone("09985861976")).toBe("0998 586 1976");
    expect(formatPhone("12345")).toBe("12345");
    expect(toE164("09985861976")).toBe("+639985861976");
    expect(toE164("639985861976")).toBe("+639985861976");
    expect(toE164("12345")).toBe("12345");
  });
});

describe("timeAgo", () => {
  it("buckets by seconds, minutes, hours, days, then a date", () => {
    expect(timeAgo(NOW - 20_000, NOW)).toBe("just now");
    expect(timeAgo(NOW - 5 * 60_000, NOW)).toBe("5 min ago");
    expect(timeAgo(NOW - 3 * 3_600_000, NOW)).toBe("3 hr ago");
    expect(timeAgo(NOW - 2 * DAY, NOW)).toBe("2 day(s) ago");
    expect(timeAgo(NOW - 30 * DAY, NOW)).toMatch(/2026/);
    expect(timeAgo(NOW + DAY, NOW)).toBe("just now");
  });
});
