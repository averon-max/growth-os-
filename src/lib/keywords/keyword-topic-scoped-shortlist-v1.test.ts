import {describe,expect,it} from "vitest";
import {createTopicScopedKeywordShortlistV1 as shortlist}
  from "./keyword-topic-scoped-shortlist-v1";
import type {KeywordCandidateV2} from "./keyword-intelligence-v2";
const candidate=(keyword:string,score:number,volume:number):KeywordCandidateV2=>({
  keyword,searchVolume:volume,keywordDifficulty:20,cpc:null,
  source:"DATAFORSEO",sources:["DATAFORSEO"],
  intent:"INFORMATIONAL",
  normalized:keyword,id:"kw_"+keyword,
  clusterId:"cl_"+keyword,
  opportunityScore:score,
});
const seed="what is credit monitoring";
describe("topic-scope gate PRECEDES commercial keyword scores",()=>{
  it("never buys SERP for unrelated 4400-volume Credit Karma contact query",()=>{
    const result=shortlist({seed,candidates:[
      candidate("credit karma phone number hours",99,4400),
      candidate("equifax credit monitoring",95,3600),
      candidate("equifax core credit",94,1300),
      candidate("aura credit monitoring",92,2900),
      candidate("what are the 7 credit bureaus",90,1000),
      candidate("does credit monitoring affect credit score",55,40),
      candidate("how does credit monitoring work",52,90),
      candidate("credit monitoring vs credit freeze",50,30),
    ],maxClusters:3});
    expect(result.clusters.map(c=>c.primary.keyword)).toEqual([
      "does credit monitoring affect credit score",
      "how does credit monitoring work",
      "credit monitoring vs credit freeze",
    ]);
    expect(result.acceptedCandidateCount).toBe(3);
    expect(result.excluded).toEqual(expect.arrayContaining([
      {keyword:"credit karma phone number hours",
        reason:"SEPARATE_PAGE_INTENT"},
      {keyword:"equifax credit monitoring",
        reason:"SEPARATE_PAGE_INTENT"},
      {keyword:"what are the 7 credit bureaus",
        reason:"TOPIC_SCOPE_MISMATCH"},
    ]));
  });
  it("keeps unrelated discoveries in audit assessments but cannot shortlist them",()=>{
    const out=shortlist({seed,candidates:[
      candidate("credit score",100,100000),
    ]});
    expect(out.clusters).toHaveLength(0);
    expect(out.assessments[0].decision).toBe(
      "ADJACENT_ENTITY_NOT_SAME_TOPIC");
  });
  it("fails on unbounded cluster limit before any paid provider work",()=>{
    expect(()=>shortlist({seed,candidates:[],maxClusters:501}))
      .toThrow("TOPIC_SCOPED_CLUSTER_LIMIT_INVALID");
  });
});

describe("real paid cache cannot rank buyer targets for an explanatory article",()=>{
  it("holds five DataForSEO candidates in separate-page/review, but fixes false transactional what-is intent",()=>{
    const observed=[
      candidate("credit monitoring companies",55.68,14800),
      candidate("free credit monitoring services",52.21,2900),
      candidate("3 bureau credit monitoring",48.68,480),
      candidate("free credit monitoring",45.6,135000),
      candidate("free credit monitoring app",38.99,1900),
      {...candidate("what is credit monitoring service",26,0),
        intent:"TRANSACTIONAL" as const},
      {...candidate("what is credit monitoring services",26,0),
        intent:"TRANSACTIONAL" as const},
      candidate("what is credit monitoring",20,0),
    ];
    const result=shortlist({seed:"what is credit monitoring",
      candidates:observed,maxClusters:30});
    expect(result.acceptedCandidateCount).toBe(3);
    expect(result.clusters.map(x=>x.primary.keyword)).toEqual([
      "what is credit monitoring service",
      "what is credit monitoring services",
      "what is credit monitoring",
    ]);
    expect(result.clusters.every(x=>x.intent==="INFORMATIONAL")).toBe(true);
    expect(result.excluded).toEqual(expect.arrayContaining([
      {keyword:"credit monitoring companies",reason:"SEPARATE_PAGE_INTENT"},
      {keyword:"free credit monitoring services",reason:"SEPARATE_PAGE_INTENT"},
      {keyword:"free credit monitoring app",reason:"SEPARATE_PAGE_INTENT"},
      {keyword:"3 bureau credit monitoring",reason:"INTENT_REVIEW_REQUIRED"},
      {keyword:"free credit monitoring",reason:"INTENT_REVIEW_REQUIRED"},
    ]));
  });
});
