import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireWebsiteAccess, authErrorResponse } from "@/lib/auth-helpers";
import { savedPlannerReport } from "@/lib/planner/analyze";
import { fetchTrendingQueries } from "@/lib/keywords/trends-provider";

export const runtime = "nodejs";

/**
 * SEO audit → Keywords: every keyword the site is known for (saved Keyword Planner report: Search Console,
 * tracked and ranked keywords) with its Google position, plus Google Trends ideas close in meaning.
 * Free: only saved data and Google Trends, never DataForSEO.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const websiteId = req.nextUrl.searchParams.get("websiteId") ?? "";
    if (websiteId === "") return NextResponse.json({ error: "websiteId is required." }, { status: 400 });
    const website = await requireWebsiteAccess(user.id, websiteId);
    const report = await savedPlannerReport(websiteId);
    const keywords = (report?.keywords ?? [])
      .map((k) => ({ keyword: k.keyword, position: k.position, volume: k.volume, clicks: k.clicks, impressions: k.impressions, page: k.page }))
      .sort((a, b) => (a.position ?? 999) - (b.position ?? 999) || (b.volume ?? 0) - (a.volume ?? 0));
    const seed =
      [...(report?.keywords ?? [])].sort((a, b) => b.impressions - a.impressions || (b.volume ?? 0) - (a.volume ?? 0))[0]?.keyword ??
      new URL(website.url).hostname.replace(/^www\./, "").split(".")[0];
    const trends = await fetchTrendingQueries(seed).catch(() => null);
    return NextResponse.json({
      seed,
      updatedAt: report?.generatedAt ?? null,
      keywords,
      rising: trends?.risingQueries.slice(0, 12) ?? [],
      top: trends?.topQueries.slice(0, 12) ?? [],
    });
  } catch (err) {
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
