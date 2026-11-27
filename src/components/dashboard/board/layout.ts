/*
 * Dashboard layout: a 24-column grid of widgets with half-height rows (fine steps make moving and stretching
 * feel smooth). Pure functions shared by the API, the overview page and the board.
 *
 * Stored as { v: 2, items }. Layouts saved before (a plain array on a 12-column grid with full rows) are
 * converted by doubling every number, which keeps every widget exactly the same size on screen.
 */

export const COLS = 24;
export const MAX_ROWS = 160;
export const MAX_H = 30;

export type WidgetType = "site" | "seo" | "google" | "traffic" | "map" | "crawlers" | "countries" | "pages" | "setup" | "websites" | "keywords" | "articles" | "queries";
export type Item = { id: string; type: WidgetType; x: number; y: number; w: number; h: number };
export type Stored = { v: 2; items: Item[] };

export const SPEC: Record<WidgetType, { title: string; hint: string; w: number; h: number; minW: number; minH: number }> = {
  site: { title: "Website", hint: "Live preview, status and score", w: 12, h: 10, minW: 6, minH: 6 },
  seo: { title: "SEO overview", hint: "Score and issues by severity", w: 12, h: 6, minW: 6, minH: 5 },
  google: { title: "Google Search", hint: "Clicks, impressions, position", w: 6, h: 8, minW: 5, minH: 5 },
  traffic: { title: "Traffic", hint: "Visitors, requests, bots", w: 6, h: 8, minW: 5, minH: 5 },
  map: { title: "Countries map", hint: "Where visitors come from", w: 12, h: 10, minW: 6, minH: 6 },
  crawlers: { title: "Crawlers", hint: "Bots each day by category", w: 12, h: 10, minW: 8, minH: 6 },
  countries: { title: "Visits by country", hint: "Daily share of each country", w: 12, h: 10, minW: 8, minH: 6 },
  pages: { title: "Top pages", hint: "Most visited pages", w: 8, h: 8, minW: 6, minH: 4 },
  setup: { title: "Setup", hint: "Connections still to do", w: 8, h: 5, minW: 6, minH: 3 },
  websites: { title: "Websites", hint: "All sites in the workspace", w: 24, h: 4, minW: 8, minH: 3 },
  keywords: { title: "Planner keywords", hint: "Your keywords with volume and position", w: 12, h: 8, minW: 6, minH: 5 },
  articles: { title: "Articles", hint: "Latest articles from Content", w: 12, h: 8, minW: 6, minH: 5 },
  queries: { title: "Google queries", hint: "What people searched to find you", w: 12, h: 8, minW: 6, minH: 5 },
};

export const DEFAULT_LAYOUT: Item[] = [
  { id: "site", type: "site", x: 0, y: 0, w: 12, h: 10 },
  { id: "seo", type: "seo", x: 12, y: 0, w: 12, h: 6 },
  { id: "google", type: "google", x: 12, y: 6, w: 6, h: 8 },
  { id: "traffic", type: "traffic", x: 18, y: 6, w: 6, h: 8 },
  { id: "map", type: "map", x: 0, y: 10, w: 12, h: 10 },
  { id: "crawlers", type: "crawlers", x: 12, y: 14, w: 12, h: 10 },
  { id: "keywords", type: "keywords", x: 0, y: 20, w: 12, h: 8 },
  { id: "queries", type: "queries", x: 12, y: 24, w: 12, h: 8 },
];

export const overlap = (a: Item, b: Item) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** Keep a size and position inside the grid and the widget's limits. */
export function clampItem(it: Item): Item {
  const s = SPEC[it.type];
  const w = Math.max(s.minW, Math.min(COLS, Math.round(it.w)));
  const h = Math.max(s.minH, Math.min(MAX_H, Math.round(it.h)));
  const x = Math.max(0, Math.min(COLS - w, Math.round(it.x)));
  const y = Math.max(0, Math.min(MAX_ROWS - h, Math.round(it.y)));
  return { ...it, w, h, x, y };
}

/**
 * After one widget moved or changed size: push the widgets it now covers below it, then let everything float up
 * into free space (no gaps, no overlaps). While dragging, the moved widget stays where the pointer put it;
 * after the drop it floats up too (pin = false).
 */
export function resolve(items: Item[], movedId?: string, pin = true): Item[] {
  const list = items.map(clampItem);
  const moved = list.find((i) => i.id === movedId) ?? null;
  const placed: Item[] = moved ? [moved] : [];
  for (const it of list.filter((i) => i !== moved).sort((a, b) => a.y - b.y || a.x - b.x)) {
    const cur = { ...it };
    while (placed.some((p) => overlap(p, cur))) cur.y += 1;
    placed.push(cur);
  }
  for (let pass = 0; pass < 4; pass++) {
    for (const cur of [...placed].sort((a, b) => a.y - b.y || a.x - b.x)) {
      if (cur === moved && pin) continue;
      while (cur.y > 0 && !placed.some((p) => p !== cur && overlap(p, { ...cur, y: cur.y - 1 }))) cur.y -= 1;
    }
  }
  return placed.sort((a, b) => a.y - b.y || a.x - b.x);
}

/** The highest free place where a new widget of this type fits. */
export function firstFit(items: Item[], type: WidgetType): Item {
  const s = SPEC[type];
  for (let y = 0; y < MAX_ROWS - s.h; y++) {
    for (let x = 0; x + s.w <= COLS; x++) {
      const cand: Item = { id: type, type, x, y, w: s.w, h: s.h };
      if (!items.some((i) => overlap(i, cand))) return cand;
    }
  }
  return { id: type, type, x: 0, y: Math.max(0, ...items.map((i) => i.y + i.h)), w: s.w, h: s.h };
}

/** Clean a layout that came from the browser or the database (new { v: 2 } or old 12-column array). */
export function sanitize(raw: unknown): Item[] | null {
  const v2 = raw && typeof raw === "object" && !Array.isArray(raw) && (raw as { v?: unknown }).v === 2;
  const list = v2 ? (raw as { items?: unknown }).items : raw;
  if (!Array.isArray(list)) return null;
  const k = v2 ? 1 : 2;
  const seen = new Set<string>();
  const out: Item[] = [];
  for (const r of list.slice(0, 30)) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const type = o.type as WidgetType;
    if (!(type in SPEC) || seen.has(type)) continue;
    seen.add(type);
    const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
    out.push(clampItem({ id: type, type, x: n(o.x) * k, y: n(o.y) * k, w: n(o.w) * k || SPEC[type].w, h: n(o.h) * k || SPEC[type].h }));
  }
  return resolve(out);
}

export const toStored = (items: Item[]): Stored => ({ v: 2, items });
