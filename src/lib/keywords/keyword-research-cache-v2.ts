import type { RelatedKeywordResult } from "./dataforseo-provider";
import {assessKeywordTopicIntentV1} from "./keyword-topic-intent-gate-v1";
import {auditDeepSerpReadinessV1} from "./keyword-deep-serp-readiness-v1";
import {
  validateKeywordOpportunityChoiceV2,
  selectVerifiedKeywordOpportunityV2,
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
  discoveryBreakdown?: {
    relatedRows:number;suggestionRows:number;gscRows:number;
    trendOnlyRows:number;expandedDiscovery:boolean;
  };
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
  requireDeepCompetitorEvidence?: boolean;
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
    Array.isArray(v.keywords) && v.keywords.length > 0 &&
    v.keywords.every(row =>
      candidate(row) && row.clusterId === v.id) &&
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

  // Old stored sessions can claim "approved" while containing brand
  // navigation, support and unrelated topics. Revalidate against the
  // CURRENT same-page topic/intent authority before trusting ANY selection.
  // Raw archives remain readable through read-only forensic diagnostics.
  if ((v.clusters as KeywordClusterV2[]).some(cluster =>
    !assessKeywordTopicIntentV1({seed:v.seed as string,
      query:cluster.primary.keyword}).eligibleForArticleSerp ||
    cluster.keywords.some(row =>
      !assessKeywordTopicIntentV1({seed:v.seed as string,
        query:row.keyword}).eligibleForArticleSerp)
  )) return null;

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
  if (winner && !v.serpResults.some(result =>
    result.clusterId === decision.selectedClusterId &&
    result.query === winner && !result.error &&
    result.organicResults >= 3 && result.uniqueDomains >= 2)) return null;
  if (winner && v.requireDeepCompetitorEvidence === true &&
    !v.serpResults.some(row =>
      row.query===winner && row.clusterId===decision.selectedClusterId &&
      auditDeepSerpReadinessV1(row).status==="DEEP_COMPETITOR_OBSERVED"))
    return null;
  if (winner && !v.aiUsed) {
    // A stored deterministic decision must reproduce EXACTLY from the
    // recorded clusters/SERP. Otherwise it is not approved authority.
    const expected = selectVerifiedKeywordOpportunityV2(
      v.clusters as KeywordClusterV2[],
      v.requireDeepCompetitorEvidence === true
        ?(v.serpResults as SerpOpportunityV2[]).filter(row =>
          auditDeepSerpReadinessV1(row).status==="DEEP_COMPETITOR_OBSERVED")
        :v.serpResults as SerpOpportunityV2[],
    );
    if (expected.status !== "SELECTED" ||
      expected.selectedClusterId !== decision.selectedClusterId ||
      !decision.reasons.includes("DETERMINISTIC_SERP_VERIFIED_SELECTION_V1"))
      return null;
  }

  return {
    version: "KEYWORD_INTELLIGENCE_RESEARCH_V2",
    approvedResearchKey: expected.cacheKey,
    websiteId: expected.websiteId,
    market: expected.market,
    seed: expected.seed,
    collectedAt: v.collectedAt,
    observed: v.observed,
    ...(record(v.discoveryBreakdown) && typeof record(v.discoveryBreakdown)?.relatedRows === "number" &&
      typeof record(v.discoveryBreakdown)?.suggestionRows === "number" &&
      typeof record(v.discoveryBreakdown)?.gscRows === "number" &&
      typeof record(v.discoveryBreakdown)?.trendOnlyRows === "number" &&
      typeof record(v.discoveryBreakdown)?.expandedDiscovery === "boolean"
      ?{discoveryBreakdown:{
        relatedRows:Number(record(v.discoveryBreakdown)?.relatedRows),
        suggestionRows:Number(record(v.discoveryBreakdown)?.suggestionRows),
        gscRows:Number(record(v.discoveryBreakdown)?.gscRows),
        trendOnlyRows:Number(record(v.discoveryBreakdown)?.trendOnlyRows),
        expandedDiscovery:record(v.discoveryBreakdown)?.expandedDiscovery === true,
      }}:{}),
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
    requireDeepCompetitorEvidence:v.requireDeepCompetitorEvidence===true,
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

  // Never trust even the cached cluster labels without checking current
  // topic/page-intent policy. No raw archive or selected keyword can bypass.
  const selectedCluster=research.clusters.find(cluster =>
    cluster.id===research.decision.selectedClusterId);
  if(!selectedCluster ||
    !assessKeywordTopicIntentV1({seed:research.seed,query:selected})
      .eligibleForArticleSerp) {
    throw new Error("KEYWORD_V2_WINNER_TOPIC_INTENT_NOT_APPROVED");
  }
  const normalizeApproved=(candidate:KeywordCandidateV2)=>normalize(candidate.keyword);
  const allowedByQuery=new Map<string,string>();
  for(const cluster of research.clusters){
    if(!assessKeywordTopicIntentV1({seed:research.seed,
        query:cluster.primary.keyword}).eligibleForArticleSerp)continue;
    for(const item of cluster.keywords){
      if(!assessKeywordTopicIntentV1({seed:research.seed,
          query:item.keyword}).eligibleForArticleSerp)continue;
      allowedByQuery.set(normalizeApproved(item),cluster.id);
    }
  }
  if(winner.clusterId!==research.decision.selectedClusterId ||
    allowedByQuery.get(key)!==winner.clusterId) {
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
      allowedByQuery.get(normalize(candidate.keyword))===candidate.clusterId);
  const seen = new Set<string>();
  return [winner, ...remaining].filter(candidate => {
    const normalized = normalize(candidate.keyword);
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  }).slice(0, max).map(toRelated);
}
