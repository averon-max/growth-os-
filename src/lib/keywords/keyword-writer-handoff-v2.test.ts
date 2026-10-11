import { describe, expect, it } from "vitest";
import { prepareKeywordOpportunitiesV2 } from "./keyword-intelligence-v2";
import { projectApprovedKeywordEvidenceV2, type KeywordResearchResultV2 } from "./keyword-research-cache-v2";

function sample(): KeywordResearchResultV2 {
  const cleanup = prepareKeywordOpportunitiesV2({
    seed: "credit monitoring",
    industry: "credit monitoring",
    observations: Array.from({ length: 120 }, (_, index) => ({
      keyword: "credit monitoring option " + index,
      source: "DATAFORSEO" as const,
      searchVolume: 120 - index,
      keywordDifficulty: 20,
      cpc: null,
    })),
  });
  const winner = cleanup.candidates[119]!;
  const cluster = cleanup.clusters.find(item => item.id === winner.clusterId)!;
  return {
    version: "KEYWORD_INTELLIGENCE_RESEARCH_V2",
    approvedResearchKey: "research-key",
    websiteId: "site-1",
    market: "US",
    seed: "credit monitoring",
    collectedAt: new Date().toISOString(),
    observed: 120,
    excludedCount: 0,
    excluded: [],
    clusters: cleanup.clusters,
    candidateSnapshots: cleanup.candidates,
    serpMetadata: [],
    totalClusters: cleanup.clusters.length,
    serpResults: [],
    decision: { status: "SELECTED", selectedClusterId: cluster.id,
      confidence: "HIGH", reasons: [], risks: [] },
    selectedKeyword: winner.keyword,
    cacheHit: false,
    aiUsed: true,
  };
}

describe("V2 to Content Writer keyword handoff", () => {
  it("always includes the approved winner before the 80-keyword truncation", () => {
    const research = sample();
    const rows = projectApprovedKeywordEvidenceV2(research);
    expect(rows).toHaveLength(80);
    expect(rows[0]?.keyword).toBe(research.selectedKeyword);
    expect(rows[0]?.searchVolume).toBe(1);
    expect(new Set(rows.map(row => row.keyword)).size).toBe(80);
  });

  it("rejects a candidate invented after research", () => {
    const research = sample();
    expect(() => projectApprovedKeywordEvidenceV2({
      ...research, selectedKeyword: "totally invented",
    })).toThrow("KEYWORD_V2_WINNER_NOT_OBSERVED");
  });

  it("refuses research without a selected GPT winner", () => {
    const research = sample();
    expect(() => projectApprovedKeywordEvidenceV2({
      ...research,
      decision: { status: "REVIEW", selectedClusterId: null,
        confidence: "LOW", reasons: [], risks: [] },
    })).toThrow("KEYWORD_V2_WINNER_NOT_SELECTED");
  });
});
