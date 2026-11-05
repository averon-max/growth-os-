import { dfs, num, rec } from "@/lib/dataforseo/client";
import { fetchRankedKeywords, type RankedKeywordResult } from "@/lib/keywords/dataforseo-provider";
import { analyzeSite, getCachedPlannerReport } from "@/lib/planner/analyze";

export interface Overview { keywords: number | null; etv: number | null; top3: number | null; top10: number | null; top20: number | null }
export interface CompKw { keyword: string; volume: number | null; kd: number | null; cpc: number | null; their: number | null; ours: number | null; page: string | null }
export interface CompStats { domain: string; overview: Overview; shared: number; gaps: number; beats: number; wins: number; keywords: CompKw[]; error: string | null }

const EMPTY: Overview = { keywords: null, etv: null, top3: null, top10: null, top20: null };
const cache = new Map<string, { at: number; ranked: RankedKeywordResult[]; overview: Overview }>();

export function normalizeDomain(input: string): string | null {
  const d = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/[/?#].*$/, "");
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d) && d.length <= 253 ? d : null;
}

async function load(domain: string) {
  const hit = cache.get(domain);
  if (hit && Date.now() - hit.at < 12 * 3600 * 1000) return hit;
  const [ov, ranked] = await Promise.all([
    dfs("dataforseo_labs/google/domain_rank_overview/live", { target: domain, location_name: "United States", language_name: "English" }).catch(() => []),
    fetchRankedKeywords(domain, "United States", "English", 500),
  ]);
  const m = rec(rec(rec(((rec(ov[0]).items as unknown[] | undefined) ?? [])[0]).metrics).organic);
  const p1 = num(m.pos_1) ?? 0, p23 = num(m.pos_2_3) ?? 0, p410 = num(m.pos_4_10) ?? 0, p1120 = num(m.pos_11_20) ?? 0;
  const has = num(m.count) === null ? false : true;
  const overview: Overview = { keywords: num(m.count), etv: num(m.etv), top3: has ? p1 + p23 : null, top10: has ? p1 + p23 + p410 : null, top20: has ? p1 + p23 + p410 + p1120 : null };
  const entry = { at: Date.now(), ranked, overview };
  cache.set(domain, entry);
  return entry;
}

export async function ourPositions(websiteId: string, workspaceId: string, siteUrl: string) {
  const report = getCachedPlannerReport(websiteId) ?? (await analyzeSite({ websiteId, workspaceId, siteUrl }));
  return new Map(report.keywords.map((k) => [k.keyword, k.position]));
}

export async function competitorStats(domain: string, ours: Map<string, number | null>): Promise<CompStats> {
  try {
    const { ranked, overview } = await load(domain);
    const keywords: CompKw[] = ranked.map((r) => ({
      keyword: r.keyword, volume: r.searchVolume, kd: r.keywordDifficulty, cpc: r.cpc, their: r.rankGroup,
      ours: ours.get(r.keyword.toLowerCase()) ?? null, page: r.relativeUrl ? `https://${domain}${r.relativeUrl}` : null,
    }));
    const isGap = (k: CompKw) => (k.their === null ? false : k.their <= 10) && (k.ours === null || k.ours > 20);
    const beat = (k: CompKw) => (k.their === null || k.ours === null ? false : k.their < k.ours);
    const win = (k: CompKw) => (k.their === null || k.ours === null ? false : k.ours < k.their);
    return {
      domain, overview, keywords, error: null,
      shared: keywords.filter((k) => (k.ours === null ? false : true)).length,
      gaps: keywords.filter(isGap).length, beats: keywords.filter(beat).length, wins: keywords.filter(win).length,
    };
  } catch (e) {
    return { domain, overview: EMPTY, shared: 0, gaps: 0, beats: 0, wins: 0, keywords: [], error: (e as Error).message };
  }
}

export async function ourKeywordList(websiteId: string, workspaceId: string, siteUrl: string) {
  const report = getCachedPlannerReport(websiteId) ?? (await analyzeSite({ websiteId, workspaceId, siteUrl }));
  return report.keywords.map((k) => ({ keyword: k.keyword, volume: k.volume, position: k.position, tracked: k.sources.includes("Tracked") }));
}
