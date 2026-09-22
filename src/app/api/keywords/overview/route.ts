import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireWorkspaceAccess, authErrorResponse } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { normalizeKeyword } from "@/lib/keywords/normalize";
import { fetchSearchVolume, fetchKeywordDifficulty } from "@/lib/keywords/dataforseo-provider";
import type { Prisma } from "@prisma/client";

const SOURCE = "DATAFORSEO_RELATED";
const VOLUME_SOURCE = "DATAFORSEO_VOLUME";
const CACHE_TTL_DAYS = 30;

const MARKETS = [
  { code: "US", label: "US", flag: "🇺🇸", language: "English", locationName: "United States" },
  { code: "CA", label: "CA", flag: "🇨🇦", language: "English", locationName: "Canada" },
  { code: "GB", label: "GB", flag: "🇬🇧", language: "English", locationName: "United Kingdom" },
  { code: "AU", label: "AU", flag: "🇦🇺", language: "English", locationName: "Australia" },
];

function isFresh(fetchedAt: Date): boolean {
  return Date.now() - fetchedAt.getTime() < CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
}

interface MarketMetrics {
  volume: number | null;
  kd: number | null;
  cpc: number | null;
}

async function getMetricsForMarket(keywordText: string, market: string, language: string): Promise<MarketMetrics> {
  const normalized = normalizeKeyword(keywordText);
  const cacheKey = `${normalized}:${market}:${language}`;

  // Check volume cache first
  const cached = await prisma.keywordSuggestionCache.findUnique({
    where: { normalized_source: { normalized: cacheKey, source: VOLUME_SOURCE } },
  });
  if (cached && isFresh(cached.fetchedAt)) {
    const p = cached.payload as Record<string, unknown>;
    return {
      volume: typeof p.volume === "number" ? p.volume : null,
      kd: typeof p.kd === "number" ? p.kd : null,
      cpc: typeof p.cpc === "number" ? p.cpc : null,
    };
  }

  // Also check related keywords cache
  const relatedCacheKey = `${normalized}:${market}:${language}`;
  const relatedCached = await prisma.keywordSuggestionCache.findUnique({
    where: { normalized_source: { normalized: relatedCacheKey, source: SOURCE } },
  });
  if (relatedCached && isFresh(relatedCached.fetchedAt) && Array.isArray(relatedCached.payload)) {
    const item = (relatedCached.payload as Array<Record<string, unknown>>)
      .find((p) => typeof p.keyword === "string" && p.keyword === keywordText);
    if (item) {
      return {
        volume: typeof item.searchVolume === "number" ? item.searchVolume : null,
        kd: typeof item.keywordDifficulty === "number" ? item.keywordDifficulty : null,
        cpc: typeof item.cpc === "number" ? item.cpc : null,
      };
    }
  }

  // Fetch directly from DataForSEO
  const marketObj = MARKETS.find(m => m.code === market);
  if (!marketObj) return { volume: null, kd: null, cpc: null };

  try {
    const [volumeResults, diffResults] = await Promise.all([
      fetchSearchVolume([keywordText], marketObj.locationName, language),
      fetchKeywordDifficulty([keywordText], marketObj.locationName, language),
    ]);
    const vr = volumeResults[0];
    const dr = diffResults[0];
    const metrics: MarketMetrics = {
      volume: vr?.searchVolume ?? null,
      kd: dr?.keywordDifficulty ?? null,
      cpc: vr?.cpc ?? null,
    };
    // Cache the result
    await prisma.keywordSuggestionCache.upsert({
      where: { normalized_source: { normalized: cacheKey, source: VOLUME_SOURCE } },
      create: { normalized: cacheKey, source: VOLUME_SOURCE, payload: metrics as unknown as Prisma.InputJsonValue },
      update: { payload: metrics as unknown as Prisma.InputJsonValue, fetchedAt: new Date() },
    });
    return metrics;
  } catch {
    return { volume: null, kd: null, cpc: null };
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const sp = req.nextUrl.searchParams;
    const workspaceId = sp.get("workspaceId");
    const keywordText = sp.get("keyword");
    const market = sp.get("market") ?? "US";
    const language = sp.get("language") ?? "English";

    if (!workspaceId) return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
    if (!keywordText) return NextResponse.json({ error: "keyword is required." }, { status: 400 });

    await requireWorkspaceAccess(user.id, workspaceId);

    // Get metrics for selected market
    const [selectedMetrics, keyword] = await Promise.all([
      getMetricsForMarket(keywordText, market, language),
      prisma.keyword.findFirst({
        where: { workspaceId, text: keywordText },
        include: { marketMetrics: true },
      }),
    ]);

    // DB overrides cache if available
    const dbMetric = keyword?.marketMetrics.find(m => m.market === market && m.language === language);
    const metrics = {
      volume: dbMetric?.volume ?? selectedMetrics.volume,
      kd: dbMetric?.difficulty ?? selectedMetrics.kd,
      cpc: dbMetric?.cpc ? Number(dbMetric.cpc) : selectedMetrics.cpc,
      competitionIndex: dbMetric?.competitionIndex ?? null,
      intent: keyword?.intent ?? null,
    };

    // Monthly history — from US related cache (most complete)
    let monthlySearches: { year: number; month: number; searchVolume: number }[] = [];
    let trend: { yearly: number | null; quarterly: number | null; monthly: number | null } | null = null;

    const allRelated = await prisma.keywordSuggestionCache.findMany({ where: { source: SOURCE } });
    for (const cached of allRelated) {
      if (!Array.isArray(cached.payload)) continue;
      const item = (cached.payload as Array<Record<string, unknown>>)
        .find((p) => typeof p.keyword === "string" && p.keyword === keywordText);
      if (item) {
        monthlySearches = (item.monthlySearches as typeof monthlySearches) ?? [];
        trend = (item.trend as typeof trend) ?? null;
        break;
      }
    }

    // Global volumes for all markets — parallel
    const globalVolumes = await Promise.all(MARKETS.map(async (m) => {
      const dbM = keyword?.marketMetrics.find(mm => mm.market === m.code && mm.language === m.language);
      if (dbM?.volume) return { code: m.code, label: m.label, flag: m.flag, volume: dbM.volume };
      const cached = await getMetricsForMarket(keywordText, m.code, m.language);
      return { code: m.code, label: m.label, flag: m.flag, volume: cached.volume };
    }));

    return NextResponse.json({
      keyword: keywordText,
      monthlySearches: monthlySearches.sort((a, b) => a.year - b.year || a.month - b.month),
      trend,
      globalVolumes: globalVolumes.filter((g): g is { code: string; label: string; flag: string; volume: number } => g.volume !== null),
      metrics,
    });
  } catch (err) {
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
