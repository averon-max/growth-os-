import { prisma } from "@/lib/prisma";
import { fetchRelatedKeywords } from "./dataforseo-provider";
import { getWebsiteKeywordContext } from "@/lib/content/keyword-context";
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

function jsonRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

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
export async function researchKeywordOpportunitiesV2(input: KeywordResearchRequestV2) {
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

  const cacheKey = [website.id, market, seed.trim().toLowerCase(), limit, deepSerpLimit, Boolean(input.useGptDecision)].join(":");
  const cache = await prisma.keywordSuggestionCache.findUnique({
    where: { normalized_source: { normalized: cacheKey, source: "KEYWORD_INTELLIGENCE_V2" } },
  });
  // This snapshot is reproducible and prevents paying again for a recent identical request.
  if (cache && Date.now() - cache.fetchedAt.getTime() < 24 * 3600 * 1000) {
    const snapshot = jsonRecord(cache.payload);
    if (snapshot?.version === "KEYWORD_INTELLIGENCE_RESEARCH_V2") {
      return { ...snapshot, cacheHit: true };
    }
  }

  const locationName = MARKET[market]!;
  // Depth=3 surfaces broader intent variants; one bounded provider call.
  const related = await fetchRelatedKeywords(seed, locationName, "English", 3, limit);
  const context = await getWebsiteKeywordContext(website.id).catch(() => null);
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
      source: "DATAFORSEO" as const,
    })),
  ];

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
  const shortlist = cleanup.clusters.slice(0, 10);
  const serpResults: SerpOpportunityV2[] = [];
  for (const cluster of shortlist.slice(0, deepSerpLimit)) {
    try {
      const serp = await buildSerpIntelligence({ keyword: cluster.primary.keyword,
        locationName, languageName: "English" });
      serpResults.push(summarizeSerp(cluster.primary.keyword, cluster.id, serp));
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

  const result = {
    version: "KEYWORD_INTELLIGENCE_RESEARCH_V2" as const,
    approvedResearchKey: cacheKey,
    websiteId: website.id, market, seed,
    collectedAt: new Date().toISOString(),
    observed: cleanup.observed,
    excludedCount: cleanup.excluded.length,
    excluded: cleanup.excluded,
    clusters: shortlist,
    // Preserve the complete observed candidate set for replay and audit;
    // the response UI can render only the ten strongest clusters.
    candidateSnapshots: cleanup.candidates,
    totalClusters: cleanup.clusters.length,
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
