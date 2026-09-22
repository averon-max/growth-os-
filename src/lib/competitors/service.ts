import { prisma } from "@/lib/prisma";
import { crawlWebsite } from "@/lib/crawler/crawler";
import { getCachedRankedKeywords } from "@/lib/keywords/competitor-cache";
import { normalizeKeyword } from "@/lib/keywords/normalize";
import { addCompetitor, createSnapshot } from "./repository";

const GAP_KEYWORD_LIMIT = 20;
const RANKED_KEYWORD_FETCH_LIMIT = 50;

export interface AnalyzeCompetitorInput {
  workspaceId: string;
  websiteId: string;
  domain: string;
  name?: string;
}

/**
 * Runs a full competitor pass: free homepage structure scan (reuses the
 * same crawler/SSRF-safety code used for the user's own site) plus a
 * cached, rate-limited DataForSEO ranked-keywords lookup, then computes
 * which of the competitor's ranked keywords aren't in this workspace's
 * own tracked keyword set.
 */
export async function analyzeCompetitor(input: AnalyzeCompetitorInput) {
  const domain = input.domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  if (!domain) {
    throw new Error("A valid competitor domain is required.");
  }

  const competitor = await addCompetitor(input.websiteId, domain, input.name);

  const [crawled, ranked] = await Promise.all([
    crawlWebsite(`https://${domain}`, { maxPages: 1, maxDepth: 0 }).catch(() => []),
    getCachedRankedKeywords(input.workspaceId, domain, RANKED_KEYWORD_FETCH_LIMIT),
  ]);

  const homepage = crawled[0]?.parsed ?? null;

  const ownKeywords = await prisma.keyword.findMany({
    where: { workspaceId: input.workspaceId },
    select: { normalized: true },
  });
  const ownNormalized = new Set(ownKeywords.map((k) => k.normalized));

  const gapKeywords = ranked.items
    .filter((item) => item.searchVolume && item.searchVolume > 0)
    .filter((item) => !ownNormalized.has(normalizeKeyword(item.keyword)))
    .sort((a, b) => (b.searchVolume ?? 0) - (a.searchVolume ?? 0))
    .slice(0, GAP_KEYWORD_LIMIT);

  const topKeywords = [...ranked.items]
    .sort((a, b) => (b.searchVolume ?? 0) - (a.searchVolume ?? 0))
    .slice(0, GAP_KEYWORD_LIMIT);

  const snapshot = await createSnapshot({
    competitorId: competitor.id,
    title: homepage?.title ?? null,
    metaDescription: homepage?.metaDescription ?? null,
    h1: homepage?.h1 ?? null,
    wordCount: homepage?.wordCount ?? null,
    imagesCount: homepage?.imagesCount ?? null,
    imagesWithoutAlt: homepage?.imagesWithoutAlt ?? null,
    hasJsonLd: homepage?.hasJsonLd ?? null,
    rankedKeywordsCount: ranked.items.length,
    topKeywords,
    gapKeywords,
    fromCache: ranked.fromCache,
  });

  return { competitor, snapshot };
}
