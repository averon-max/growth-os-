import type { RelatedKeywordResult } from "./dataforseo-provider";
import {
  validateKeywordOpportunityChoiceV2,
  type KeywordCandidateV2,
  type KeywordCleanupReasonV2,
  type KeywordClusterV2,
  type KeywordOpportunityChoiceV2,
  type SerpOpportunityV2,
} from "./keyword-intelligence-v2";

export interface KeywordResearchResultV2 {
  version: "KEYWORD_INTELLIGENCE_RESEARCH_V2";
  approvedResearchKey: string;
  websiteId: string;
  market: "US" | "CA" | "GB" | "AU";
  seed: string;
  collectedAt: string;
  observed: number;
  excludedCount: number;
  excluded: Array<{ keyword: string; reason: KeywordCleanupReasonV2 }>;
  clusters: KeywordClusterV2[];
  candidateSnapshots: KeywordCandidateV2[];
  serpMetadata: Array<{
    keyword: string;
    resultCount: number | null;
    features: string[];
    updatedAt: string | null;
  }>;
  totalClusters: number;
  serpResults: SerpOpportunityV2[];
  decision: KeywordOpportunityChoiceV2;
  selectedKeyword: string | null;
  cacheHit: boolean;
  aiUsed: boolean;
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}

function keywordCluster(value: unknown): value is KeywordClusterV2 {
  const v = record(value);
  const primary = record(v?.primary);
  return Boolean(v &&
    typeof v.id === "string" && v.id.length > 0 &&
    typeof v.opportunityScore === "number" && Number.isFinite(v.opportunityScore) &&
    typeof v.intent === "string" &&
    Array.isArray(v.keywords) &&
    primary && typeof primary.id === "string" &&
    typeof primary.keyword === "string" && primary.keyword.length > 0 &&
    typeof primary.normalized === "string" &&
    typeof primary.clusterId === "string" &&
    primary.clusterId === v.id);
}

function candidate(value: unknown): value is KeywordCandidateV2 {
  const v = record(value);
  return Boolean(v && typeof v.id === "string" &&
    typeof v.keyword === "string" && typeof v.normalized === "string" &&
    typeof v.clusterId === "string" && Array.isArray(v.sources));
}

function serp(value: unknown): value is SerpOpportunityV2 {
  const v = record(value);
  return Boolean(v &&
    typeof v.clusterId === "string" && typeof v.query === "string" &&
    typeof v.organicResults === "number" && Number.isFinite(v.organicResults) &&
    typeof v.uniqueDomains === "number" && Number.isFinite(v.uniqueDomains) &&
    typeof v.pagesAnalyzed === "number" &&
    Array.isArray(v.features) && v.features.every(x => typeof x === "string"));
}

function meta(value: unknown): value is KeywordResearchResultV2["serpMetadata"][number] {
  const v = record(value);
  return Boolean(v && typeof v.keyword === "string" &&
    (v.resultCount === null || typeof v.resultCount === "number") &&
    (v.updatedAt === null || typeof v.updatedAt === "string") &&
    Array.isArray(v.features) && v.features.every(x => typeof x === "string"));
}

function exclusion(value: unknown): value is KeywordResearchResultV2["excluded"][number] {
  const v = record(value);
  return Boolean(v && typeof v.keyword === "string" && typeof v.reason === "string");
}

export function parseCachedKeywordResearchV2(
  value: unknown,
  expected: { websiteId: string; cacheKey: string; seed: string; market: "US" | "CA" | "GB" | "AU" },
): KeywordResearchResultV2 | null {
  const v = record(value);
  if (!v || v.version !== "KEYWORD_INTELLIGENCE_RESEARCH_V2" ||
    v.websiteId !== expected.websiteId ||
    v.approvedResearchKey !== expected.cacheKey ||
    v.seed !== expected.seed ||
    v.market !== expected.market ||
    typeof v.collectedAt !== "string" ||
    !Number.isFinite(Date.parse(v.collectedAt)) ||
    typeof v.observed !== "number" || !Number.isFinite(v.observed) ||
    typeof v.excludedCount !== "number" || !Number.isFinite(v.excludedCount) ||
    typeof v.totalClusters !== "number" || !Number.isFinite(v.totalClusters) ||
    typeof v.aiUsed !== "boolean" ||
    !Array.isArray(v.excluded) || !v.excluded.every(exclusion) ||
    !Array.isArray(v.clusters) || !v.clusters.every(keywordCluster) ||
    !Array.isArray(v.candidateSnapshots) || !v.candidateSnapshots.every(candidate) ||
    !Array.isArray(v.serpMetadata) || !v.serpMetadata.every(meta) ||
    !Array.isArray(v.serpResults) || !v.serpResults.every(serp)) return null;

  let decision: KeywordOpportunityChoiceV2;
  try {
    decision = validateKeywordOpportunityChoiceV2(v.decision, v.clusters);
  } catch {
    return null;
  }
  const winner = decision.status === "SELECTED"
    ? v.clusters.find(cluster => cluster.id === decision.selectedClusterId)?.primary.keyword ?? null
    : null;
  if (v.selectedKeyword !== winner) return null;
  if (winner && (!v.aiUsed || !v.serpResults.some(result =>
    result.clusterId === decision.selectedClusterId &&
    result.query === winner && !result.error &&
    result.organicResults >= 3 && result.uniqueDomains >= 2))) return null;

  return {
    version: "KEYWORD_INTELLIGENCE_RESEARCH_V2",
    approvedResearchKey: expected.cacheKey,
    websiteId: expected.websiteId,
    market: expected.market,
    seed: expected.seed,
    collectedAt: v.collectedAt,
    observed: v.observed,
    excludedCount: v.excludedCount,
    excluded: v.excluded,
    clusters: v.clusters,
    candidateSnapshots: v.candidateSnapshots,
    serpMetadata: v.serpMetadata,
    totalClusters: v.totalClusters,
    serpResults: v.serpResults,
    decision,
    selectedKeyword: winner,
    cacheHit: true,
    aiUsed: v.aiUsed,
  };
}

/**
 * Project approved, actually observed candidate metrics into the existing
 * Content Strategy's bounded 80-keyword input. Winner always goes first,
 * even when its original score ranks below 80 other candidates.
 *
 * No new keyword, difficulty, search volume or trend is synthesized.
 */
export function projectApprovedKeywordEvidenceV2(
  research: KeywordResearchResultV2,
  max = 80,
): RelatedKeywordResult[] {
  const selected = research.selectedKeyword?.trim();
  if (research.decision.status !== "SELECTED" || !selected) {
    throw new Error("KEYWORD_V2_WINNER_NOT_SELECTED");
  }
  if (!Number.isInteger(max) || max < 1 || max > 80) {
    throw new Error("KEYWORD_V2_PROJECTION_LIMIT_INVALID");
  }
  const normalize = (value: string) => value.trim().toLocaleLowerCase("en-US").replace(/\s+/g, " ");
  const key = normalize(selected);
  const winner = research.candidateSnapshots.find(candidate => normalize(candidate.keyword) === key);
  if (!winner) throw new Error("KEYWORD_V2_WINNER_NOT_OBSERVED");

  // The raw candidate archive intentionally includes wrong-page/product,
  // navigational and off-topic queries for audit. NEVER hand that archive
  // directly to Content Writer. Only previously approved topic-scoped
  // clusters are authorized as same-page supporting keyword evidence.
  const approvedKeys = new Set(research.clusters.flatMap(cluster =>
    cluster.keywords.map(candidate => normalize(candidate.keyword))));
  if (winner.clusterId !== research.decision.selectedClusterId ||
      !approvedKeys.has(key)) {
    throw new Error("KEYWORD_V2_WINNER_NOT_APPROVED_CLUSTER");
  }
  const toRelated = (candidate: KeywordCandidateV2): RelatedKeywordResult => ({
    keyword: candidate.keyword,
    searchVolume: candidate.searchVolume,
    keywordDifficulty: candidate.keywordDifficulty,
    cpc: candidate.cpc,
    competitionLevel: null,
    monthlySearches: candidate.monthlySearches ?? [],
    trend: candidate.trend ?? null,
  });
  const remaining = research.candidateSnapshots
    .filter(candidate =>
      normalize(candidate.keyword) !== key &&
      approvedKeys.has(normalize(candidate.keyword)));
  const seen = new Set<string>();
  return [winner, ...remaining].filter(candidate => {
    const normalized = normalize(candidate.keyword);
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  }).slice(0, max).map(toRelated);
}
