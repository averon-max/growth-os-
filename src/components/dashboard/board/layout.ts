/* Dashboard layout: a 12-column grid of widgets. Pure functions shared by the API and the board. */

export const COLS = 12;
export const MAX_ROWS = 60;

export type WidgetType = "site" | "seo" | "google" | "traffic" | "map" | "crawlers" | "countries" | "pages" | "setup" | "websites" | "keywords" | "articles" | "queries";
export type Item = { id: string; type: WidgetType; x: number; y: number; w: number; h: number };

export const SPEC: Record<WidgetType, { title: string; hint: string; w: number; h: number; minW: number; minH: number }> = {
  site: { title: "Website", hint: "Live preview, status and score", w: 6, h: 5, minW: 4, minH: 4 },
  seo: { title: "SEO overview", hint: "Score and issues by severity", w: 6, h: 3, minW: 3, minH: 3 },
  google: { title: "Google Search", hint: "Clicks, impressions, position", w: 3, h: 4, minW: 3, minH: 3 },
  traffic: { title: "Traffic", hint: "Visitors, requests, bots", w: 3, h: 4, minW: 3, minH: 3 },
  map: { title: "Countries map", hint: "Where visitors come from", w: 6, h: 5, minW: 4, minH: 4 },
  crawlers: { title: "Crawlers", hint: "Bots each day by category", w: 6, h: 5, minW: 4, minH: 4 },
  countries: { title: "Visits by country", hint: "Daily share of each country", w: 6, h: 5, minW: 4, minH: 4 },
  pages: { title: "Top pages", hint: "Most visited pages", w: 4, h: 4, minW: 3, minH: 3 },
  setup: { title: "Setup", hint: "Connections still to do", w: 4, h: 3, minW: 3, minH: 2 },
  websites: { title: "Websites", hint: "All sites in the workspace", w: 12, h: 3, minW: 4, minH: 2 },
  keywords: { title: "Planner keywords", hint: "Your keywords with volume and position", w: 6, h: 4, minW: 3, minH: 3 },
  articles: { title: "Articles", hint: "Latest articles from Content", w: 6, h: 4, minW: 3, minH: 3 },
  queries: { title: "Google queries", hint: "What people searched to find you", w: 6, h: 4, minW: 3, minH: 3 },
};

export const DEFAULT_LAYOUT: Item[] = [
  { id: "site", type: "site", x: 0, y: 0, w: 6, h: 5 },
  { id: "seo", type: "seo", x: 6, y: 0, w: 6, h: 3 },
  { id: "google", type: "google", x: 6, y: 3, w: 3, h: 4 },
  { id: "traffic", type: "traffic", x: 9, y: 3, w: 3, h: 4 },
  { id: "map", type: "map", x: 0, y: 5, w: 6, h: 5 },
  { id: "crawlers", type: "crawlers", x: 6, y: 7, w: 6, h: 5 },
  { id: "keywords", type: "keywords", x: 0, y: 10, w: 6, h: 4 },
  { id: "queries", type: "queries", x: 6, y: 12, w: 6, h: 4 },
]

const overlap = (a: Item, b: Item) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** Keep a size and position inside the grid and the widget's limits. */
export function clampItem(it: Item): Item {
  const s = SPEC[it.type];
  const w = Math.max(s.minW, Math.min(COLS, Math.round(it.w)));
  const h = Math.max(s.minH, Math.min(12, Math.round(it.h)));
  const x = Math.max(0, Math.min(COLS - w, Math.round(it.x)));
  const y = Math.max(0, Math.min(MAX_ROWS - h, Math.round(it.y)));
  return { ...it, w, h, x, y };
}

/**
 * After one widget moved or grew: push the widgets it now covers below it, then let everything float up
 * into free space (like a constructor board: no gaps, no overlaps). The moved widget stays where it was dropped.
 */
export function resolve(items: Item[], movedId?: string): Item[] {
  const list = items.map(clampItem);
  const moved = list.find((i) => i.id === movedId) ?? null;
  const placed: Item[] = moved ? [moved] : [];
  for (const it of list.filter((i) => i !== moved).sort((a, b) => a.y - b.y || a.x - b.x)) {
    const cur = { ...it };
    while (placed.some((p) => overlap(p, cur))) cur.y += 1;
    placed.push(cur);
  }
  for (let pass = 0; pass < 3; pass++) {
    for (const cur of [...placed].sort((a, b) => a.y - b.y || a.x - b.x)) {
      if (cur === moved) continue;
      while (cur.y > 0 && !placed.some((p) => p !== cur && overlap(p, { ...cur, y: cur.y - 1 }))) cur.y -= 1;
    }
  }
  return placed.sort((a, b) => a.y - b.y || a.x - b.x);
}

/** Clean a layout that came from the browser or the database. */
export function sanitize(raw: unknown): Item[] | null {
  if (!Array.isArray(raw)) return null;
  const seen = new Set<string>();
  const out: Item[] = [];
  for (const r of raw.slice(0, 30)) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const type = o.type as WidgetType;
    if (!(type in SPEC) || seen.has(type)) continue;
    seen.add(type);
    const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
    out.push(clampItem({ id: type, type, x: n(o.x), y: n(o.y), w: n(o.w) || SPEC[type].w, h: n(o.h) || SPEC[type].h }));
  }
  return resolve(out);
}
