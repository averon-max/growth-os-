import { describe, expect, it } from "vitest";
import {
  buildProductionQueryProvenanceRegistryV1,
  resolveProductionQueryIdentityProvenanceV1,
} from "./production-query-identity-provenance-v1";

function resolve(input: {
  keywordContext?: unknown;
  dataForSeo?: unknown;
  query: string;
}) {
  const registry = buildProductionQueryProvenanceRegistryV1({
    keywordContext: input.keywordContext ?? { topKeywords: [] },
    dataForSeo: input.dataForSeo ?? { relatedKeywords: [], searchVolume: [] },
  });
  return resolveProductionQueryIdentityProvenanceV1({
    query: input.query,
    registry,
  });
}

describe("production observed query identity provenance", () => {
  it("uses GSC for keywords observed exclusively in stored website snapshots", () => {
    expect(resolve({
      keywordContext: { topKeywords: [{ keyword: "credit report alerts",
        volume: 500, clicks: 12, impressions: 500 }] },
      dataForSeo: { relatedKeywords: [] },
      query: "credit report alerts",
    })).toEqual({
      source: "GSC", observedInGscContext: true, observedInDataForSeo: false,
    });
  });

  it("uses DataForSEO for keywords observed exclusively in its live response", () => {
    expect(resolve({
      keywordContext: { topKeywords: [] },
      dataForSeo: { relatedKeywords: [{ keyword: "credit monitoring benefits",
        searchVolume: 90 }] },
      query: "credit monitoring benefits",
    })).toEqual({
      source: "DATAFORSEO", observedInGscContext: false, observedInDataForSeo: true,
    });
  });

  it("preserves DataForSEO priority on dual-observed query identities", () => {
    expect(resolve({
      keywordContext: { topKeywords: [{ keyword: "Credit Monitoring", clicks: 100 }] },
      dataForSeo: { searchVolume: [{ keyword: "credit monitoring",
        searchVolume: 480 }] },
      query: " CREDIT monitoring ",
    })).toEqual({
      source: "DATAFORSEO", observedInGscContext: true, observedInDataForSeo: true,
    });
  });

  it("normalizes accented keywords exactly like the observed-query registry", () => {
    expect(resolve({
      keywordContext: { topKeywords: [{ keyword: "qué es crédito" }] },
      dataForSeo: { searchVolume: [] },
      query: "QUE ES CREDITO",
    })?.source).toBe("GSC");
  });

  it("never treats model or SERP question strings as acquired keywords", () => {
    expect(resolve({
      keywordContext: { modelOutput: { query: "fake phrase" } },
      dataForSeo: { serp: { question: "fake phrase" } },
      query: "fake phrase",
    })).toBeNull();
  });

  it("returns no origin for empty or unobserved query and never fabricates identity", () => {
    expect(resolve({query: "   "})).toBeNull();
    expect(resolve({query: "unknown phrase"})).toBeNull();
  });
});
