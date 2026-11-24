/* Pure helpers shared by the server page and the client tables (no database, no secrets). */
import type { PageRow, QueryRow } from "./report";

/** Typical Google click-through rate for positions 1–10 (rounded industry averages). */
const TYPICAL_CTR = [0.28, 0.15, 0.11, 0.08, 0.07, 0.05, 0.04, 0.03, 0.03, 0.025];
export const typicalCtr = (position: number) => TYPICAL_CTR[Math.min(9, Math.max(0, Math.round(position) - 1))];

const dropped = (now: number | null, before: number | null, min: number) =>
  now !== null && before !== null && before - now >= min && now <= before * 0.7;
const grew = (now: number | null, before: number | null, min: number) =>
  now !== null && before !== null && now - before >= min && now >= before * 1.3;

export const PAGE_FILTERS = {
  all: { label: "All pages", test: (_r: PageRow) => true },
  losing: { label: "Losing traffic", test: (r: PageRow) => dropped(r.visits, r.visitsBefore, 10) || dropped(r.clicks, r.clicksBefore, 5) },
  growing: { label: "Growing", test: (r: PageRow) => grew(r.visits, r.visitsBefore, 10) || grew(r.clicks, r.clicksBefore, 5) },
  lowCtr: {
    label: "Low CTR",
    test: (r: PageRow) => (r.impressions ?? 0) >= 100 && r.position !== null && r.position <= 10 && (r.ctr ?? 0) < typicalCtr(r.position) * 0.5,
  },
  noGoogle: { label: "Visits, no Google clicks", test: (r: PageRow) => (r.visits ?? 0) >= 20 && r.clicks === 0 },
} as const;
export type PageFilter = keyof typeof PAGE_FILTERS;

export const QUERY_FILTERS = {
  all: { label: "All queries", test: (_r: QueryRow) => true },
  almost: { label: "Almost page 1", test: (r: QueryRow) => r.position > 8.5 && r.position <= 20 && r.impressions >= 20 },
  lowCtr: { label: "Low CTR", test: (r: QueryRow) => r.impressions >= 50 && r.position <= 10 && r.ctr < typicalCtr(r.position) * 0.5 },
  rising: { label: "Rising", test: (r: QueryRow) => grew(r.clicks, r.clicksBefore, 3) || (r.clicksBefore === 0 && r.clicks >= 3) },
  falling: { label: "Falling", test: (r: QueryRow) => dropped(r.clicks, r.clicksBefore, 3) },
} as const;
export type QueryFilter = keyof typeof QUERY_FILTERS;

export const fmt = {
  n: (v: number) => Math.round(v).toLocaleString("en-US"),
  compact: (v: number) => (Math.abs(v) >= 10_000 ? Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v) : Math.round(v).toLocaleString("en-US")),
  pct: (v: number, digits = 1) => `${(v * 100).toFixed(digits)}%`,
  pos: (v: number) => v.toFixed(1),
};

/** Change between periods, ready to print. Lower is better for position. */
export function change(now: number, before: number | null, kind: "count" | "rate" | "position" = "count"): { text: string; tone: "up" | "down" | "flat" } | null {
  if (before === null) return null;
  if (kind === "position") {
    const d = now - before;
    if (Math.abs(d) < 0.05) return { text: "±0", tone: "flat" };
    return { text: `${d < 0 ? "↑" : "↓"} ${Math.abs(d).toFixed(1)}`, tone: d < 0 ? "up" : "down" };
  }
  if (kind === "rate") {
    const d = (now - before) * 100;
    if (Math.abs(d) < 0.05) return { text: "±0 pt", tone: "flat" };
    return { text: `${d > 0 ? "+" : "−"}${Math.abs(d).toFixed(1)} pt`, tone: d > 0 ? "up" : "down" };
  }
  if (before === 0) return now === 0 ? { text: "±0%", tone: "flat" } : { text: "new", tone: "up" };
  const p = (now - before) / before;
  if (Math.abs(p) < 0.005) return { text: "±0%", tone: "flat" };
  return { text: `${p > 0 ? "+" : "−"}${Math.abs(p * 100) >= 10 ? Math.round(Math.abs(p * 100)) : Math.abs(p * 100).toFixed(1)}%`, tone: p > 0 ? "up" : "down" };
}
