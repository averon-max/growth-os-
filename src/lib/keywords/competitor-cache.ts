import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { fetchRankedKeywords, type RankedKeywordResult } from "./dataforseo-provider";

// DataForSEO Labs Ranked Keywords data updates weekly -- see docs. Caching
// for 7 days means we never pay for data that hasn't actually changed yet.
const RANKED_CACHE_TTL_DAYS = 7;
const SOURCE = "DATAFORSEO_RANKED_KEYWORDS";
const DAILY_LIMIT_PER_WORKSPACE = 10;

export class RateLimitError extends Error {
  constructor(message = "Daily competitor lookup limit reached for this workspace.") {
    super(message);
    this.name = "RateLimitError";
  }
}

/**
 * Domains are not keywords -- normalizeKeyword() strips punctuation
 * including dots, which would mangle a domain. This just lowercases,
 * strips protocol/www/trailing slash, so "https://www.Example.com/" and
 * "example.com" hit the same cache entry.
 */
function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

function isFresh(fetchedAt: Date, ttlDays: number): boolean {
  return Date.now() - fetchedAt.getTime() < ttlDays * 24 * 60 * 60 * 1000;
}

async function checkAndIncrementDailyLimit(workspaceId: string): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const counter = await prisma.apiUsageCounter.upsert({
    where: { workspaceId_counterType_date: { workspaceId, counterType: "COMPETITOR_LOOKUP", date: today } },
    create: { workspaceId, counterType: "COMPETITOR_LOOKUP", date: today, count: 1 },
    update: { count: { increment: 1 } },
  });

  if (counter.count > DAILY_LIMIT_PER_WORKSPACE) {
    throw new RateLimitError();
  }
}

/**
 * Returns cached ranked-keyword data for a competitor domain when available
 * and fresh; otherwise checks the workspace's daily lookup limit, calls
 * DataForSEO, and caches the result globally (by domain, not by workspace --
 * a competitor domain looked up by two different workspaces is the same
 * real-world data and shouldn't cost twice).
 */
export async function getCachedRankedKeywords(
  workspaceId: string,
  domain: string,
  limit = 50
): Promise<{ items: RankedKeywordResult[]; fromCache: boolean }> {
  const normalized = normalizeDomain(domain);

  const cached = await prisma.keywordSuggestionCache.findUnique({
    where: { normalized_source: { normalized, source: SOURCE } },
  });

  if (cached && isFresh(cached.fetchedAt, RANKED_CACHE_TTL_DAYS)) {
    return { items: cached.payload as unknown as RankedKeywordResult[], fromCache: true };
  }

  await checkAndIncrementDailyLimit(workspaceId);

  const items = await fetchRankedKeywords(domain, undefined, undefined, limit);

  await prisma.keywordSuggestionCache.upsert({
    where: { normalized_source: { normalized, source: SOURCE } },
    create: { normalized, source: SOURCE, payload: items as unknown as Prisma.InputJsonValue },
    update: { payload: items as unknown as Prisma.InputJsonValue, fetchedAt: new Date() },
  });

  return { items, fromCache: false };
}
