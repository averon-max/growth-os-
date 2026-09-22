import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireWorkspaceAccess, authErrorResponse } from "@/lib/auth-helpers";
import { DataForSEOError } from "@/lib/keywords/dataforseo-provider";
import { getCachedRelatedKeywords, RateLimitError } from "@/lib/keywords/suggestion-cache";
import { fetchTrendingQueries } from "@/lib/keywords/trends-provider";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const workspaceId = req.nextUrl.searchParams.get("workspaceId");
    const seed = req.nextUrl.searchParams.get("seed");
    const limitParam = req.nextUrl.searchParams.get("limit");
    const limit = limitParam ? Math.min(50, Math.max(1, Number.parseInt(limitParam, 10) || 30)) : 30;

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
    }
    if (!seed || !seed.trim()) {
      return NextResponse.json({ error: "seed is required." }, { status: 400 });
    }

    await requireWorkspaceAccess(user.id, workspaceId);

    const { suggestions, fromCache } = await getCachedRelatedKeywords(workspaceId, seed.trim(), limit);
    const sorted = [...suggestions].sort((a, b) => (b.searchVolume ?? 0) - (a.searchVolume ?? 0));

    // Best-effort and free -- never let a Trends failure break the response.
    const trending = await fetchTrendingQueries(seed.trim());

    return NextResponse.json({ seed: seed.trim(), suggestions: sorted, fromCache, trending });
  } catch (err) {
    if (err instanceof RateLimitError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    if (err instanceof DataForSEOError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error("[keywords/explore error]", err);
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
