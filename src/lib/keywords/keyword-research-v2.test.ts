import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const snapshots = new Map<string, { fetchedAt: Date; payload: unknown }>();
  return {
    snapshots,
    website: vi.fn(),
    briefs: vi.fn(),
    keywordContext: vi.fn(),
    related: vi.fn(),
    trends: vi.fn(),
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
vi.mock("./trends-provider", () => ({ fetchTrendingQueries: mocks.trends }));
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
    mocks.trends.mockResolvedValue(null);
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

  it("combines Trends and provider momentum before GPT selection", async () => {
    mocks.trends.mockResolvedValue({
      topQueries: [{ query: "credit monitoring benefits", value: 100 }],
      risingQueries: [{ query: "credit monitoring benefits", value: 180 }],
    });
    mocks.related.mockResolvedValue([
      { keyword: "credit monitoring benefits", searchVolume: 260,
        keywordDifficulty: 18, cpc: 1.2, monthlySearches: [
          { year: 2026, month: 9, searchVolume: 260 },
        ], trend: { monthly: 30, quarterly: 45, yearly: 60 },
        serpInfo: { resultCount: 1000, features: [], updatedAt: null } },
    ]);
    const result = await researchKeywordOpportunitiesV2(input);
    const candidate = result.candidateSnapshots.find(
      row => row.keyword === "credit monitoring benefits",
    );
    expect(candidate?.trend?.quarterly).toBe(45);
    expect(candidate?.googleTrendsTop).toBe(100);
    expect(candidate?.googleTrendsRising).toBe(180);
    expect(candidate?.monthlySearches?.[0]?.searchVolume).toBe(260);
    expect(mocks.trends).toHaveBeenCalledWith("credit monitoring", "US");
  });

  it("never pays for SERP on the five real buyer/mixed-intent keywords; SEED-only terms do not count as discovery", async () => {
    mocks.related.mockResolvedValue([
      {keyword:"credit monitoring companies",searchVolume:14800,keywordDifficulty:52,cpc:1.3},
      {keyword:"free credit monitoring services",searchVolume:2900,keywordDifficulty:52,cpc:1.1},
      {keyword:"3 bureau credit monitoring",searchVolume:480,keywordDifficulty:42,cpc:0.5},
      {keyword:"free credit monitoring",searchVolume:135000,keywordDifficulty:61,cpc:1.9},
      {keyword:"free credit monitoring app",searchVolume:1900,keywordDifficulty:68,cpc:1.2},
    ]);
    const result=await researchKeywordOpportunitiesV2({
      ...input,seed:"what is credit monitoring",deepSerpLimit:3,
      useGptDecision:false,
    });
    expect(result.observed).toBe(6);
    expect(result.candidateSnapshots.some(x=>
      x.keyword==="credit monitoring companies")).toBe(true);
    expect(result.excluded).toEqual(expect.arrayContaining([
      expect.objectContaining({
        keyword:"credit monitoring companies",reason:"SEPARATE_PAGE_INTENT",
      }),
      expect.objectContaining({
        keyword:"free credit monitoring",reason:"INTENT_REVIEW_REQUIRED",
      }),
      expect.objectContaining({
        keyword:"3 bureau credit monitoring",reason:"INTENT_REVIEW_REQUIRED",
      }),
    ]));
    expect(result.decision.status).toBe("REVIEW");
    expect(result.serpResults).toEqual([]);
    expect(mocks.serp).not.toHaveBeenCalled();
    expect(mocks.openai).not.toHaveBeenCalled();
  });

  it("does deep SERP for genuinely observed informational what-is-service question, not mistaken service-purchase intent", async () => {
    mocks.related.mockResolvedValue([
      {keyword:"what is credit monitoring service",
        searchVolume:60,keywordDifficulty:18,cpc:0.3},
      {keyword:"free credit monitoring app",
        searchVolume:1900,keywordDifficulty:21,cpc:0.4},
    ]);
    const result=await researchKeywordOpportunitiesV2({
      ...input,seed:"what is credit monitoring",deepSerpLimit:2,
      useGptDecision:false,
    });
    expect(result.serpResults.map(x=>x.query)).toEqual([
      "what is credit monitoring service",
    ]);
    expect(result.clusters[0]?.intent).toBe("INFORMATIONAL");
    expect(mocks.serp).toHaveBeenCalledTimes(1);
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
