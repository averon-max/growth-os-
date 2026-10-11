import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const snapshots = new Map<string, { fetchedAt: Date; payload: unknown }>();
  return {
    snapshots,
    website: vi.fn(),
    briefs: vi.fn(),
    keywordContext: vi.fn(),
    related: vi.fn(),
    serp: vi.fn(),
    openai: vi.fn(),
    cacheFind: vi.fn(async (arg: { where: { normalized_source: {
      normalized: string; source: string;
    } } }) => snapshots.get(
      arg.where.normalized_source.source + ":" + arg.where.normalized_source.normalized,
    ) ?? null),
    cacheUpsert: vi.fn(async (arg: {
      where: { normalized_source: { normalized: string; source: string } };
      create: { payload: unknown };
      update: { payload: unknown };
    }) => {
      const key = arg.where.normalized_source.source + ":" +
        arg.where.normalized_source.normalized;
      snapshots.set(key, { payload: arg.update.payload, fetchedAt: new Date() });
    }),
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: {
  website: { findUnique: mocks.website },
  contentBrief: { findMany: mocks.briefs },
  keywordSuggestionCache: {
    findUnique: mocks.cacheFind,
    upsert: mocks.cacheUpsert,
  },
}}));

vi.mock("./dataforseo-provider", () => ({ fetchRelatedKeywords: mocks.related }));
vi.mock("@/lib/content/keyword-context", () => ({
  getWebsiteKeywordContext: mocks.keywordContext,
}));
vi.mock("@/lib/content/serp-intelligence", () => ({
  buildSerpIntelligence: mocks.serp,
}));
vi.mock("openai", () => ({ default: class {
  chat = { completions: { create: mocks.openai } };
} }));

import { researchKeywordOpportunitiesV2 } from "./keyword-research-v2";

const input = {
  websiteId: "website-test",
  seed: "credit monitoring",
  market: "US" as const,
  authorizePaidResearch: true,
  useGptDecision: true,
  deepSerpLimit: 2,
};

describe("Keyword Intelligence V2 research orchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.snapshots.clear();
    mocks.website.mockResolvedValue({
      id: "website-test", business: { industry: "credit monitoring", workspaceId: "workspace" },
    });
    mocks.briefs.mockResolvedValue([]);
    mocks.keywordContext.mockResolvedValue({ topKeywords: [] });
    mocks.related.mockResolvedValue([
      { keyword: "credit monitoring benefits", searchVolume: 260, keywordDifficulty: 18,
        cpc: 1.2, serpInfo: { resultCount: 1000, features: [], updatedAt: null } },
    ]);
    mocks.serp.mockResolvedValue({
      organic: [{ domain: "a.com" }, { domain: "b.com" }, { domain: "c.com" }],
      benchmark: { dominantPageType: "blog", analyzedPages: 3 },
      serpFeatures: [],
    });
    mocks.openai.mockImplementation(async (request: { messages: { content: string }[] }) => {
      const prompt = JSON.parse(request.messages[1]!.content);
      return { choices: [{ message: { content: JSON.stringify({
        status: "SELECTED", selectedClusterId: prompt.shortlist[0].id,
        confidence: "MEDIUM", reasons: ["SERP verified"], risks: [],
      }) } }] };
    });
    vi.stubEnv("OPENAI_API_KEY", "test-only-key");
  });

  it("does not invoke paid providers when authorization is absent", async () => {
    await expect(researchKeywordOpportunitiesV2({
      ...input, authorizePaidResearch: false,
    })).rejects.toThrow("KEYWORD_V2_PAID_RESEARCH_NOT_AUTHORIZED");
    expect(mocks.related).not.toHaveBeenCalled();
    expect(mocks.serp).not.toHaveBeenCalled();
    expect(mocks.openai).not.toHaveBeenCalled();
  });

  it("produces a locked winner from an observed SERP cluster", async () => {
    const result = await researchKeywordOpportunitiesV2(input);
    expect(result.decision.status).toBe("SELECTED");
    expect(result.selectedKeyword).toBe("credit monitoring benefits");
    expect(result.approvedResearchKey).toContain("website-test");
    expect(mocks.serp).toHaveBeenCalled();
    expect(mocks.cacheUpsert).toHaveBeenCalled();
  });

  it("after a GPT failure, does not pay for discovery or completed SERPs again", async () => {
    mocks.openai.mockRejectedValueOnce(new Error("GPT_TEMPORARY_FAILURE"));
    await expect(researchKeywordOpportunitiesV2(input))
      .rejects.toThrow("GPT_TEMPORARY_FAILURE");
    const paidSerpCalls = mocks.serp.mock.calls.length;
    expect(paidSerpCalls).toBeGreaterThan(0);
    expect(mocks.related).toHaveBeenCalledTimes(1);

    const result = await researchKeywordOpportunitiesV2(input);
    expect(result.decision.status).toBe("SELECTED");
    expect(mocks.related).toHaveBeenCalledTimes(1);
    expect(mocks.serp).toHaveBeenCalledTimes(paidSerpCalls);
  });

  it("does not invoke GPT if no trustworthy organic SERP was observed", async () => {
    mocks.serp.mockResolvedValue({
      organic: [{ domain: "a.com" }],
      benchmark: { dominantPageType: null, analyzedPages: 0 },
      serpFeatures: [],
    });
    const result = await researchKeywordOpportunitiesV2(input);
    expect(result.decision.status).toBe("REVIEW");
    expect(result.selectedKeyword).toBeNull();
    expect(mocks.openai).not.toHaveBeenCalled();
  });

  it("refuses invented GPT winner IDs", async () => {
    mocks.openai.mockResolvedValue({ choices: [{ message: { content: JSON.stringify({
      status: "SELECTED", selectedClusterId: "fictional-keyword",
      confidence: "HIGH", reasons: [], risks: [],
    }) } }] });
    await expect(researchKeywordOpportunitiesV2(input))
      .rejects.toThrow("KEYWORD_V2_MODEL_INVENTED_CLUSTER");
  });
});
