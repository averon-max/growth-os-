import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireWorkspaceAccess, authErrorResponse } from "@/lib/auth-helpers";
import { DataForSEOError } from "@/lib/keywords/dataforseo-provider";
import { getCachedRelatedKeywords, RateLimitError } from "@/lib/keywords/suggestion-cache";
import { fetchTrendingQueries } from "@/lib/keywords/trends-provider";
import { freeRelated, savedRelated } from "@/lib/keywords/free-suggest";

/*
 * Keyword ideas — сначала бесплатно:
 *   1) сохранённый ответ DataForSEO по этому сиду (любой давности) — 0$
 *   2) Google Autocomplete + уже известные объёмы из базы — 0$
 *   3) DataForSEO (volume, difficulty, CPC, trend) — about $0.02 per new seed, saved and reused for every account.
 *      Protected by the daily budget, the per-workspace daily limit and the trial cap. DATAFORSEO_SUGGEST_PAID=0 turns it off.
 *   4) Google Autocomplete + metrics already known — only when 3 is unavailable (budget reached, limit, outage).
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const workspaceId = req.nextUrl.searchParams.get("workspaceId");
    const seed = req.nextUrl.searchParams.get("seed")?.trim() ?? "";
    const limitParam = req.nextUrl.searchParams.get("limit");
    const limit = limitParam ? Math.min(50, Math.max(1, Number.parseInt(limitParam, 10) || 50)) : 50;
    const wantPaid = process.env.DATAFORSEO_SUGGEST_PAID !== "0" || req.nextUrl.searchParams.get("paid") === "1";
    let notice: string | null = null;

    if (workspaceId == null || workspaceId === "") {
      return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
    }
    if (seed === "") {
      return NextResponse.json({ error: "seed is required." }, { status: 400 });
    }

    await requireWorkspaceAccess(user.id, workspaceId);

    let suggestions = await savedRelated(seed);
    let source: "saved" | "paid" | "free" = "saved";

    if (suggestions == null && wantPaid) {
      try {
        suggestions = (await getCachedRelatedKeywords(workspaceId, seed, limit)).suggestions;
        source = "paid";
      } catch (err) {
        if ((err instanceof DataForSEOError || err instanceof RateLimitError) === false) throw err;
        suggestions = null;
        notice = err instanceof RateLimitError
          ? "Today's keyword data limit is used up, so new ideas are shown without volume and difficulty. Full data returns tomorrow."
          : "Keyword data is unavailable right now, so new ideas are shown without volume and difficulty. Try again later.";
      }
    }
    if (suggestions == null || suggestions.length === 0) {
      suggestions = await freeRelated(workspaceId, seed, limit);
      source = "free";
    }

    const sorted = [...suggestions].sort((a, b) => (b.searchVolume ?? -1) - (a.searchVolume ?? -1)).slice(0, limit);

    // Google Trends — бесплатно, сам кэшируется в базе; не ломаем ответ при сбое
    const trending = await fetchTrendingQueries(seed).catch(() => []);

    return NextResponse.json({ seed, suggestions: sorted, fromCache: source === "paid" ? false : true, source, trending, notice });
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
