import { describe, expect, it } from "vitest";
import type { ContentGenerationPolicyV1 } from "./content-generation-mode-v1";
import type { ContentStrategy } from "./types";
import { buildResearchDecisionV2 } from "./research-decision-v2";

const policy = {
  version: "CONTENT_GENERATION_POLICY_V1",
  mode: "EXACT_KEYWORD",
  requestedTopic: "what is credit monitoring",
  exactKeyword: "what is credit monitoring",
} as const satisfies ContentGenerationPolicyV1;

const strategy = {
  primary: {
    keyword: "what is credit monitoring",
    intent: "INFORMATIONAL",
    searchVolume: null,
    difficulty: 35,
    cpc: null,
    existingPosition: null,
    impressions: 0,
    clicks: 0,
    source: ["DATAFORSEO"],
  },
  secondary: [{ keyword: "credit monitoring alerts" }],
  supporting: [{ keyword: "free credit monitoring" }],
  action: { type: "MERGE_OR_UPDATE" },
} as unknown as ContentStrategy;

describe("canonical research decision", () => {
  it("uses observed metrics and keeps unknown values null", () => {
    const result = buildResearchDecisionV2({ policy, strategy });
    expect(result.primary.observedSearchVolume).toBeNull();
    expect(result.primary.observedDifficulty).toBe(35);
    expect(result.primary.gscPosition).toBeNull();
    expect(result.warnings).toContain("SEARCH_VOLUME_NOT_OBSERVED");
    expect(result.secondary).toEqual(["credit monitoring alerts"]);
    expect(result.supporting).toEqual(["free credit monitoring"]);
    expect(result.pageAction).toBe("MERGE_OR_UPDATE");
  });

  it("rejects a different primary in exact mode", () => {
    const changed = {
      ...strategy,
      primary: { ...strategy.primary, keyword: "another keyword" },
    } as ContentStrategy;
    expect(() => buildResearchDecisionV2({ policy, strategy: changed }))
      .toThrow("RESEARCH_DECISION_EXACT_PRIMARY_DRIFT");
  });
});
