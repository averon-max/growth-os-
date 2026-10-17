import { classifySearchIntent } from "../content/seo-strategy";
import type { RelatedKeywordResult } from "./dataforseo-provider";

/** One real observed query, never model-invented. */
export interface KeywordObservationV2 {
  keyword: string;
  searchVolume: number | null;
  keywordDifficulty: number | null;
  cpc: number | null;
  impressions?: number;
  clicks?: number;
  position?: number | null;
  /** DataForSEO's historical absolute monthly volumes, if returned. */
  monthlySearches?: RelatedKeywordResult["monthlySearches"];
  /** DataForSEO changes expressed as percentages, not absolute search volume. */
  trend?: RelatedKeywordResult["trend"];
  /** Google Trends related query score (relative only, not search volume). */
  googleTrendsTop?: number | null;
  /** Google Trends rising query change percentage (not absolute volume). */
  googleTrendsRising?: number | null;
  source: "DATAFORSEO" | "GSC" | "SEED";
}

export type KeywordCleanupReasonV2 =
  | "DUPLICATE_QUERY"
  | "IRRELEVANT_BUSINESS"
  | "FOREIGN_BRAND"
  | "CANNIBALIZATION"
  | "INVALID_QUERY"
  | "SEPARATE_PAGE_INTENT"
  | "TOPIC_SCOPE_MISMATCH"
  | "INTENT_REVIEW_REQUIRED";

export interface KeywordCandidateV2 extends KeywordObservationV2 {
  id: string;
  normalized: string;
  intent: ReturnType<typeof classifySearchIntent>;
  clusterId: string;
  opportunityScore: number;
  sources: ("DATAFORSEO" | "GSC" | "SEED")[];
}

export interface KeywordExclusionV2 {
  keyword: string;
  reason: KeywordCleanupReasonV2;
}

export interface KeywordClusterV2 {
  id: string;
  intent: KeywordCandidateV2["intent"];
  primary: KeywordCandidateV2;
  keywords: KeywordCandidateV2[];
  opportunityScore: number;
}

export interface KeywordCleanupResultV2 {
  version: "KEYWORD_CLEANUP_V2";
  observed: number;
  candidates: KeywordCandidateV2[];
  clusters: KeywordClusterV2[];
  excluded: KeywordExclusionV2[];
}

export function normalizeKeywordV2(value: string): string {
  return value.toLocaleLowerCase("en-US").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ").trim();
}

const STOP = new Set(["a", "an", "the", "for", "to", "of", "in", "on", "how", "what",
  "is", "are", "do", "does", "i", "my", "vs", "versus", "compare", "comparison",
  "difference", "between", "best", "top", "guide", "review", "reviews", "online"]);

function semanticKey(value: string): string {
  return [...new Set(normalizeKeywordV2(value).split(" ")
    .filter(token => token.length > 1 && !STOP.has(token)))].sort().join(" ");
}

function stableId(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  }
  return (hash >>> 0).toString(36);
}

function validNumber(value: number | null | undefined): number | null {
  return value !== null && value !== undefined && Number.isFinite(value) && value >= 0
    ? value : null;
}

function score(candidate: KeywordObservationV2): number {
  const volume = validNumber(candidate.searchVolume);
  const kd = validNumber(candidate.keywordDifficulty);
  const impressions = validNumber(candidate.impressions) ?? 0;
  const position = validNumber(candidate.position);
  // Unknown KD and volume remain UNKNOWN; neither becomes a fake easy/zero metric.
  const demand = volume === null ? 0 : Math.min(30, Math.log1p(volume) / Math.log1p(10000) * 30);
  const competition = kd === null ? 0 : Math.max(-18, 20 - kd * 0.4);
  const gsc = Math.min(24, Math.log1p(impressions) / Math.log1p(5000) * 18);
  const nearWin = position !== null && position >= 4 && position <= 20 ? 12 : 0;
  const evidence = (volume !== null ? 4 : 0) + (kd !== null ? 4 : 0) +
    (impressions > 0 ? 6 : 0);
  // Provider percentages and Google Trends related-interest scores are
  // bounded auxiliary signals; never interpret either as monthly searches.
  const quarterlyChange = candidate.trend?.quarterly ?? candidate.trend?.yearly ?? null;
  const momentum = quarterlyChange !== null && Number.isFinite(quarterlyChange)
    ? Math.max(-8, Math.min(8, quarterlyChange / 12.5)) : 0;
  const rising = validNumber(candidate.googleTrendsRising);
  const top = validNumber(candidate.googleTrendsTop);
  const trendEvidence = rising !== null ? Math.min(6, 1 + Math.log1p(rising) / 2)
    : top !== null ? Math.min(3, 1 + top / 50) : 0;
  return Math.round((20 + demand + competition + gsc + nearWin + evidence +
    momentum + trendEvidence) * 100) / 100;
}

export function prepareKeywordOpportunitiesV2({
  seed, industry, observations, publishedKeywords = [], limit = 500,
}: {
  seed: string;
  industry: string | null;
  observations: readonly KeywordObservationV2[];
  publishedKeywords?: readonly string[];
  limit?: number;
}): KeywordCleanupResultV2 {
  if (!seed.trim()) throw new Error("KEYWORD_V2_SEED_REQUIRED");
  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    throw new Error("KEYWORD_V2_LIMIT_INVALID");
  }
  const seedTerms = new Set(semanticKey(seed).split(" ").filter(Boolean));
  const industryTerms = new Set(semanticKey(industry ?? "").split(" ").filter(Boolean));
  const relevantTerms = new Set([...seedTerms, ...industryTerms]);
  const published = new Set(publishedKeywords.map(normalizeKeywordV2));
  const retained = new Map<string, KeywordCandidateV2>();
  const excluded: KeywordExclusionV2[] = [];
  let inspected = 0;
  // Count accepted distinct candidates, not raw rows: seed and GSC rows
  // must not arbitrarily discard relevant DataForSEO results.
  for (const item of observations) {
    // Inspect all supplied observations before selecting top N by actual
    // scored opportunity. GSC rows and provider ordering must not starve
    // later, stronger DataForSEO discoveries.
    inspected += 1;
    const normalized = normalizeKeywordV2(item.keyword ?? "");
    if (normalized.length < 3 || normalized.length > 180) {
      excluded.push({ keyword: item.keyword, reason: "INVALID_QUERY" });
      continue;
    }
    const already = retained.get(normalized);
    if (already) {
      already.sources = [...new Set([...already.sources, item.source])];
      if (already.searchVolume === null) already.searchVolume = validNumber(item.searchVolume);
      if (already.keywordDifficulty === null) already.keywordDifficulty = validNumber(item.keywordDifficulty);
      if (already.cpc === null) already.cpc = validNumber(item.cpc);
      if ((!already.monthlySearches || already.monthlySearches.length === 0) &&
        item.monthlySearches?.length) already.monthlySearches = item.monthlySearches;
      if (!already.trend && item.trend) already.trend = item.trend;
      if (already.googleTrendsTop == null && item.googleTrendsTop != null)
        already.googleTrendsTop = item.googleTrendsTop;
      if (already.googleTrendsRising == null && item.googleTrendsRising != null)
        already.googleTrendsRising = item.googleTrendsRising;
      if ((item.impressions ?? 0) > (already.impressions ?? 0)) {
        already.impressions = item.impressions;
        already.clicks = item.clicks;
        already.position = item.position;
      }
      excluded.push({ keyword: item.keyword, reason: "DUPLICATE_QUERY" });
      continue;
    }
    if (published.has(normalized)) {
      excluded.push({ keyword: item.keyword, reason: "CANNIBALIZATION" });
      continue;
    }
    const terms = semanticKey(item.keyword).split(" ").filter(Boolean);
    if (!terms.some(term => relevantTerms.has(term))) {
      excluded.push({ keyword: item.keyword, reason: "IRRELEVANT_BUSINESS" });
      continue;
    }
    const intent = classifySearchIntent(item.keyword);
    const canonical = semanticKey(item.keyword) || normalized;
    const candidate: KeywordCandidateV2 = {
      ...item,
      searchVolume: validNumber(item.searchVolume),
      keywordDifficulty: validNumber(item.keywordDifficulty),
      cpc: validNumber(item.cpc),
      normalized, intent,
      id: `kw_${stableId(normalized)}`,
      clusterId: `cl_${stableId(`${intent}:${canonical}`)}`,
      opportunityScore: score(item),
      sources: [item.source],
    };
    retained.set(normalized, candidate);
  }
  const candidates = [...retained.values()].map(candidate => ({
    ...candidate,
    opportunityScore: score(candidate),
  })).sort((a, b) =>
    b.opportunityScore - a.opportunityScore || a.normalized.localeCompare(b.normalized)
  ).slice(0, limit);
  const clustersById = new Map<string, KeywordCandidateV2[]>();
  for (const candidate of candidates) {
    const list = clustersById.get(candidate.clusterId) ?? [];
    list.push(candidate);
    clustersById.set(candidate.clusterId, list);
  }
  const clusters = [...clustersById.entries()].map(([id, keywords]) => ({
    id,
    intent: keywords[0]!.intent,
    primary: keywords[0]!,
    keywords,
    opportunityScore: keywords[0]!.opportunityScore,
  })).sort((a, b) =>
    b.opportunityScore - a.opportunityScore ||
    a.primary.normalized.localeCompare(b.primary.normalized)
  );
  return { version: "KEYWORD_CLEANUP_V2", observed: inspected,
    candidates, clusters, excluded };
}

export interface SerpOpportunityV2 {
  clusterId: string;
  query: string;
  organicResults: number;
  uniqueDomains: number;
  dominantPageType: string | null;
  pagesAnalyzed: number;
  features: string[];
  /** Actual organic positions observed in this saved SERP, never inferred. */
  topOrganic?: Array<{rank:number;domain:string;url:string}>;
  /** null means NOT OBSERVED within fetched SERP depth, not rank=0. */
  ownOrganicRank?: number | null;
  /** Research observations, NOT verified claims or ranking guarantees. */
  competitiveResearch?: {
    fetchedCompetitorPages: number;
    fetchFailures: number;
    observedQuestions: string[];
    aiOverviewPresent: boolean;
    commonSections: Array<{topic:string;pages:number;coveragePct:number}>;
    commonTerms: Array<{term:string;pages:number;coveragePct:number}>;
    benchmark: {
      medianWordCount: number|null;
      medianH2: number|null;
      medianH3: number|null;
    };
    competitorPages: Array<{
      rank:number;domain:string;url:string;fetched:boolean;
      statusCode?:number|null;
      pageType:string;title:string|null;h1:string|null;
      h2:string[];h3:string[];wordCount:number|null;
      schemaTypes:string[];tableCount:number;authorSignal:boolean;
      dateSignal:boolean;error:string|null;
    }>;
  };
  error?: string;
}

export interface KeywordOpportunityChoiceV2 {
  status: "SELECTED" | "REVIEW" | "NO_GO";
  selectedClusterId: string | null;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  reasons: string[];
  risks: string[];
}

/**
 * Autonomous, ZERO-model-call choice from actual ranked keyword clusters
 * AND a completed organic SERP. Missing metrics never imply easy rankings.
 * Ambiguous close-scoring opportunities remain REVIEW instead of fabricating
 * a confident winner.
 */
export function selectVerifiedKeywordOpportunityV2(
  clusters: readonly KeywordClusterV2[],
  serpResults: readonly SerpOpportunityV2[],
): KeywordOpportunityChoiceV2 {
  const eligible = clusters.flatMap(cluster => {
    const serp = serpResults.find(row =>
      row.clusterId === cluster.id &&
      row.query === cluster.primary.keyword &&
      !row.error && row.organicResults >= 3 &&
      row.uniqueDomains >= 2 && row.pagesAnalyzed >= 1);
    if (!serp) return [];
    const volume = validNumber(cluster.primary.searchVolume);
    const kd = validNumber(cluster.primary.keywordDifficulty);
    const observedRank = validNumber(cluster.primary.position);
    const impressions = validNumber(cluster.primary.impressions) ?? 0;
    const grounded = (volume !== null && kd !== null) ||
      (impressions > 0 && observedRank !== null);
    if (!grounded || !cluster.primary.sources.some(source =>
      source === "DATAFORSEO" || source === "GSC")) return [];
    return [cluster];
  }).sort((a,b) =>
    b.opportunityScore-a.opportunityScore ||
    a.primary.normalized.localeCompare(b.primary.normalized));
  const first = eligible[0], second = eligible[1];
  if (!first) return {
    status: "REVIEW", selectedClusterId: null, confidence: "LOW",
    reasons: ["NO_GROUNDED_SERP_AND_DEMAND_OR_GSC_OPPORTUNITY"],
    risks: ["Insufficient measured difficulty/demand or verified SERP"],
  };
  if (second && first.opportunityScore-second.opportunityScore < 5) return {
    status: "REVIEW", selectedClusterId: null, confidence: "LOW",
    reasons: ["MULTIPLE_CLOSE_SCORING_SERP_VERIFIED_CLUSTERS"],
    risks: ["Different reader/page intents may require separate pages"],
  };
  return {
    status: "SELECTED", selectedClusterId: first.id,
    confidence: "MEDIUM",
    reasons: ["DETERMINISTIC_SERP_VERIFIED_SELECTION_V1",
      "Observed demand/KD or real GSC positions",
      "Ranking is a prioritization estimate, not a guaranteed Google result"],
    risks: ["Human review still required before publishing"],
  };
}

/** JSON from GPT never creates its own keyword, metric, or candidate ID. */
export function validateKeywordOpportunityChoiceV2(
  value: unknown,
  candidates: readonly KeywordClusterV2[],
): KeywordOpportunityChoiceV2 {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("KEYWORD_V2_MODEL_RESPONSE_INVALID");
  }
  const row = value as Record<string, unknown>;
  if (row.status !== "SELECTED" && row.status !== "REVIEW" && row.status !== "NO_GO") {
    throw new Error("KEYWORD_V2_MODEL_STATUS_INVALID");
  }
  if (row.confidence !== "HIGH" && row.confidence !== "MEDIUM" &&
      row.confidence !== "LOW") {
    throw new Error("KEYWORD_V2_MODEL_CONFIDENCE_INVALID");
  }
  if (!Array.isArray(row.reasons) || !row.reasons.every(x => typeof x === "string") ||
      !Array.isArray(row.risks) || !row.risks.every(x => typeof x === "string")) {
    throw new Error("KEYWORD_V2_MODEL_REASONS_INVALID");
  }
  if (row.status === "SELECTED") {
    if (typeof row.selectedClusterId !== "string" ||
        !candidates.some(candidate => candidate.id === row.selectedClusterId)) {
      throw new Error("KEYWORD_V2_MODEL_INVENTED_CLUSTER");
    }
  } else if (row.selectedClusterId !== null) {
    throw new Error("KEYWORD_V2_NON_SELECTED_MUST_HAVE_NULL_CLUSTER");
  }
  return {
    status: row.status,
    selectedClusterId: row.status === "SELECTED" ? row.selectedClusterId as string : null,
    confidence: row.confidence,
    reasons: row.reasons.slice(0, 6) as string[],
    risks: row.risks.slice(0, 6) as string[],
  };
}
