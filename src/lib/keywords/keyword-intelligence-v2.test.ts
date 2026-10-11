import { describe, expect, it } from "vitest";
import { prepareKeywordOpportunitiesV2, validateKeywordOpportunityChoiceV2 } from "./keyword-intelligence-v2";

const item = (keyword: string) => ({ keyword, searchVolume: 100, keywordDifficulty: 20, cpc: null, source: "DATAFORSEO" as const });

describe("keyword-intelligence-v2", () => {
  it("supports 500 observed keywords", () => {
    const observations = Array.from({ length: 500 }, (_, i) => item("credit monitoring option " + i));
    const result = prepareKeywordOpportunitiesV2({ seed: "credit monitoring", industry: "credit monitoring", observations });
    expect(result.candidates).toHaveLength(500);
  });
  it("excludes duplicates, unrelated terms and published pages", () => {
    const result = prepareKeywordOpportunitiesV2({ seed: "credit monitoring", industry: null,
      observations: [item("credit monitoring costs"), item("CREDIT MONITORING COSTS"), item("pizza delivery"), item("credit monitoring definition")],
      publishedKeywords: ["credit monitoring definition"] });
    expect(result.candidates).toHaveLength(1);
    expect(result.excluded.map(x => x.reason).sort()).toEqual(["CANNIBALIZATION", "DUPLICATE_QUERY", "IRRELEVANT_BUSINESS"]);
  });
  it("accepts 500 distinct candidates even with duplicates and irrelevant rows first", () => {
    const observations = [
      item("credit monitoring"),
      item("CREDIT MONITORING"),
      item("pizza delivery"),
      ...Array.from({ length: 499 }, (_, index) => item("credit monitoring service " + index)),
    ];
    const result = prepareKeywordOpportunitiesV2({
      seed: "credit monitoring", industry: "credit and identity",
      observations, limit: 500,
    });
    expect(result.candidates).toHaveLength(500);
    expect(result.excluded.map(row => row.reason)).toContain("DUPLICATE_QUERY");
    expect(result.excluded.map(row => row.reason)).toContain("IRRELEVANT_BUSINESS");
  });
  it("works on unrelated industries without a hard-coded credit brand blacklist", () => {
    const result = prepareKeywordOpportunitiesV2({
      seed: "aura lighting", industry: "lighting",
      observations: [item("aura lighting benefits")],
    });
    expect(result.candidates).toHaveLength(1);
  });
  it("rejects fabricated cluster IDs from GPT", () => {
    const result = prepareKeywordOpportunitiesV2({ seed: "credit monitoring", industry: null, observations: [item("credit monitoring costs")] });
    expect(() => validateKeywordOpportunityChoiceV2({ status: "SELECTED", selectedClusterId: "fake", confidence: "HIGH", reasons: [], risks: [] }, result.clusters))
      .toThrow("KEYWORD_V2_MODEL_INVENTED_CLUSTER");
  });
});