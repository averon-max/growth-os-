import { describe, expect, it } from "vitest";
import { prepareKeywordOpportunitiesV2 } from "./keyword-intelligence-v2";
import { parseCachedKeywordResearchV2 } from "./keyword-research-cache-v2";

const expected = {
  websiteId: "website-one",
  cacheKey: "website-one:US:credit monitoring:500:5:true",
  seed: "credit monitoring",
  market: "US" as const,
};

function validSnapshot() {
  const cleanup = prepareKeywordOpportunitiesV2({
    seed: expected.seed,
    industry: "credit monitoring",
    observations: [
      { keyword: "credit monitoring benefits", source: "DATAFORSEO" as const,
        searchVolume: 140, keywordDifficulty: 16, cpc: 0.6 },
    ],
  });
  const cluster = cleanup.clusters[0]!;
  return {
    version: "KEYWORD_INTELLIGENCE_RESEARCH_V2",
    approvedResearchKey: expected.cacheKey,
    websiteId: expected.websiteId,
    market: expected.market,
    seed: expected.seed,
    collectedAt: new Date().toISOString(),
    observed: cleanup.observed,
    excludedCount: cleanup.excluded.length,
    excluded: cleanup.excluded,
    clusters: [cluster],
    candidateSnapshots: cleanup.candidates,
    serpMetadata: [{ keyword: cluster.primary.keyword, resultCount: 100, features: [], updatedAt: null }],
    totalClusters: cleanup.clusters.length,
    serpResults: [{
      clusterId: cluster.id, query: cluster.primary.keyword,
      organicResults: 3, uniqueDomains: 3, dominantPageType: "blog",
      pagesAnalyzed: 3, features: [],
    }],
    decision: {
      status: "SELECTED",
      selectedClusterId: cluster.id,
      confidence: "MEDIUM",
      reasons: ["SERP evidence"],
      risks: [],
    },
    selectedKeyword: cluster.primary.keyword,
    cacheHit: false,
    aiUsed: true,
  };
}

describe("Keyword Intelligence V2 cached research contract", () => {
  it("preserves the complete typed winner after a cache hit", () => {
    const snapshot = validSnapshot();
    const parsed = parseCachedKeywordResearchV2(snapshot, expected);
    expect(parsed?.cacheHit).toBe(true);
    expect(parsed?.decision.status).toBe("SELECTED");
    expect(parsed?.selectedKeyword).toBe(snapshot.selectedKeyword);
    expect(parsed?.candidateSnapshots).toHaveLength(1);
  });

  it("rejects an unrelated website and mismatched research key", () => {
    const snapshot = validSnapshot();
    expect(parseCachedKeywordResearchV2(snapshot, { ...expected, websiteId: "another" })).toBeNull();
    expect(parseCachedKeywordResearchV2(snapshot, { ...expected, cacheKey: "wrong" })).toBeNull();
  });

  it("rejects a winner that GPT did not select or SERP did not verify", () => {
    const snapshot = validSnapshot();
    expect(parseCachedKeywordResearchV2({
      ...snapshot, selectedKeyword: "invented keyword",
    }, expected)).toBeNull();
    expect(parseCachedKeywordResearchV2({
      ...snapshot, serpResults: [],
    }, expected)).toBeNull();
    expect(parseCachedKeywordResearchV2({
      ...snapshot, aiUsed: false,
    }, expected)).toBeNull();
  });

  it("rejects legacy research when approved clusters contain real navigational and vendor SERPs",()=>{
    const snapshot=validSnapshot();
    const original=snapshot.clusters[0]!;
    const bad={...original.primary,
      keyword:"credit karma phone number hours",
      normalized:"credit karma phone number hours",
      clusterId:"legacy_bad_support_cluster",
    };
    const badCluster={...original,id:"legacy_bad_support_cluster",
      primary:bad,keywords:[bad],opportunityScore:999};
    expect(parseCachedKeywordResearchV2({
      ...snapshot,clusters:[badCluster,...snapshot.clusters],
      candidateSnapshots:[bad,...snapshot.candidateSnapshots],
      serpResults:[...snapshot.serpResults,{
        clusterId:badCluster.id,query:bad.keyword,
        organicResults:9,uniqueDomains:9,
        dominantPageType:"OTHER",pagesAnalyzed:8,features:[],
      }],
    },expected)).toBeNull();
  });

  it("rejects partial and malformed cached JSON", () => {
    expect(parseCachedKeywordResearchV2({ version: "KEYWORD_INTELLIGENCE_RESEARCH_V2" }, expected)).toBeNull();
    expect(parseCachedKeywordResearchV2(null, expected)).toBeNull();
    expect(parseCachedKeywordResearchV2({
      ...validSnapshot(), clusters: [{ id: "fake", primary: null }],
    }, expected)).toBeNull();
  });
});
