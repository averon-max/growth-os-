import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const snapshots = new Map<string, { fetchedAt: Date; payload: unknown }>();
  return {
    snapshots,
    website: vi.fn(),
    briefs: vi.fn(),
    keywordContext: vi.fn(),
    related: vi.fn(),
    suggestions:vi.fn(),
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
vi.mock("./keyword-suggestions-provider-v1",()=>({
  fetchGoogleKeywordSuggestionsV1:mocks.suggestions,
}));
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
    mocks.suggestions.mockResolvedValue([]);
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

  it("never spends SERP requests on seven wrong-intent phrases from the real 2026-10-16 live research",async()=>{
    const rejected=[
      "credit monitoring arrangement meaning",
      "what is credit monitoring arrangement",
      "is idx credit monitoring legit",
      "is idx credit monitoring legitimate",
      "is kroll credit monitoring legit",
      "is kroll credit monitoring legitimate",
      "credit monitoring arrangements",
    ];
    mocks.related.mockResolvedValue([
      ...rejected.map(keyword=>({
        keyword,searchVolume:12000,keywordDifficulty:4,cpc:2.3,
      })),
      {keyword:"does credit monitoring affect credit score",
        searchVolume:40,keywordDifficulty:22,cpc:0.4},
    ]);
    const result=await researchKeywordOpportunitiesV2({
      ...input,seed:"what is credit monitoring",useGptDecision:false,
      deepSerpLimit:10,limit:500,
    });
    expect(result.serpResults.map(row=>row.query)).toEqual([
      "does credit monitoring affect credit score",
    ]);
    for(const keyword of rejected){
      expect(result.clusters.map(c=>c.primary.keyword))
        .not.toContain(keyword);
    }
    expect(mocks.serp).toHaveBeenCalledTimes(1);
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

  it("never buys extra suggestion discovery without its separate authorization",async()=>{
    await researchKeywordOpportunitiesV2({
      ...input,useGptDecision:false,
    });
    expect(mocks.suggestions).not.toHaveBeenCalled();
  });

  it("augments old noisy SERP relatives using explicitly purchased topic-contained suggestions",async()=>{
    mocks.related.mockResolvedValue([
      {keyword:"credit karma phone number hours",searchVolume:4400,
        keywordDifficulty:24,cpc:0.8},
      {keyword:"equifax credit monitoring",searchVolume:3600,
        keywordDifficulty:28,cpc:1.1},
    ]);
    mocks.suggestions.mockResolvedValue([
      {keyword:"does credit monitoring affect your score",searchVolume:240,
        keywordDifficulty:18,cpc:0.3,
        monthlySearches:[{year:2026,month:9,searchVolume:240}],
        trend:{monthly:10,quarterly:20,yearly:40}},
      {keyword:"credit karma phone number hours",searchVolume:4400,
        keywordDifficulty:24,cpc:0.8},
    ]);
    const result=await researchKeywordOpportunitiesV2({
      ...input,seed:"what is credit monitoring",
      authorizeExpandedDiscovery:true,useGptDecision:false,
    });
    expect(mocks.suggestions).toHaveBeenCalledWith(expect.objectContaining({
      topic:"credit monitoring",locationName:"United States",
    }));
    expect(result.discoveryBreakdown?.suggestionRows).toBe(2);
    expect(result.serpResults.map(s=>s.query)).toEqual([
      "does credit monitoring affect your score",
    ]);
    expect(result.selectedKeyword).toBe("does credit monitoring affect your score");
    expect(result.clusters.every(c=>
      !/credit karma|equifax/i.test(c.primary.keyword))).toBe(true);
  });

  it("does not invoke paid providers when authorization is absent", async () => {
    await expect(researchKeywordOpportunitiesV2({
      ...input, authorizePaidResearch: false,
    })).rejects.toThrow("KEYWORD_V2_PAID_RESEARCH_NOT_AUTHORIZED");
    expect(mocks.related).not.toHaveBeenCalled();
    expect(mocks.suggestions).not.toHaveBeenCalled();
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

  it("selects a real SERP-and-KD-supported winner without optional GPT",async()=>{
    const first=await researchKeywordOpportunitiesV2({
      ...input,useGptDecision:false,
    });
    expect(first.decision.status).toBe("SELECTED");
    expect(first.decision.reasons).toContain(
      "DETERMINISTIC_SERP_VERIFIED_SELECTION_V1");
    expect(first.selectedKeyword).toBe("credit monitoring benefits");
    expect(first.aiUsed).toBe(false);
    expect(mocks.openai).not.toHaveBeenCalled();
    const second=await researchKeywordOpportunitiesV2({
      ...input,useGptDecision:false,
    });
    expect(second.cacheHit).toBe(true);
    expect(second.selectedKeyword).toBe(first.selectedKeyword);
    expect(mocks.related).toHaveBeenCalledTimes(1);
    expect(mocks.serp).toHaveBeenCalledTimes(1);
  });

  it("retains actually observed SERP positions and competitor URLs",async()=>{
    mocks.website.mockResolvedValue({
      id:"website-test",
      url:"https://scanmycreds.com/",
      business:{industry:"credit monitoring",workspaceId:"workspace"},
    });
    mocks.serp.mockResolvedValue({
      organic:[
        {rank:1,domain:"example.org",url:"https://example.org/credit-monitoring"},
        {rank:2,domain:"scanmycreds.com",url:"https://scanmycreds.com/guide"},
        {rank:3,domain:"another.org",url:"https://another.org/credit"},
      ],
      benchmark:{dominantPageType:"blog",analyzedPages:3},
      serpFeatures:[],
    });
    const result=await researchKeywordOpportunitiesV2({
      ...input,useGptDecision:false,
    });
    expect(result.serpResults[0]).toMatchObject({
      ownOrganicRank:2,
      topOrganic:[
        {rank:1,domain:"example.org"},
        {rank:2,domain:"scanmycreds.com"},
        {rank:3,domain:"another.org"},
      ],
    });
    expect(result.selectedKeyword).toBe("credit monitoring benefits");
  });

  it("preserves deep SERP competitor structure and observed questions without an extra provider request",async()=>{
    mocks.serp.mockResolvedValue({
      organic:[
        {rank:1,domain:"example.org",url:"https://example.org/a"},
        {rank:2,domain:"reference.org",url:"https://reference.org/b"},
        {rank:3,domain:"other.org",url:"https://other.org/c"},
      ],
      benchmark:{
        dominantPageType:"blog",analyzedPages:2,
        medianWordCount:1870,medianH2:6,medianH3:8,
      },
      serpFeatures:["organic","people_also_ask"],
      questions:["Does credit monitoring lower my score?"],
      aiOverview:{present:true,asynchronous:false,references:[]},
      competitors:[
        {rank:1,domain:"example.org",url:"https://example.org/a",
          fetched:true,pageType:"blog",title:"What is monitoring",
          h1:"What is credit monitoring",h2:["How it works","Costs"],
          h3:["What alerts mean"],wordCount:2300,
          schemaTypes:["Article"],tableCount:1,
          authorSignal:true,dateSignal:true,error:null},
        {rank:2,domain:"reference.org",url:"https://reference.org/b",
          fetched:false,pageType:"OTHER",title:null,h1:null,
          h2:[],h3:[],wordCount:null,error:"FETCH_DENIED"},
      ],
      commonSections:[{topic:"costs",pages:2,coveragePct:50,examples:[]}],
      commonTerms:[{term:"credit monitoring",pages:2,coveragePct:50}],
    });
    const result=await researchKeywordOpportunitiesV2({
      ...input,useGptDecision:false,
    });
    const research=result.serpResults[0]?.competitiveResearch;
    expect(research).toMatchObject({
      fetchedCompetitorPages:1,
      fetchFailures:1,
      aiOverviewPresent:true,
      observedQuestions:["Does credit monitoring lower my score?"],
      benchmark:{medianWordCount:1870,medianH2:6,medianH3:8},
      competitorPages:[{
        rank:1,fetched:true,
        h2:["How it works","Costs"],
        h3:["What alerts mean"],
        wordCount:2300,authorSignal:true,dateSignal:true,
        schemaTypes:["Article"],
      },{rank:2,fetched:false,error:"FETCH_DENIED"}],
    });
    expect(mocks.serp).toHaveBeenCalledTimes(1);
  });

  it("keeps REVIEW when demand and KD are both missing",async()=>{
    mocks.related.mockResolvedValue([
      {keyword:"credit monitoring benefits",searchVolume:null,
        keywordDifficulty:null,cpc:null},
    ]);
    const result=await researchKeywordOpportunitiesV2({
      ...input,useGptDecision:false,
    });
    expect(result.decision.status).toBe("REVIEW");
    expect(result.selectedKeyword).toBeNull();
    expect(mocks.openai).not.toHaveBeenCalled();
  });

  it("requires true deep top-one competitor coverage before automatic selection",async()=>{
    const limited=await researchKeywordOpportunitiesV2({
      ...input,requireDeepCompetitorEvidence:true,useGptDecision:false,
    });
    expect(limited.decision.status).toBe("REVIEW");
    expect(limited.selectedKeyword).toBeNull();
    const organic=Array.from({length:8},(_,i)=>({
      rank:i+1,domain:"domain"+i+".example",
      url:"https://domain"+i+".example/article",
    }));
    mocks.serp.mockResolvedValue({
      organic,serpFeatures:["organic"],
      benchmark:{
        dominantPageType:"blog",analyzedPages:6,
        medianWordCount:2100,medianH2:7,medianH3:9,
      },
      questions:["What does credit monitoring do?"],
      aiOverview:{present:false,asynchronous:false,references:[]},
      commonSections:[{topic:"Alerts",pages:5,coveragePct:80,examples:[]}],
      commonTerms:[],
      competitors:organic.map((row,i)=>({
        ...row,fetched:i<6,pageType:"blog",
        title:"Credit monitoring",h1:"What is credit monitoring",
        h2:["Alerts"],h3:["Fraud"],wordCount:2050,
        schemaTypes:["Article"],tableCount:0,
        authorSignal:true,dateSignal:true,error:i<6?null:"BLOCKED",
      })),
    });
    // Change the website ID so each pass uses an independent checkpoint.
    // The first limited result must never be promoted retroactively.
    mocks.website.mockResolvedValue({
      id:"another-website",url:"https://scanmycreds.com",
      business:{industry:"credit monitoring",workspaceId:"workspace"},
    });
    const deep=await researchKeywordOpportunitiesV2({
      ...input,websiteId:"another-website",
      requireDeepCompetitorEvidence:true,useGptDecision:false,
    });
    expect(deep.decision.status).toBe("SELECTED");
    expect(deep.serpResults[0]?.competitiveResearch?.fetchedCompetitorPages).toBe(6);
    expect(deep.serpResults[0]?.competitiveResearch?.competitorPages[0]?.rank).toBe(1);
    const rerun=await researchKeywordOpportunitiesV2({
      ...input,websiteId:"another-website",
      requireDeepCompetitorEvidence:true,useGptDecision:false,
    });
    expect(rerun.cacheHit).toBe(true);
    expect(rerun.selectedKeyword).toBe(deep.selectedKeyword);
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
