import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireWebsiteAccess, authErrorResponse } from "@/lib/auth-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { dfs, num, str, rec } from "@/lib/dataforseo/client";
import { fetchRankedKeywords } from "@/lib/keywords/dataforseo-provider";
import { analyzeSite, getCachedPlannerReport } from "@/lib/planner/analyze";

export const runtime = "nodejs";
export const maxDuration = 120;
const SKIP = /(^|\.)(google|youtube|wikipedia|reddit|amazon|facebook|linkedin|quora|pinterest|instagram|twitter|tiktok|yelp|apple|microsoft|x)\.[a-z.]+$/i;
const cache = new Map<string, { at: number; body: unknown }>();

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const websiteId = req.nextUrl.searchParams.get("websiteId") ?? "";
    const refresh = req.nextUrl.searchParams.get("refresh") === "1";
    if (websiteId === "") return NextResponse.json({ error: "websiteId is required." }, { status: 400 });
    const website = await requireWebsiteAccess(user.id, websiteId);
    const domain = new URL(website.url).hostname.replace(/^www\./, "");

    const hit = cache.get(websiteId);
    if (hit && refresh === false && Date.now() - hit.at < 12 * 3600 * 1000) return NextResponse.json(hit.body);
    if (rateLimit("competitors:" + user.id, 20, 3600 * 1000) === false) return NextResponse.json({ error: "Too many competitor scans this hour." }, { status: 429 });

    const res = await dfs("dataforseo_labs/google/competitors_domain/live", { target: domain, location_name: "United States", language_name: "English", limit: 20, exclude_top_domains: true });
    const list = ((rec(res[0]).items as unknown[] | undefined) ?? []).map(rec).map((x) => {
      const m = rec(rec(x.full_domain_metrics).organic);
      const m2 = rec(rec(x.metrics).organic);
      return { domain: (str(x.domain) ?? "").replace(/^www\./, ""), shared: num(x.intersections), avgPosition: num(x.avg_position), etv: num(m.etv) ?? num(m2.etv), keywords: num(m.count) ?? num(m2.count) };
    }).filter((c) => c.domain && c.domain !== domain && SKIP.test(c.domain) === false).slice(0, 10);

    const report = getCachedPlannerReport(websiteId) ?? (await analyzeSite({ websiteId, workspaceId: website.business.workspaceId, siteUrl: website.url }));
    const ourPos = new Map(report.keywords.map((k) => [k.keyword, k.position]));
    const ranked = await Promise.all(list.slice(0, 5).map((c) => fetchRankedKeywords(c.domain, "United States", "English", 300).catch(() => null)));

    const competitors = list.map((c, i) => {
      const r = ranked[i];
      if (r === undefined || r === null) return { ...c, analyzed: false, gaps: [], beats: [] };
      const row = (x: (typeof r)[number]) => ({ keyword: x.keyword, volume: x.searchVolume, kd: x.keywordDifficulty, their: x.rankGroup, ours: ourPos.get(x.keyword.toLowerCase()) ?? null, url: x.relativeUrl });
      const byVol = (a: { volume: number | null }, b: { volume: number | null }) => (b.volume ?? 0) - (a.volume ?? 0);
      const gaps = r.filter((x) => (x.rankGroup === null ? false : x.rankGroup <= 10) && (ourPos.get(x.keyword.toLowerCase()) ?? 999) > 20).map(row).sort(byVol).slice(0, 80);
      const beats = r.filter((x) => {
        const o = ourPos.get(x.keyword.toLowerCase());
        return o === undefined || o === null || x.rankGroup === null ? false : x.rankGroup < o;
      }).map(row).sort(byVol).slice(0, 80);
      return { ...c, analyzed: true, gaps, beats };
    });
    const body = { domain, generatedAt: new Date().toISOString(), competitors };
    cache.set(websiteId, { at: Date.now(), body });
    return NextResponse.json(body);
  } catch (err) {
    console.error("[competitors/tracker error]", err);
    if (err instanceof Error && /DataForSEO/i.test(err.message)) return NextResponse.json({ error: err.message }, { status: 502 });
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
