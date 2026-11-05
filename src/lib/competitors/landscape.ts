import { dfs, num, str, rec } from "@/lib/dataforseo/client";
import { analyzeSite, getCachedPlannerReport } from "@/lib/planner/analyze";
import { isPlatform } from "./tracker";

// Average organic CTR by position: used to estimate how many clicks each result captures.
const CTR = [0.28, 0.15, 0.1, 0.07, 0.05, 0.04, 0.03, 0.025, 0.02, 0.018];
type Hit = { position: number; domain: string; url: string; title: string | null };
export type SerpHit = Hit & { clicks: number };
export interface LandscapeKeyword { keyword: string; volume: number | null; kd: number | null; ours: number | null; top: SerpHit[] }
export interface LandscapeDomain { domain: string; appearances: number; top3: number; avgPosition: number; clicks: number; keywords: { keyword: string; position: number; volume: number | null }[] }
export interface Landscape { domain: string; generatedAt: string; analyzed: number; keywords: LandscapeKeyword[]; domains: LandscapeDomain[]; errors: string[] }

const serpCache = new Map<string, { at: number; hits: Hit[] }>();

async function top10(keyword: string): Promise<Hit[]> {
  const hit = serpCache.get(keyword);
  if (hit && Date.now() - hit.at < 24 * 3600 * 1000) return hit.hits;
  const res = await dfs("serp/google/organic/live/regular", { keyword, location_name: "United States", language_name: "English", depth: 10 });
  const hits = ((rec(res[0]).items as unknown[] | undefined) ?? []).map(rec).filter((x) => x.type === "organic").slice(0, 10)
    .map((x) => ({ position: num(x.rank_group) ?? 0, domain: (str(x.domain) ?? "").replace(/^www\./, ""), url: str(x.url) ?? "", title: str(x.title) }));
  serpCache.set(keyword, { at: Date.now(), hits });
  return hits;
}

export async function buildLandscape(opts: { websiteId: string; workspaceId: string; siteUrl: string; limit?: number }): Promise<Landscape> {
  const ours = new URL(opts.siteUrl).hostname.replace(/^www\./, "");
  const isOurs = (d: string) => d === ours || d.endsWith("." + ours);
  const report = getCachedPlannerReport(opts.websiteId) ?? (await analyzeSite(opts));
  const tracked = (k: { sources: string[] }) => (k.sources.includes("Tracked") ? 1 : 0);
  const picked = [...report.keywords]
    .filter((k) => (k.volume ?? 0) > 0 || k.sources.includes("Tracked"))
    .sort((a, b) => tracked(b) - tracked(a) || (b.volume ?? 0) - (a.volume ?? 0))
    .slice(0, opts.limit ?? 30);

  const keywords: LandscapeKeyword[] = [];
  const errors: string[] = [];
  for (let i = 0; i < picked.length; i += 6) {
    const batch = await Promise.all(picked.slice(i, i + 6).map(async (k) => {
      try {
        const vol = k.volume ?? 0;
        const top = (await top10(k.keyword)).map((h) => ({ ...h, clicks: Math.round(vol * (CTR[h.position - 1] ?? 0.01)) }));
        const mine = top.find((h) => isOurs(h.domain));
        return { keyword: k.keyword, volume: k.volume, kd: k.kd, ours: mine ? mine.position : k.position, top };
      } catch (e) {
        errors.push((e as Error).message);
        return null;
      }
    }));
    for (const b of batch) if (b) keywords.push(b);
  }

  const agg = new Map<string, { domain: string; appearances: number; top3: number; posSum: number; clicks: number; keywords: { keyword: string; position: number; volume: number | null }[] }>();
  for (const k of keywords) for (const h of k.top) {
    if (isOurs(h.domain) || h.domain === "" || isPlatform(h.domain)) continue;
    const d = agg.get(h.domain) ?? { domain: h.domain, appearances: 0, top3: 0, posSum: 0, clicks: 0, keywords: [] };
    d.appearances += 1;
    if (h.position <= 3) d.top3 += 1;
    d.posSum += h.position;
    d.clicks += h.clicks;
    d.keywords.push({ keyword: k.keyword, position: h.position, volume: k.volume });
    agg.set(h.domain, d);
  }
  const domains = [...agg.values()]
    .map((d) => ({ domain: d.domain, appearances: d.appearances, top3: d.top3, clicks: d.clicks, keywords: d.keywords.sort((a, b) => a.position - b.position), avgPosition: Math.round((d.posSum / d.appearances) * 10) / 10 }))
    .sort((a, b) => b.clicks - a.clicks || b.appearances - a.appearances)
    .slice(0, 60);
  return { domain: ours, generatedAt: new Date().toISOString(), analyzed: keywords.length, keywords, domains, errors: [...new Set(errors)].slice(0, 3) };
}
