import { prisma } from "@/lib/prisma";
import { getCompletedUtcDayRange } from "@/lib/audience/completed-day-range";
import { ProviderNotConnectedError, SitePermissionError } from "@/lib/keywords/gsc-provider";
import { gscBatch, type GscRow } from "@/lib/traffic/gsc";
import { countryFromIso3 } from "./countries";

export const REPORT_DAYS = [7, 14, 28] as const;
export type ReportDays = (typeof REPORT_DAYS)[number];

const day = (d: Date) => d.toISOString().slice(0, 10);
const shift = (d: Date, days: number) => new Date(d.getTime() + days * 86_400_000);

export type Metric = { now: number; before: number | null };
export type DayPoint = { date: string; visitors: number | null; clicks: number | null; impressions: number | null };
export type PageRow = {
  path: string;
  visits: number | null;
  visitsBefore: number | null;
  clicks: number | null;
  clicksBefore: number | null;
  impressions: number | null;
  ctr: number | null;
  position: number | null;
};
export type QueryRow = {
  query: string;
  clicks: number;
  clicksBefore: number | null;
  impressions: number;
  ctr: number;
  position: number;
  positionBefore: number | null;
};
export type CountryRow = { code: string; visits: number; clicks: number | null; impressions: number | null };
export type DeviceRow = { device: string; visits: number; clicks: number | null };

export type CloudflareState =
  | { state: "missing" }
  | { state: "empty"; lastSync: string }
  | { state: "ok"; lastSync: string; dataTo: string; daysNow: number; daysBefore: number };
export type GoogleState =
  | { state: "missing"; connectUrl: string }
  | { state: "error"; message: string; connectUrl: string }
  | { state: "ok" };

export type TrafficReport = {
  days: ReportDays;
  range: { start: string; end: string; prevStart: string; prevEnd: string };
  cloudflare: CloudflareState;
  google: GoogleState;
  totals: {
    visitors: Metric | null;
    requests: Metric | null;
    botShare: Metric | null;
    clicks: Metric | null;
    impressions: Metric | null;
    ctr: Metric | null;
    position: Metric | null;
  };
  daily: { now: DayPoint[]; before: DayPoint[] };
  pages: PageRow[];
  queries: QueryRow[];
  countries: CountryRow[];
  devices: DeviceRow[];
  /** Per day of the current period, for the colour charts: visits by country, by page, and bot requests by category. */
  series: { countries: SeriesDay[]; pages: SeriesDay[]; bots: SeriesDay[] };
};
export type SeriesDay = { date: string; values: Record<string, number> };

type Breakdown = { country?: string; device?: string; requests?: number; visits?: number };
const list = (v: unknown): Breakdown[] => (Array.isArray(v) ? (v as Breakdown[]) : []);

/** "https://www.site.com/blog/x/" and "/blog/x" are the same page. */
export function pathOf(url: string): string {
  let p = url;
  try {
    p = new URL(url, "https://x.invalid").pathname;
  } catch {}
  try {
    p = decodeURI(p);
  } catch {}
  return p.length > 1 ? p.replace(/\/+$/, "") : "/";
}

/** Cloudflare counts every file; only real pages belong in the report. */
const ASSET = /^\/(_next|api|cdn-cgi|wp-json|wp-content|wp-includes)\/|\.(js|mjs|css|map|png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf|otf|eot|json|xml|txt|webmanifest|mp4|webm|mp3|pdf|zip)$/i;
export const isPagePath = (path: string) => !ASSET.test(path);

const sum = (rows: GscRow[]) => rows.reduce((a, r) => ({ clicks: a.clicks + r.clicks, impressions: a.impressions + r.impressions, pw: a.pw + r.position * r.impressions }), { clicks: 0, impressions: 0, pw: 0 });

export async function buildTrafficReport(opts: { websiteId: string; workspaceId: string; url: string; days: ReportDays }): Promise<TrafficReport> {
  const { websiteId, workspaceId, url, days } = opts;
  const { since, until } = getCompletedUtcDayRange(days, new Date());
  const prevUntil = shift(since, -1);
  const prevSince = shift(since, -days);
  const range = { start: day(since), end: day(until), prevStart: day(prevSince), prevEnd: day(prevUntil) };
  const connectUrl = `/api/integrations/google/connect?workspaceId=${encodeURIComponent(workspaceId)}&websiteId=${encodeURIComponent(websiteId)}`;

  const [cf, gsc] = await Promise.all([cloudflarePart(websiteId, since, until, prevSince, prevUntil, days), googlePart(workspaceId, url, range, connectUrl)]);

  // Pages: Cloudflare paths and Google URLs merged by path.
  const pages = new Map<string, PageRow>();
  const page = (path: string) => {
    let row = pages.get(path);
    if (!row) {
      row = { path, visits: null, visitsBefore: null, clicks: null, clicksBefore: null, impressions: null, ctr: null, position: null };
      pages.set(path, row);
    }
    return row;
  };
  for (const p of cf.pagesNow) page(pathOf(p.path)).visits = (page(pathOf(p.path)).visits ?? 0) + p.visits;
  for (const p of cf.pagesBefore) {
    const row = page(pathOf(p.path));
    row.visitsBefore = (row.visitsBefore ?? 0) + p.visits;
  }

  if (gsc.data) {
    const merged = new Map<string, { clicks: number; impressions: number; pw: number }>();
    for (const r of gsc.data.pagesNow) {
      const key = pathOf(r.keys[0] ?? "");
      const m = merged.get(key) ?? { clicks: 0, impressions: 0, pw: 0 };
      m.clicks += r.clicks;
      m.impressions += r.impressions;
      m.pw += r.position * r.impressions;
      merged.set(key, m);
    }
    for (const [key, m] of merged) {
      const row = page(key);
      row.clicks = m.clicks;
      row.impressions = m.impressions;
      row.ctr = m.impressions ? m.clicks / m.impressions : 0;
      row.position = m.impressions ? m.pw / m.impressions : null;
    }
    const before = new Map<string, number>();
    for (const r of gsc.data.pagesBefore) {
      const key = pathOf(r.keys[0] ?? "");
      before.set(key, (before.get(key) ?? 0) + r.clicks);
      if (r.clicks > 0) page(key);
    }
    for (const row of pages.values()) {
      row.clicks ??= 0;
      row.impressions ??= 0;
      row.clicksBefore = gsc.data.dailyBefore.size ? (before.get(row.path) ?? 0) : null;
    }
  }

  // A page Cloudflare didn't see had 0 visits — but only when Cloudflare has page data for that period at all.
  for (const row of pages.values()) {
    if (cf.pagesNow.length) row.visits ??= 0;
    if (cf.pagesBefore.length) row.visitsBefore ??= 0;
  }

  const queriesBefore = new Map((gsc.data?.queriesBefore ?? []).map((r): [string, GscRow] => [r.keys[0] ?? "", r]));
  const queries: QueryRow[] = (gsc.data?.queriesNow ?? []).map((r) => {
    const b = queriesBefore.get(r.keys[0] ?? "");
    return {
      query: r.keys[0] ?? "",
      clicks: r.clicks,
      clicksBefore: b ? b.clicks : gsc.data?.dailyBefore.size ? 0 : null,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position,
      positionBefore: b ? b.position : null,
    };
  });

  // Countries: Cloudflare gives ISO-2 codes, Google gives ISO-3.
  const countries = new Map<string, CountryRow>();
  for (const [code, visits] of cf.countries) countries.set(code, { code, visits, clicks: gsc.data ? 0 : null, impressions: gsc.data ? 0 : null });
  for (const r of gsc.data?.countries ?? []) {
    const code = countryFromIso3(r.keys[0] ?? "");
    if (!code) continue;
    const row = countries.get(code) ?? { code, visits: 0, clicks: 0, impressions: 0 };
    row.clicks = (row.clicks ?? 0) + r.clicks;
    row.impressions = (row.impressions ?? 0) + r.impressions;
    countries.set(code, row);
  }

  const devices = new Map<string, DeviceRow>();
  for (const [name, visits] of cf.devices) devices.set(name, { device: name, visits, clicks: gsc.data ? 0 : null });
  for (const r of gsc.data?.devices ?? []) {
    const name = (r.keys[0] ?? "").toLowerCase();
    const row = devices.get(name) ?? { device: name, visits: 0, clicks: 0 };
    row.clicks = (row.clicks ?? 0) + r.clicks;
    devices.set(name, row);
  }

  // Daily series on one calendar so both sources line up.
  const series = (start: Date, before: boolean): DayPoint[] =>
    Array.from({ length: days }, (_, i) => {
      const d = day(shift(start, i));
      const v: number | undefined = (before ? cf.dailyBefore : cf.dailyNow).get(d);
      const g = (before ? gsc.data?.dailyBefore : gsc.data?.dailyNow)?.get(d);
      return {
        date: d,
        visitors: v ?? null,
        clicks: gsc.data ? (g?.clicks ?? 0) : null,
        impressions: gsc.data ? (g?.impressions ?? 0) : null,
      };
    });

  const gNow = gsc.data ? sum([...gsc.data.dailyNow.values()].map((v) => ({ keys: [], ctr: 0, ...v }))) : null;
  const gBefore = gsc.data ? sum([...gsc.data.dailyBefore.values()].map((v) => ({ keys: [], ctr: 0, ...v }))) : null;
  const hasBefore = gsc.data ? gsc.data.dailyBefore.size > 0 : false;

  return {
    days,
    range,
    cloudflare: cf.state,
    google: gsc.state,
    totals: {
      visitors: cf.totals ? { now: cf.totals.visitors, before: cf.totals.visitorsBefore } : null,
      requests: cf.totals ? { now: cf.totals.requests, before: cf.totals.requestsBefore } : null,
      botShare: cf.totals ? { now: cf.totals.botShare, before: cf.totals.botShareBefore } : null,
      clicks: gNow ? { now: gNow.clicks, before: hasBefore && gBefore ? gBefore.clicks : null } : null,
      impressions: gNow ? { now: gNow.impressions, before: hasBefore && gBefore ? gBefore.impressions : null } : null,
      ctr: gNow ? { now: gNow.impressions ? gNow.clicks / gNow.impressions : 0, before: hasBefore && gBefore?.impressions ? gBefore.clicks / gBefore.impressions : null } : null,
      position: gNow?.impressions ? { now: gNow.pw / gNow.impressions, before: hasBefore && gBefore?.impressions ? gBefore.pw / gBefore.impressions : null } : null,
    },
    daily: { now: series(since, false), before: series(prevSince, true) },
    pages: pickPages([...pages.values()]),
    queries: queries.slice(0, 300),
    countries: [...countries.values()].sort((a, b) => b.visits - a.visits || (b.clicks ?? 0) - (a.clicks ?? 0)).slice(0, 20),
    devices: [...devices.values()].filter((d) => d.device).sort((a, b) => b.visits - a.visits),
    series: cf.series,
  };
}

/** The 300 busiest pages, plus the 60 that lost the most, so a page that dropped to zero still shows up. */
function pickPages(all: PageRow[]): PageRow[] {
  const score = (r: PageRow) => (r.visits ?? 0) + (r.clicks ?? 0) * 5 + (r.impressions ?? 0) / 50;
  const loss = (r: PageRow) => Math.max((r.visitsBefore ?? 0) - (r.visits ?? 0), ((r.clicksBefore ?? 0) - (r.clicks ?? 0)) * 5);
  const top = [...all].sort((a, b) => score(b) - score(a)).slice(0, 300);
  const seen = new Set(top.map((r) => r.path));
  const losers = all.filter((r) => !seen.has(r.path) && loss(r) > 0).sort((a, b) => loss(b) - loss(a)).slice(0, 60);
  return [...top, ...losers];
}

async function cloudflarePart(websiteId: string, since: Date, until: Date, prevSince: Date, prevUntil: Date, days: number) {
  const empty = {
    totals: null as null | { visitors: number; visitorsBefore: number | null; requests: number; requestsBefore: number | null; botShare: number; botShareBefore: number | null },
    dailyNow: new Map<string, number>(),
    dailyBefore: new Map<string, number>(),
    pagesNow: [] as { path: string; visits: number }[],
    pagesBefore: [] as { path: string; visits: number }[],
    countries: new Map<string, number>(),
    devices: new Map<string, number>(),
    series: { countries: [] as SeriesDay[], pages: [] as SeriesDay[], bots: [] as SeriesDay[] },
  };
  const connection = await prisma.cloudflareConnection.findUnique({ where: { websiteId }, select: { id: true, updatedAt: true } });
  if (!connection) return { ...empty, state: { state: "missing" } as CloudflareState };

  const [snaps, pagesNow, pagesBefore] = await Promise.all([
    prisma.trafficSnapshot.findMany({
      where: { connectionId: connection.id, date: { gte: prevSince, lte: until } },
      select: { date: true, totalRequests: true, uniqueVisitors: true, verifiedBotRequests: true, countryBreakdown: true, deviceBreakdown: true, botCategoryBreakdown: true },
      orderBy: { date: "asc" },
    }),
    prisma.pageTrafficSnapshot.groupBy({
      by: ["path"],
      where: { connectionId: connection.id, date: { gte: since, lte: until } },
      _sum: { visits: true },
      orderBy: { _sum: { visits: "desc" } },
      take: 400,
    }),
    prisma.pageTrafficSnapshot.groupBy({
      by: ["path"],
      where: { connectionId: connection.id, date: { gte: prevSince, lte: prevUntil } },
      _sum: { visits: true },
      orderBy: { _sum: { visits: "desc" } },
      take: 1000,
    }),
  ]);

  const lastSync = connection.updatedAt.toISOString();
  if (snaps.length === 0 && pagesNow.length === 0) return { ...empty, state: { state: "empty", lastSync } as CloudflareState };

  const now = snaps.filter((s) => s.date >= since);
  const before = snaps.filter((s) => s.date < since);
  const agg = (rows: typeof snaps) => {
    const requests = rows.reduce((a, s) => a + s.totalRequests, 0);
    const bots = rows.reduce((a, s) => a + s.verifiedBotRequests, 0);
    return { visitors: rows.reduce((a, s) => a + s.uniqueVisitors, 0), requests, botShare: requests ? bots / requests : 0 };
  };
  const a = agg(now);
  // Compare only against a previous period Cloudflare fully covers; a half-synced one would fake a jump.
  const comparable = before.length >= days - 1;
  const b = comparable ? agg(before) : null;

  const countries = new Map<string, number>();
  const devices = new Map<string, number>();
  for (const s of now) {
    for (const c of list(s.countryBreakdown)) if (c.country) countries.set(c.country.toUpperCase(), (countries.get(c.country.toUpperCase()) ?? 0) + (c.visits ?? 0));
    for (const d of list(s.deviceBreakdown)) if (d.device) devices.set(d.device.toLowerCase(), (devices.get(d.device.toLowerCase()) ?? 0) + (d.visits ?? 0));
  }

  // Day-by-day splits for the colour charts.
  type Bot = { category?: string; requests?: number };
  const countrySeries: SeriesDay[] = now.map((snap) => ({
    date: day(snap.date),
    values: Object.fromEntries(list(snap.countryBreakdown).filter((c) => c.country).map((c) => [c.country!.toUpperCase(), (c.visits ?? 0) || (c.requests ?? 0)])),
  }));
  const botSeries: SeriesDay[] = now.map((snap) => ({
    date: day(snap.date),
    values: Object.fromEntries(
      (Array.isArray(snap.botCategoryBreakdown) ? (snap.botCategoryBreakdown as Bot[]) : []).filter((b) => b.category).map((b) => [b.category!, b.requests ?? 0]),
    ),
  }));
  const topPaths = pagesNow.filter((p) => isPagePath(p.path) && (p._sum.visits ?? 0) > 0).slice(0, 7).map((p) => p.path);
  const pageRows = topPaths.length
    ? await prisma.pageTrafficSnapshot.findMany({
        where: { connectionId: connection.id, date: { gte: since, lte: until }, path: { in: topPaths } },
        select: { date: true, path: true, visits: true },
      })
    : [];
  const pageDays = new Map<string, Record<string, number>>();
  for (const r of pageRows) {
    const key = day(r.date);
    const v = pageDays.get(key) ?? {};
    v[r.path] = (v[r.path] ?? 0) + r.visits;
    pageDays.set(key, v);
  }
  const pageSeries: SeriesDay[] = [...pageDays.entries()].sort((x, y) => x[0].localeCompare(y[0])).map(([date, values]) => ({ date, values }));

  return {
    series: { countries: countrySeries, pages: pageSeries, bots: botSeries },
    totals: { visitors: a.visitors, visitorsBefore: b?.visitors ?? null, requests: a.requests, requestsBefore: b?.requests ?? null, botShare: a.botShare, botShareBefore: b?.botShare ?? null },
    dailyNow: new Map<string, number>(now.map((s): [string, number] => [day(s.date), s.uniqueVisitors])),
    dailyBefore: new Map<string, number>(before.map((s): [string, number] => [day(s.date), s.uniqueVisitors])),
    pagesNow: pagesNow.filter((p) => isPagePath(p.path) && (p._sum.visits ?? 0) > 0).map((p) => ({ path: p.path, visits: p._sum.visits ?? 0 })),
    pagesBefore: comparable ? pagesBefore.filter((p) => isPagePath(p.path) && (p._sum.visits ?? 0) > 0).map((p) => ({ path: p.path, visits: p._sum.visits ?? 0 })) : [],
    countries,
    devices,
    state: {
      state: "ok",
      lastSync,
      dataTo: now.length ? day(now[now.length - 1].date) : before.length ? day(before[before.length - 1].date) : day(until),
      daysNow: now.length,
      daysBefore: before.length,
    } as CloudflareState,
  };
}

async function googlePart(workspaceId: string, url: string, range: TrafficReport["range"], connectUrl: string) {
  const conn = await prisma.providerConnection.findUnique({
    where: { workspaceId_provider: { workspaceId, provider: "GOOGLE_SEARCH_CONSOLE" } },
    select: { status: true },
  });
  if (conn?.status !== "CONNECTED") return { state: { state: "missing", connectUrl } as GoogleState, data: null };

  try {
    const [dNow, dBefore, pNow, pBefore, qNow, qBefore, countries, devices] = await gscBatch(workspaceId, url, [
      { start: range.start, end: range.end, dimensions: ["date"] },
      { start: range.prevStart, end: range.prevEnd, dimensions: ["date"] },
      { start: range.start, end: range.end, dimensions: ["page"], rowLimit: 1000 },
      { start: range.prevStart, end: range.prevEnd, dimensions: ["page"], rowLimit: 1000 },
      { start: range.start, end: range.end, dimensions: ["query"], rowLimit: 1000 },
      { start: range.prevStart, end: range.prevEnd, dimensions: ["query"], rowLimit: 1000 },
      { start: range.start, end: range.end, dimensions: ["country"], rowLimit: 100 },
      { start: range.start, end: range.end, dimensions: ["device"] },
    ]);
    const byDate = (rows: GscRow[]) => new Map(rows.map((r): [string, { clicks: number; impressions: number; position: number }] => [r.keys[0] ?? "", { clicks: r.clicks, impressions: r.impressions, position: r.position }]));
    return {
      state: { state: "ok" } as GoogleState,
      data: { dailyNow: byDate(dNow), dailyBefore: byDate(dBefore), pagesNow: pNow, pagesBefore: pBefore, queriesNow: qNow, queriesBefore: qBefore, countries, devices },
    };
  } catch (error) {
    const message =
      error instanceof SitePermissionError
        ? `The connected Google account has no Search Console access to ${url}. Add the site in Search Console or reconnect with the account that owns it.`
        : error instanceof ProviderNotConnectedError || /reconnect/i.test(error instanceof Error ? error.message : "")
          ? "Google asked to reconnect Search Console."
          : "Search Console didn't answer. Try again in a minute.";
    console.warn("[traffic report] search console", error instanceof Error ? error.message : error);
    return { state: { state: "error", message, connectUrl } as GoogleState, data: null };
  }
}
