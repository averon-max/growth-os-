import { describe, expect, it } from "vitest";
import { buildEvidenceFromLiveResearch } from "./production-live-evidence-source-registry-v1";
import type { ProductionMasterLiveSourceResearch } from "./production-master-live-source-adapter";

const capturedAt = "2026-10-17T00:00:00.000Z";

function observedResearch(options?: {
  claims?: unknown[];
  references?: unknown[];
  organic?: unknown[];
}): ProductionMasterLiveSourceResearch {
  return {
    capturedAt,
    businessFacts: { verifiedClaims: options?.claims ?? [] },
    serpIntelligence: {
      aiOverview: { references: options?.references ?? [] },
      organic: options?.organic ?? [],
    },
  } as unknown as ProductionMasterLiveSourceResearch;
}

describe("live source registry extraction", () => {
  it("preserves ordered source types, publishers and observation timestamps", () => {
    const graph = buildEvidenceFromLiveResearch(observedResearch({
      claims: [{ url: "https://business.example/about#details", publisher: "Verified business" }],
      references: [{ url: "https://university.edu/research#notes", domain: "university.edu", title: "Research" }],
      organic: [{ url: "https://agency.gov/guide", domain: "agency.gov", title: "Guide" }],
    }));
    expect(graph.sources.map(s => s.id)).toEqual([
      "business-fact-source-0", "ai-overview-source-0", "organic-serp-source-0",
    ]);
    expect(graph.sources.map(s => s.sourceType)).toEqual([
      "PRIMARY_OFFICIAL", "ACADEMIC", "PRIMARY_GOVERNMENT",
    ]);
    expect(graph.sources.map(s => s.url)).toEqual([
      "https://business.example/about", "https://university.edu/research", "https://agency.gov/guide",
    ]);
    expect(graph.sources.map(s => s.retrievedAt)).toEqual([
      new Date(capturedAt), new Date(capturedAt), new Date(capturedAt),
    ]);
    expect(graph.claimEvidence).toEqual([]);
  });

  it("never turns duplicate/unsafe discovery references into verified claim evidence", () => {
    const graph = buildEvidenceFromLiveResearch(observedResearch({
      claims: [{ url: "https://source.example/page#one" }, { url: "javascript:alert(1)" }],
      references: [{ url: "https://source.example/page#two", title: "Same source" }],
      organic: [{ url: "https://source.example/page", title: "Same source" },
        { url: "data:text/html,not-allowed", title: "Unsafe" }],
    }));
    expect(graph.sources).toHaveLength(1);
    expect(graph.sources[0].url).toBe("https://source.example/page");
    expect(graph.sources[0].sourceType).toBe("PRIMARY_OFFICIAL");
    expect(graph.claimEvidence).toEqual([]);
  });

  it("preserves first-ten organic selection and source order", () => {
    const organic = Array.from({ length: 13 }, (_, index) => ({
      url: `https://example.org/page-${index}`, title: `Page ${index}`,
    }));
    const graph = buildEvidenceFromLiveResearch(observedResearch({ organic }));
    expect(graph.sources).toHaveLength(10);
    expect(graph.sources.map(s => s.id)).toEqual(
      Array.from({ length: 10 }, (_, index) => `organic-serp-source-${index}`)
    );
    expect(graph.claimEvidence).toEqual([]);
  });
});
