import { prisma } from "@/lib/prisma";
import { fetchRankedKeywords, fetchSearchVolume, fetchKeywordDifficulty } from "@/lib/keywords/dataforseo-provider";
import { fetchSitemapUrls } from "./sitemap";

export type KeywordSource = "GSC" | "Ranked" | "Article";
export interface PlannerKeyword {
  keyword: string; sources: KeywordSource[]; volume: number | null; kd: number | null; cpc: number | null;
  competition: number | null; position: number | null; impressions: number; clicks: number;
  page: string | null; pageCount: number; pages: string[]; intent: string; cluster: string;
}
export interface PlannerPage {
  url: string; path: string; keywords: number; topKeyword: string | null; clicks: number;
  impressions: number; bestPosition: number | null; hasArticle: boolean;
}
export interface PlannerCluster { name: string; keywords: number; volume: number; avgKd: number | null; avgPosition: number | null }
export interface PlannerReport {
  domain: string; generatedAt: string; fromCache: boolean;
  sitemap: { pages: number; sitemaps: number; source: string };
  totals: { keywords: number; volume: number; clicks: number; impressions: number; top3: number; top10: number; striking: number; gaps: number; cannibal: number; pagesWithoutKeywords: number };
  keywords: PlannerKeyword[]; pages: PlannerPage[]; clusters: PlannerCluster[]; warnings: string[];
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
const pathOf = (u: string) => { try { const x = new URL(u); return (x.pathname.replace(/\/+$/, "") || "/") ; } catch { return u; } };
const STOP = new Set("a an the and or of for to in on at by with is are be how what why when where which who vs best top free near me my your you do does can i get".split(" "));

function intentOf(k: string) {
  if (/\b(buy|price|pricing|cost|cheap|deal|coupon|discount|order|hire|quote)\b/.test(k)) return "Transactional";
  if (/\b(best|top|vs|versus|review|reviews|compare|comparison|alternative|alternatives)\b/.test(k)) return "Commercial";
  if (/\b(login|log in|sign in|app|download|official|website)\b/.test(k)) return "Navigational";
  return "Informational";
}

const cache = new Map<string, { at: number; report: PlannerReport }>();
const TTL = 30 * 60 * 1000;

export async function analyzeSite(opts: { websiteId: string; workspaceId: string; siteUrl: string; refresh?: boolean }): Promise<PlannerReport> {
  const hit = cache.get(opts.websiteId);
  if (hit && opts.refresh !== true && Date.now() - hit.at < TTL) return { ...hit.report, fromCache: true };

  const warnings: string[] = [];
  const origin = new URL(opts.siteUrl).origin;
  const domain = new URL(opts.siteUrl).hostname.replace(/^www\./, "");
  const map = new Map<string, PlannerKeyword>();
  const upsert = (text: string, src: KeywordSource) => {
    const key = norm(text);
    let k = map.get(key);
    if (k === undefined) {
      k = { keyword: key, sources: [], volume: null, kd: null, cpc: null, competition: null, position: null, impressions: 0, clicks: 0, page: null, pageCount: 0, pages: [], intent: intentOf(key), cluster: "" };
      map.set(key, k);
    }
    if (k.sources.includes(src) === false) k.sources.push(src);
    return k;
  };

  const [sitemap, gsc, articles] = await Promise.all([
    fetchSitemapUrls(opts.siteUrl).catch(() => ({ urls: [] as string[], sitemaps: [] as string[], source: "none" as const })),
    prisma.keyword.findMany({
      where: { workspaceId: opts.workspaceId },
      take: 5000,
      select: { text: true, volume: true, difficulty: true, cpc: true, snapshots: { where: { date: { gte: new Date(Date.now() - 28 * 864e5) } }, select: { position: true, clicks: true, impressions: true, pageUrl: true } } },
    }),
    prisma.contentArticle.findMany({ where: { brief: { websiteId: opts.websiteId } }, select: { publishedUrl: true, brief: { select: { primaryKeyword: true } } } }),
  ]);
  if (sitemap.sitemaps.length === 0) warnings.push("No sitemap found via robots.txt, /sitemap.xml or /sitemap_index.xml.");

  // 1. Search Console: real impressions, clicks, position and ranking page (only snapshots of this site).
  for (const row of gsc) {
    const snaps = row.snapshots.filter((s) => s.pageUrl === null || s.pageUrl.includes(domain));
    if (snaps.length === 0) continue;
    const k = upsert(row.text, "GSC");
    if (row.volume !== null) k.volume = row.volume;
    if (row.difficulty !== null) k.kd = row.difficulty;
    if (row.cpc !== null) k.cpc = Number(row.cpc);
    let wPos = 0;
    const byPage = new Map<string, number>();
    for (const s of snaps) {
      const imp = s.impressions ?? 0;
      k.impressions += imp;
      k.clicks += s.clicks ?? 0;
      if (s.position !== null) wPos += Number(s.position) * Math.max(imp, 1);
      if (s.pageUrl) byPage.set(s.pageUrl, (byPage.get(s.pageUrl) ?? 0) + imp + (s.clicks ?? 0) * 10);
    }
    const weight = snaps.reduce((n, s) => n + Math.max(s.impressions ?? 0, 1), 0);
    k.position = weight > 0 && wPos > 0 ? Math.round((wPos / weight) * 10) / 10 : null;
    const ranked = [...byPage.entries()].sort((a, b) => b[1] - a[1]);
    k.pages = ranked.map(([u]) => u);
    k.page = k.pages[0] ?? null;
  }
  if (gsc.length === 0) warnings.push("No Search Console data yet. Run Sync on the Keywords page.");

  // 2. Everything the domain ranks for in Google (DataForSEO Labs).
  try {
    for (const r of await fetchRankedKeywords(domain, "United States", "English", 500)) {
      const k = upsert(r.keyword, "Ranked");
      k.volume = k.volume ?? r.searchVolume;
      k.cpc = k.cpc ?? r.cpc;
      k.kd = k.kd ?? r.keywordDifficulty;
      if (k.position === null && r.rankGroup !== null) k.position = r.rankGroup;
      if (k.page === null && r.relativeUrl) { k.page = origin + r.relativeUrl; k.pages = [k.page]; }
    }
  } catch (e) {
    warnings.push(`Ranked keywords unavailable: ${(e as Error).message}`);
  }

  // 3. Keywords of written articles.
  for (const a of articles) {
    const k = upsert(a.brief.primaryKeyword, "Article");
    if (k.page === null && a.publishedUrl) { k.page = a.publishedUrl; k.pages = [a.publishedUrl]; }
  }

  // 4. Fill missing global metrics.
  const all = [...map.values()];
  const needVol = all.filter((k) => k.volume === null).map((k) => k.keyword).slice(0, 700);
  if (needVol.length > 0) {
    try {
      for (const v of await fetchSearchVolume(needVol)) {
        const k = map.get(norm(v.keyword));
        if (k) { k.volume = v.searchVolume; k.cpc = k.cpc ?? v.cpc; k.competition = v.competitionIndex; }
      }
    } catch (e) { warnings.push(`Search volume lookup failed: ${(e as Error).message}`); }
  }
  const needKd = all.filter((k) => k.kd === null).map((k) => k.keyword).slice(0, 1000);
  if (needKd.length > 0) {
    try {
      for (const d of await fetchKeywordDifficulty(needKd)) { const k = map.get(norm(d.keyword)); if (k) k.kd = d.keywordDifficulty; }
    } catch (e) { warnings.push(`Keyword difficulty lookup failed: ${(e as Error).message}`); }
  }

  // 5. Clusters by the most shared meaningful word.
  const freq = new Map<string, number>();
  const toks = (k: string) => [...new Set(k.split(" ").filter((t) => t.length > 2 && STOP.has(t) === false))];
  for (const k of all) for (const t of toks(k.keyword)) freq.set(t, (freq.get(t) ?? 0) + 1);
  for (const k of all) {
    const t = toks(k.keyword).sort((a, b) => (freq.get(b) ?? 0) - (freq.get(a) ?? 0) || b.length - a.length);
    k.cluster = t[0] ?? k.keyword;
    k.pageCount = k.pages.length;
  }
  const cl = new Map<string, PlannerKeyword[]>();
  for (const k of all) cl.set(k.cluster, [...(cl.get(k.cluster) ?? []), k]);
  const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
  const clusters = [...cl.entries()]
    .filter(([, ks]) => ks.length > 1)
    .map(([name, ks]) => ({
      name, keywords: ks.length, volume: ks.reduce((n, k) => n + (k.volume ?? 0), 0),
      avgKd: avg(ks.flatMap((k) => (k.kd === null ? [] : [k.kd]))),
      avgPosition: avg(ks.flatMap((k) => (k.position === null ? [] : [k.position]))),
    }))
    .sort((a, b) => b.volume - a.volume);

  // 6. Pages from the sitemap with their keywords.
  const articlePaths = new Set(articles.flatMap((a) => (a.publishedUrl ? [pathOf(a.publishedUrl)] : [])));
  const byPath = new Map<string, PlannerKeyword[]>();
  for (const k of all) if (k.page) { const p = pathOf(k.page); byPath.set(p, [...(byPath.get(p) ?? []), k]); }
  const pages: PlannerPage[] = sitemap.urls.map((url) => {
    const path = pathOf(url);
    const ks = (byPath.get(path) ?? []).sort((a, b) => b.clicks - a.clicks || (b.volume ?? 0) - (a.volume ?? 0));
    const positions = ks.flatMap((k) => (k.position === null ? [] : [k.position]));
    return {
      url, path, keywords: ks.length, topKeyword: ks[0]?.keyword ?? null,
      clicks: ks.reduce((n, k) => n + k.clicks, 0), impressions: ks.reduce((n, k) => n + k.impressions, 0),
      bestPosition: positions.length ? Math.min(...positions) : null, hasArticle: articlePaths.has(path),
    };
  });

  all.sort((a, b) => b.clicks - a.clicks || (b.volume ?? 0) - (a.volume ?? 0));
  const pos = (k: PlannerKeyword, lo: number, hi: number) => (k.position === null ? false : k.position >= lo && k.position <= hi);
  const report: PlannerReport = {
    domain, generatedAt: new Date().toISOString(), fromCache: false,
    sitemap: { pages: sitemap.urls.length, sitemaps: sitemap.sitemaps.length, source: sitemap.source },
    totals: {
      keywords: all.length, volume: all.reduce((n, k) => n + (k.volume ?? 0), 0),
      clicks: all.reduce((n, k) => n + k.clicks, 0), impressions: all.reduce((n, k) => n + k.impressions, 0),
      top3: all.filter((k) => pos(k, 0, 3)).length, top10: all.filter((k) => pos(k, 0, 10)).length,
      striking: all.filter((k) => pos(k, 4, 20)).length, gaps: all.filter((k) => k.page === null).length,
      cannibal: all.filter((k) => k.pageCount > 1).length, pagesWithoutKeywords: pages.filter((p) => p.keywords === 0).length,
    },
    keywords: all, pages, clusters, warnings,
  };
  cache.set(opts.websiteId, { at: Date.now(), report });
  return report;
}
