import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireUser, requireWorkspaceAccess, authErrorResponse } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { normalizeKeyword } from "@/lib/keywords/normalize";
import { fetchKeywordOverview } from "@/lib/keywords/dataforseo-provider";
import { isFreshFor, keywordKeepDays } from "@/lib/dataforseo/keep-days";

/*
 * Keyword details panel.
 *
 * Cost, in order of preference:
 *   1. Free: the keyword is already in a saved idea list (that is how most people open it), or was opened before.
 *   2. One DataForSEO Labs "keyword overview" call for the chosen market (about $0.01), saved and reused by every account.
 * Other countries are only looked up when the user presses "Show other countries".
 * Before: Google Ads volume ($0.075) + difficulty ($0.01) for 4 countries, the US twice — about $0.40 a click.
 */

const OVERVIEW_SOURCE = "DATAFORSEO_OVERVIEW";
const RELATED_SOURCE = "DATAFORSEO_RELATED";

const MARKETS = [
  { code: "US", label: "US", flag: "🇺🇸", language: "English", locationName: "United States" },
  { code: "CA", label: "CA", flag: "🇨🇦", language: "English", locationName: "Canada" },
  { code: "GB", label: "GB", flag: "🇬🇧", language: "English", locationName: "United Kingdom" },
  { code: "AU", label: "AU", flag: "🇦🇺", language: "English", locationName: "Australia" },
] as const;

type Overview = {
  volume: number | null;
  kd: number | null;
  cpc: number | null;
  competitionIndex: number | null;
  intent: string | null;
  monthlySearches: { year: number; month: number; searchVolume: number }[];
  trend: { yearly: number | null; quarterly: number | null; monthly: number | null } | null;
};


/** The keyword inside any saved idea list for this market (newest first), found by the database, not by loading every list. */
async function fromSavedIdeas(keyword: string, market: string): Promise<Overview | null> {
  const rows = await prisma.$queryRaw<{ item: Record<string, unknown> }[]>`
    SELECT elem AS item
    FROM "KeywordSuggestionCache" c,
      jsonb_array_elements(CASE WHEN jsonb_typeof(c.payload) = 'array' THEN c.payload ELSE '[]'::jsonb END) elem
    WHERE c.source = ${RELATED_SOURCE}
      AND c.normalized LIKE ${`%:${market}:%`}
      AND c.payload @> ${JSON.stringify([{ keyword }])}::jsonb
      AND elem->>'keyword' = ${keyword}
    ORDER BY c."fetchedAt" DESC
    LIMIT 1`.catch(() => []);
  const it = rows[0]?.item;
  if (!it) return null;
  const num = (v: unknown) => (typeof v === "number" ? v : null);
  return {
    volume: num(it.searchVolume),
    kd: num(it.keywordDifficulty),
    cpc: num(it.cpc),
    competitionIndex: null,
    intent: null,
    monthlySearches: Array.isArray(it.monthlySearches) ? (it.monthlySearches as Overview["monthlySearches"]) : [],
    trend: (it.trend as Overview["trend"]) ?? null,
  };
}

async function overviewFor(keyword: string, marketCode: string, allowPaid: boolean, days: number): Promise<Overview | null> {
  const market = MARKETS.find((m) => m.code === marketCode) ?? MARKETS[0];
  const key = `${normalizeKeyword(keyword)}:${market.code}:${market.language}`;

  const saved = await prisma.keywordSuggestionCache.findUnique({ where: { normalized_source: { normalized: key, source: OVERVIEW_SOURCE } } });
  if (saved && isFreshFor(saved.fetchedAt, days)) return saved.payload as unknown as Overview;

  const idea = await fromSavedIdeas(keyword, market.code);
  if (idea && idea.volume !== null) return idea;

  if (!allowPaid) return saved ? (saved.payload as unknown as Overview) : null;

  try {
    const r = await fetchKeywordOverview(keyword, market.locationName, market.language);
    if (!r) return null;
    const value: Overview = {
      volume: r.searchVolume,
      kd: r.keywordDifficulty,
      cpc: r.cpc,
      competitionIndex: r.competition === null ? null : Math.round(r.competition * 100),
      intent: r.intent,
      monthlySearches: r.monthlySearches,
      trend: r.trend,
    };
    await prisma.keywordSuggestionCache.upsert({
      where: { normalized_source: { normalized: key, source: OVERVIEW_SOURCE } },
      create: { normalized: key, source: OVERVIEW_SOURCE, payload: value as unknown as Prisma.InputJsonValue },
      update: { payload: value as unknown as Prisma.InputJsonValue, fetchedAt: new Date() },
    });
    return value;
  } catch (error) {
    console.warn("[keyword overview]", error instanceof Error ? error.message : error);
    return saved ? (saved.payload as unknown as Overview) : null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const sp = req.nextUrl.searchParams;
    const workspaceId = sp.get("workspaceId");
    const keywordText = sp.get("keyword")?.trim();
    const market = (sp.get("market") ?? "US").toUpperCase();
    const allMarkets = sp.get("markets") === "all";

    if (!workspaceId) return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
    if (!keywordText) return NextResponse.json({ error: "keyword is required." }, { status: 400 });
    await requireWorkspaceAccess(user.id, workspaceId);

    const days = await keywordKeepDays();
    const [main, keyword] = await Promise.all([
      overviewFor(keywordText, market, true, days),
      prisma.keyword.findFirst({ where: { workspaceId, text: keywordText }, include: { marketMetrics: true } }),
    ]);

    // Numbers the workspace already stored for this keyword win over the shared cache.
    const dbMetric = keyword?.marketMetrics.find((m) => m.market === market);
    const metrics = {
      volume: dbMetric?.volume ?? main?.volume ?? null,
      kd: dbMetric?.difficulty ?? main?.kd ?? null,
      cpc: dbMetric?.cpc ? Number(dbMetric.cpc) : (main?.cpc ?? null),
      competitionIndex: dbMetric?.competitionIndex ?? main?.competitionIndex ?? null,
      intent: keyword?.intent ?? main?.intent ?? null,
    };

    // Other countries: free ones always; paid ones only after "Show other countries".
    const globalVolumes = await Promise.all(
      MARKETS.map(async (m) => {
        if (m.code === market) return { code: m.code, label: m.label, flag: m.flag, volume: metrics.volume };
        const dbM = keyword?.marketMetrics.find((mm) => mm.market === m.code);
        if (dbM?.volume) return { code: m.code, label: m.label, flag: m.flag, volume: dbM.volume };
        const o = await overviewFor(keywordText, m.code, allMarkets, days);
        return { code: m.code, label: m.label, flag: m.flag, volume: o?.volume ?? null };
      }),
    );
    const missing = globalVolumes.filter((g) => g.volume === null).length;

    return NextResponse.json({
      keyword: keywordText,
      // One point per month, the latest 12 (some saved idea lists carry years of history).
      monthlySearches: [...new Map((main?.monthlySearches ?? []).map((m) => [`${m.year}-${m.month}`, m])).values()]
        .sort((a, b) => a.year - b.year || a.month - b.month)
        .slice(-12),
      trend: main?.trend ?? null,
      globalVolumes: globalVolumes.filter((g): g is { code: (typeof MARKETS)[number]["code"]; label: (typeof MARKETS)[number]["label"]; flag: (typeof MARKETS)[number]["flag"]; volume: number } => g.volume !== null),
      otherMarketsAvailable: allMarkets ? 0 : missing,
      metrics,
    });
  } catch (err) {
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
