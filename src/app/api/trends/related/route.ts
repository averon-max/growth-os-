import { NextRequest, NextResponse } from "next/server";
import { requireUser, authErrorResponse } from "@/lib/auth-helpers";
import { fetchTrendingQueries } from "@/lib/keywords/trends-provider";

/*
 * Rising and top related searches from Google Trends for one topic (Keyword Planner → Research).
 * Google Trends is free; results are cached for a week by fetchTrendingQueries, so this never spends DataForSEO.
 */
export async function GET(req: NextRequest) {
  try {
    await requireUser();
    const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80);
    const geo = (req.nextUrl.searchParams.get("geo") || "US").trim().slice(0, 2).toUpperCase();
    if (!q) return NextResponse.json({ seed: "", topQueries: [], risingQueries: [] });
    const result = await fetchTrendingQueries(q, geo);
    return NextResponse.json({ seed: q, topQueries: result?.topQueries ?? [], risingQueries: result?.risingQueries ?? [] });
  } catch (err) {
    console.error("[trends/related error]", err);
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
