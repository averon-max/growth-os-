import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { fetchRelatedKeywords, type RelatedKeywordResult } from "./dataforseo-provider";
import { normalizeKeyword } from "./normalize";
import { isFreshFor, keywordKeepDays } from "@/lib/dataforseo/keep-days";

const DAILY_EXPLORE_LIMIT = 20;
const SOURCE = "DATAFORSEO_RELATED";

export class RateLimitError extends Error {
  constructor(limit: number) {
    super(`Daily keyword-explore limit reached (${limit}/day). Try again tomorrow -- cached terms are always free.`);
    this.name = "RateLimitError";
  }
}


async function checkAndIncrementDailyLimit(workspaceId: string): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const counter = await prisma.apiUsageCounter.upsert({
    where: { workspaceId_counterType_date: { workspaceId, counterType: "KEYWORD_EXPLORE", date: today } },
    create: { workspaceId, counterType: "KEYWORD_EXPLORE", date: today, count: 0 },
    update: {},
  });

  if (counter.count >= DAILY_EXPLORE_LIMIT) {
    throw new RateLimitError(DAILY_EXPLORE_LIMIT);
  }

  await prisma.apiUsageCounter.update({
    where: { id: counter.id },
    data: { count: { increment: 1 } },
  });
}

export interface CachedSuggestionsResult {
  suggestions: RelatedKeywordResult[];
  fromCache: boolean;
}

/**
 * Cached, rate-limited wrapper around fetchRelatedKeywords().
 *
 * The cache is GLOBAL (keyed only by normalized seed, not by workspace) --
 * keyword statistics aren't sensitive per-user data, so sharing the cache
 * across every workspace maximizes free hits and minimizes real DataForSEO
 * spend. The daily rate limit IS per-workspace, and only counts on a real
 * cache miss -- a cache hit costs nothing and never touches the limit.
 */
export async function getCachedRelatedKeywords(
  workspaceId: string,
  seed: string,
  limit = 30,
  market = "US",
  language = "English",
  depth = 1,
): Promise<CachedSuggestionsResult> {
  const normalized = normalizeKeyword(seed);
  // Depth 1 gives about 8 ideas, depth 2 up to ~70. They are stored apart so a short old answer never hides a full one.
  const cacheKey = `${normalized}:${market}:${language}${depth > 1 ? `:d${depth}` : ""}`;

  const cached = await prisma.keywordSuggestionCache.findUnique({
    where: { normalized_source: { normalized: cacheKey, source: SOURCE } },
  });

  if (cached && isFreshFor(cached.fetchedAt, await keywordKeepDays())) {
    return { suggestions: cached.payload as unknown as RelatedKeywordResult[], fromCache: true };
  }

  await checkAndIncrementDailyLimit(workspaceId);

  const locationName =
    market === "CA" ? "Canada" :
    market === "GB" ? "United Kingdom" :
    market === "AU" ? "Australia" :
    "United States";

  const suggestions = await fetchRelatedKeywords(seed, locationName, language, depth, depth > 1 ? Math.max(limit, 100) : limit);

  await prisma.keywordSuggestionCache.upsert({
    where: { normalized_source: { normalized: cacheKey, source: SOURCE } },
    create: { normalized: cacheKey, source: SOURCE, payload: suggestions as unknown as Prisma.InputJsonValue },
    update: { payload: suggestions as unknown as Prisma.InputJsonValue, fetchedAt: new Date() },
  });

  return { suggestions, fromCache: false };
}
