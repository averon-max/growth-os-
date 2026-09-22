import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const googleTrends = require("google-trends-api");
import { normalizeKeyword } from "./normalize";

const TRENDS_CACHE_TTL_DAYS = 7;
const TRENDS_TIMEOUT_MS = 10000;
const SOURCE = "GOOGLE_TRENDS";

export interface TrendQuery {
  query: string;
  value: number;
}

export interface TrendsResult {
  topQueries: TrendQuery[];
  risingQueries: TrendQuery[];
}

function isFresh(fetchedAt: Date, ttlDays: number): boolean {
  return Date.now() - fetchedAt.getTime() < ttlDays * 24 * 60 * 60 * 1000;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Google Trends request timed out")), ms)),
  ]);
}

/**
 * Best-effort, FREE Google Trends lookup via the unofficial google-trends-api
 * package. This is NOT an official Google API -- Google actively rate-limits
 * and sometimes blocks it. Callers must treat a failure here as "no trend
 * data available right now", never as a hard error. Results are cached
 * aggressively (7 days) specifically to minimize how often this flaky
 * free endpoint gets hit at all.
 *
 * Returns null on any failure -- never throws.
 */
export async function fetchTrendingQueries(seed: string, geo = "US"): Promise<TrendsResult | null> {
  const normalized = normalizeKeyword(seed);
  const cacheKey = `${normalized}:${geo.toUpperCase()}`;

  const cached = await prisma.keywordSuggestionCache.findUnique({
    where: { normalized_source: { normalized: cacheKey, source: SOURCE } },
  });

  if (cached && isFresh(cached.fetchedAt, TRENDS_CACHE_TTL_DAYS)) {
    return cached.payload as unknown as TrendsResult;
  }

  try {
    const raw = await withTimeout(googleTrends.relatedQueries({ keyword: seed, geo }), TRENDS_TIMEOUT_MS);
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    const rankedList = parsed?.default?.rankedList ?? [];

    const topList = rankedList[0]?.rankedKeyword ?? [];
    const risingList = rankedList[1]?.rankedKeyword ?? [];

    const result: TrendsResult = {
      topQueries: topList.map((item: { query: string; value: number }) => ({ query: item.query, value: item.value })),
      risingQueries: risingList.map((item: { query: string; value: number }) => ({ query: item.query, value: item.value })),
    };

    await prisma.keywordSuggestionCache.upsert({
      where: { normalized_source: { normalized: cacheKey, source: SOURCE } },
      create: { normalized: cacheKey, source: SOURCE, payload: result as unknown as Prisma.InputJsonValue },
      update: { payload: result as unknown as Prisma.InputJsonValue, fetchedAt: new Date() },
    });

    return result;
  } catch (err) {
    console.error("[trends] Google Trends lookup failed, degrading gracefully:", err);
    return null;
  }
}

const DAILY_SOURCE = "GOOGLE_TRENDS_DAILY";
const DAILY_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours -- daily trends shift during the day

export interface DailyTrendItem {
  query: string;
  traffic: string;
}

/**
 * Best-effort, FREE global "what's trending today" list -- independent of any
 * seed keyword or industry. Same flaky-unofficial-API caveats as
 * fetchTrendingQueries apply: never throws, returns null on failure.
 */
export async function fetchDailyTrends(geo = "US"): Promise<DailyTrendItem[] | null> {
  const normalized = `daily:${geo.toLowerCase()}`;

  const cached = await prisma.keywordSuggestionCache.findUnique({
    where: { normalized_source: { normalized, source: DAILY_SOURCE } },
  });

  if (cached && Date.now() - cached.fetchedAt.getTime() < DAILY_TTL_MS) {
    return cached.payload as unknown as DailyTrendItem[];
  }

  try {
    const raw = await withTimeout(googleTrends.dailyTrends({ geo }), TRENDS_TIMEOUT_MS);
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    const searches = parsed?.default?.trendingSearchesDays?.[0]?.trendingSearches ?? [];

    const result: DailyTrendItem[] = searches
      .slice(0, 10)
      .map((item: { title: { query: string }; formattedTraffic?: string }) => ({
        query: item.title.query,
        traffic: item.formattedTraffic ?? "",
      }));

    await prisma.keywordSuggestionCache.upsert({
      where: { normalized_source: { normalized, source: DAILY_SOURCE } },
      create: { normalized, source: DAILY_SOURCE, payload: result as unknown as Prisma.InputJsonValue },
      update: { payload: result as unknown as Prisma.InputJsonValue, fetchedAt: new Date() },
    });

    return result;
  } catch (err) {
    console.error("[trends] Google daily trends lookup failed, degrading gracefully:", err);
    return null;
  }
}
