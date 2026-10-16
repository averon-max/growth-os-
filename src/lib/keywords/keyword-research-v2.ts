import { prisma } from "@/lib/prisma";
import { parseCachedKeywordResearchV2, type KeywordResearchResultV2 } from "./keyword-research-cache-v2";
import { withKeywordResearchCheckpointV2 } from "./keyword-research-checkpoint-v2";
import { fetchRelatedKeywords } from "./dataforseo-provider";
import {createTopicScopedKeywordShortlistV1}
  from "./keyword-topic-scoped-shortlist-v1";
import { getWebsiteKeywordContext } from "@/lib/content/keyword-context";
import { fetchTrendingQueries } from "./trends-provider";
import { buildSerpIntelligence } from "@/lib/content/serp-intelligence";
import { prepareKeywordOpportunitiesV2, validateKeywordOpportunityChoiceV2,
  type KeywordObservationV2, type KeywordOpportunityChoiceV2, type SerpOpportunityV2,
} from "./keyword-intelligence-v2";

export interface KeywordResearchRequestV2 {
  websiteId: string;
  seed: string;
  market?: "US" | "CA" | "GB" | "AU";
  limit?: number;
  deepSerpLimit?: number;
  /** Must be explicit: true means paid DataForSEO and potentially OpenAI requests. */
  authorizePaidResearch: boolean;
  useGptDecision?: boolean;
}

const MARKET: Record<string, string> = {
  US: "United States", CA: "Canada", GB: "United Kingdom", AU: "Australia",
};

function safeInteger(value: number | undefined, fallback: number, max: number): number {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value < 1 || value > max) throw new Error("KEYWORD_V2_LIMIT_INVALID");
  return value;
}

function summarizeSerp(keyword: string, clusterId: string, serp:
  Awaited<ReturnType<typeof buildSerpIntelligence>>): SerpOpportunityV2 {
  return {
    query: keyword,
    clusterId,
    organicResults: serp.organic.length,
    uniqueDomains: new Set(serp.organic.map(x => x.domain)).size,
    dominantPageType: serp.benchmark.dominantPageType,
    pagesAnalyzed: serp.benchmark.analyzedPages,
    features: [...serp.serpFeatures],
  };
}

function reviewNeeded(reason: string): KeywordOpportunityChoiceV2 {
  return { status: "REVIEW", selectedClusterId: null,
    confidence: "LOW", reasons: [reason], risks: ["Keyword winner is not validated for publication"] };
}

/** A bounded research session. Paid APIs are never called without authorization. */
export async function researchKeywordOpportunitiesV2(input: KeywordResearchRequestV2): Promise<KeywordResearchResultV2> {
  const seed = input.seed.trim();
  if (!seed || seed.length > 180) throw new Error("KEYWORD_V2_SEED_REQUIRED");
  const limit = safeInteger(input.limit, 500, 500);
  const deepSerpLimit = input.deepSerpLimit === 0 ? 0
    : safeInteger(input.deepSerpLimit, 5, 10);
  const market = input.market ?? "US";
  if (!(market in MARKET)) throw new Error("KEYWORD_V2_MARKET_INVALID");

  const website = await prisma.website.findUnique({
    where: { id: input.websiteId },
    include: { business: true },
  });
  if (!website) throw new Error("KEYWORD_V2_WEBSITE_NOT_FOUND");
  if (!input.authorizePaidResearch) throw new Error("KEYWORD_V2_PAID_RESEARCH_NOT_AUTHORIZED");

  const cacheKey = [website.id, market, seed.trim().toLowerCase(), limit, deepSerpLimit, Boolean(input.useGptDecision), "topic-scope-v1"].join(":");
  const cache = await prisma.keywordSuggestionCache.findUnique({
    where: { normalized_source: { normalized: cacheKey, source: "KEYWORD_INTELLIGENCE_V2" } },
  });
  // This snapshot is reproducible and prevents paying again for a recent identical request.
  if (cache && Date.now() - cache.fetchedAt.getTime() < 24 * 3600 * 1000) {
    const snapshot = parseCachedKeywordResearchV2(cache.payload, {
      websiteId: website.id, cacheKey, seed, market,
    });
    if (snapshot) return snapshot;
  }

  const locationName = MARKET[market]!;
  // Depth=3 surfaces broader intent variants; one bounded provider call.
  const related = await withKeywordResearchCheckpointV2({
    stage: "DISCOVERY",
    key: [website.id, market, seed.toLowerCase(), limit, "depth3"].join(":"),
    isValid: (value): value is Awaited<ReturnType<typeof fetchRelatedKeywords>> =>
      Array.isArray(value) && value.every(row =>
        row && typeof row === "object" && typeof row.keyword === "string"),
    produce: () => fetchRelatedKeywords(seed, locationName, "English", 3, limit, true),
  });
  const [context, trends] = await Promise.all([
    getWebsiteKeywordContext(website.id).catch(() => null),
    fetchTrendingQueries(seed, market).catch(() => null),
  ]);
  const topTrends = new Map((trends?.topQueries ?? []).map(item => [
    item.query.trim().toLowerCase(), item.value,
  ] as const));
  const risingTrends = new Map((trends?.risingQueries ?? []).map(item => [
    item.query.trim().toLowerCase(), item.value,
  ] as const));
  const observations: KeywordObservationV2[] = [
    { keyword: seed, searchVolume: null, keywordDifficulty: null, cpc: null, source: "SEED" },
    ...(context?.topKeywords ?? []).map(keyword => ({
      keyword: keyword.keyword,
      searchVolume: keyword.volume,
      keywordDifficulty: keyword.difficulty,
      cpc: null,
      source: "GSC" as const,
      position: keyword.position,
      impressions: keyword.impressions,
      clicks: keyword.clicks,
    })),
    ...related.map(keyword => ({
      keyword: keyword.keyword,
      searchVolume: keyword.searchVolume,
      keywordDifficulty: keyword.keywordDifficulty,
      cpc: keyword.cpc,
      monthlySearches: keyword.monthlySearches,
      trend: keyword.trend,
      googleTrendsTop: topTrends.get(keyword.keyword.trim().toLowerCase()) ?? null,
      googleTrendsRising: risingTrends.get(keyword.keyword.trim().toLowerCase()) ?? null,
      source: "DATAFORSEO" as const,
    })),
  ];

  // Trend-only queries are real observed queries, but have unknown demand
  // and KD until measured by a source of absolute search statistics.
  for (const item of [...(trends?.topQueries ?? []), ...(trends?.risingQueries ?? [])]) {
    if (!observations.some(row => row.keyword.trim().toLowerCase() === item.query.trim().toLowerCase())) {
      observations.push({
        keyword: item.query, searchVolume: null, keywordDifficulty: null,
        cpc: null, source: "SEED",
        googleTrendsTop: topTrends.get(item.query.trim().toLowerCase()) ?? null,
        googleTrendsRising: risingTrends.get(item.query.trim().toLowerCase()) ?? null,
      });
    }
  }

  const existingBriefs = await prisma.contentBrief.findMany({
    where: { websiteId: website.id },
    select: { primaryKeyword: true, articles: { select: { status: true, publishedUrl: true } } },
    take: 200,
  });
  const published = existingBriefs.filter(brief =>
    brief.articles.some(article => article.status === "PUBLISHED" || Boolean(article.publishedUrl)))
    .map(brief => brief.primaryKeyword);

  const cleanup = prepareKeywordOpportunitiesV2({
    seed, industry: website.business.industry, observations, publishedKeywords: published, limit,
  });

  // This must happen BEFORE selecting by volume / keyword difficulty and
  // BEFORE any paid SERP calls. "credit monitoring" is the core entity;
  // "credit score", Credit Karma support, and Equifax product navigation
  // are different intents even when they share the word "credit".
  const scoped=createTopicScopedKeywordShortlistV1({
    seed,candidates:cleanup.candidates,maxClusters:30,
  });
  const cheapSerpByKeyword = new Map(related.map(row => [
    row.keyword.trim().toLowerCase(), row.serpInfo ?? null,
  ] as const));
  const shortlist = scoped.clusters
    .sort((a, b) => {
      const aInfo = cheapSerpByKeyword.get(a.primary.keyword.trim().toLowerCase());
      const bInfo = cheapSerpByKeyword.get(b.primary.keyword.trim().toLowerCase());
      const aEvidence = (aInfo?.features.length ?? 0) + (aInfo?.resultCount !== null && aInfo?.resultCount !== undefined ? 1 : 0);
      const bEvidence = (bInfo?.features.length ?? 0) + (bInfo?.resultCount !== null && bInfo?.resultCount !== undefined ? 1 : 0);
      return b.opportunityScore - a.opportunityScore || bEvidence - aEvidence;
    }).slice(0, 10);
  const serpResults: SerpOpportunityV2[] = [];
  for (const cluster of shortlist.slice(0, deepSerpLimit)) {
    try {
      const serpSummary = await withKeywordResearchCheckpointV2({
        stage: "SERP",
        key: [website.id, market, cluster.id, cluster.primary.keyword].join(":"),
        isValid: (value): value is SerpOpportunityV2 => {
          if (!value || typeof value !== "object" || Array.isArray(value)) return false;
          const row = value as Record<string, unknown>;
          return row.clusterId === cluster.id && row.query === cluster.primary.keyword &&
            typeof row.organicResults === "number" && row.organicResults >= 0 &&
            typeof row.uniqueDomains === "number" && row.uniqueDomains >= 0 &&
            Array.isArray(row.features);
        },
        produce: async () => {
          const serp = await buildSerpIntelligence({ keyword: cluster.primary.keyword,
            locationName, languageName: "English" });
          return summarizeSerp(cluster.primary.keyword, cluster.id, serp);
        },
      });
      serpResults.push(serpSummary);
    } catch (error) {
      serpResults.push({ query: cluster.primary.keyword, clusterId: cluster.id, organicResults: 0,
        uniqueDomains: 0, dominantPageType: null, pagesAnalyzed: 0, features: [],
        error: error instanceof Error ? error.message.slice(0, 160) : "SERP_FAILED" });
    }
  }

  const verifiedSerp = serpResults.filter(result =>
    !result.error && result.organicResults >= 3 && result.uniqueDomains >= 2
  );
  const verifiedClusterIds = new Set(verifiedSerp.map(result => result.clusterId));
  const eligibleForGpt = shortlist.filter(cluster => verifiedClusterIds.has(cluster.id));
  let decision: KeywordOpportunityChoiceV2 = shortlist.length
    ? reviewNeeded(eligibleForGpt.length
      ? "SERP-verified opportunities found. GPT decision not requested."
      : "No SERP-verified opportunity: review source reliability before choosing a primary.")
    : { status: "NO_GO", selectedClusterId: null, confidence: "LOW",
      reasons: ["No eligible candidates"], risks: [] };
  if (input.useGptDecision && eligibleForGpt.length) {
    const { default: OpenAI } = await import("openai");
    if (!process.env.OPENAI_API_KEY) throw new Error("KEYWORD_V2_OPENAI_KEY_REQUIRED");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_CONTENT_MODEL || "gpt-5.6-luna",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Select an existing cluster ID based only on the supplied observations. Return JSON: status SELECTED or REVIEW or NO_GO, selectedClusterId string or null, confidence HIGH/MEDIUM/LOW, reasons string[], risks string[]. Do not invent search metrics." },
        { role: "user", content: JSON.stringify({ business: website.business.industry, market, seed,
          shortlist: eligibleForGpt.map(cluster => ({ id: cluster.id, keyword: cluster.primary.keyword,
            volume: cluster.primary.searchVolume, difficulty: cluster.primary.keywordDifficulty,
            gscImpressions: cluster.primary.impressions ?? null, score: cluster.opportunityScore,
            serp: serpResults.find(s => s.clusterId === cluster.id) ?? null })) }) },
      ],
    });
    const output = completion.choices[0]?.message?.content;
    if (!output) throw new Error("KEYWORD_V2_GPT_EMPTY");
    decision = validateKeywordOpportunityChoiceV2(JSON.parse(output), eligibleForGpt);
  }

  const result: KeywordResearchResultV2 = {
    version: "KEYWORD_INTELLIGENCE_RESEARCH_V2",
    approvedResearchKey: cacheKey,
    websiteId: website.id, market, seed,
    collectedAt: new Date().toISOString(),
    observed: cleanup.observed,
    excludedCount: cleanup.excluded.length+scoped.excluded.length,
    excluded: [...cleanup.excluded,...scoped.excluded],
    clusters: shortlist,
    // Preserve the complete observed candidate set for replay and audit;
    // the response UI can render only the ten strongest clusters.
    // Keep the raw observed candidates for reproducibility, including
    // rejected other-topic phrases. Only scoped clusters reach paid SERP.
    candidateSnapshots: cleanup.candidates,
    serpMetadata: related.map(row => ({
      keyword: row.keyword,
      resultCount: row.serpInfo?.resultCount ?? null,
      features: row.serpInfo?.features ?? [],
      updatedAt: row.serpInfo?.updatedAt ?? null,
    })),
    totalClusters: scoped.clusters.length,
    serpResults,
    decision,
    selectedKeyword: decision.status === "SELECTED"
      ? shortlist.find(cluster => cluster.id === decision.selectedClusterId)?.primary.keyword ?? null
      : null,
    cacheHit: false,
    aiUsed: Boolean(input.useGptDecision),
  };
  await prisma.keywordSuggestionCache.upsert({
    where: { normalized_source: { normalized: cacheKey, source: "KEYWORD_INTELLIGENCE_V2" } },
    create: { normalized: cacheKey, source: "KEYWORD_INTELLIGENCE_V2", payload: JSON.parse(JSON.stringify(result)) },
    update: { payload: JSON.parse(JSON.stringify(result)), fetchedAt: new Date() },
  });
  return result;
}
