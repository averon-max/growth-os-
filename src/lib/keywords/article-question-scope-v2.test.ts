import {describe,expect,it} from "vitest";
import {assessArticleQuestionScopeV2 as assess,
  groupObservedArticleQuestionsV2}
  from "./article-question-scope-v2";
const seed="what is credit monitoring";
const check=(query:string,providerMainIntent="informational")=>
  assess({seed,query,providerMainIntent});

describe("actual paid DataForSEO question observations: reader-job scope",()=>{
  it.each([
    "what is a credit monitoring service",
    "what is a credit monitoring alert",
    "do i need credit monitoring",
    "are credit monitoring services worth it",
    "how does credit monitoring work",
    "how much does credit monitoring cost",
    "what does credit monitoring mean",
    "what does credit monitoring do",
    "does credit monitoring affect credit score",
    "what is credit monitoring service",
    "how much is credit monitoring",
    "is a credit monitoring service worth it",
    "how do i know if i have credit monitoring",
    "what is free credit monitoring",
    "how much is credit monitoring per year",
    "how to get free credit monitoring",
    "is free credit monitoring worth it",
    "is credit monitoring worth the cost",
    "should you pay for credit monitoring",
    "why credit monitoring is important",
    "should i use a credit monitoring service",
    "should i get credit monitoring",
    "do i have credit monitoring",
    "do i need credit monitoring if my credit is frozen",
  ])("keeps real consumer education/decision subquestion %s",(query)=>{
    expect(check(query).status).toBe("CORE_INFORMATIONAL_CANDIDATE");
  });
  it.each([
    ["what is kroll credit monitoring","NAMED_SUBJECT_OR_PROVIDER_SERVICE_INTENT"],
    ["how much does kroll credit monitoring cost","NAMED_SUBJECT_OR_PROVIDER_SERVICE_INTENT"],
    ["does american express offer free credit monitoring","NAMED_SUBJECT_OR_PROVIDER_SERVICE_INTENT"],
    ["does bank of america offer credit monitoring","NAMED_SUBJECT_OR_PROVIDER_SERVICE_INTENT"],
    ["is t mobile offering free credit monitoring","NAMED_SUBJECT_OR_PROVIDER_SERVICE_INTENT"],
    ["what happened to usaa credit monitoring","VENDOR_NEWS_OR_ACCOUNT_STATUS_INTENT"],
    ["is creditwise credit monitoring","NAMED_SUBJECT_OR_PROVIDER_SERVICE_INTENT"],
    ["what are the three credit monitoring companies","VENDOR_SELECTION_OR_DIRECTORY_INTENT"],
    ["what is a good credit monitoring service","PROVIDER_CHOICE_REQUIRES_COMPARISON_PAGE"],
    ["how to start a credit monitoring business","BUSINESS_CREATION_NOT_CONSUMER_EXPLAINER"],
    ["are credit monitoring services tax deductible","TAX_TREATMENT_NOT_CONSUMER_EXPLAINER"],
    ["is credit monitoring worth it reddit","THIRD_PARTY_COMMUNITY_PLATFORM_INTENT"],
  ] as const)("rejects same-keyword but wrong reader-job: %s",(
    query,reason)=>{
    expect(check(query)).toMatchObject({
      status:"SEPARATE_PAGE_INTENT",reason,
    });
  });
  it.each([
    ["what does internet surveillance mean on credit monitoring report",
      "PRODUCT_SPECIFIC_FEATURE_NOT_CORE_DEFINITION"],
    ["what is a credit monitoring system",
      "SYSTEM_MAY_MEAN_ENTERPRISE_SOFTWARE_OR_CONSUMER_SERVICE"],
  ] as const)("defers ambiguous product-specific search intent: %s",(
    query,reason)=>{
    expect(check(query)).toMatchObject({
      status:"HUMAN_INTENT_REVIEW",reason,
    });
  });
  it("uses provider intent as a disagreement signal, never a semantic oracle",()=>{
    expect(check("should i sign up for credit monitoring","transactional"))
      .toMatchObject({status:"HUMAN_INTENT_REVIEW",
        reason:"PROVIDER_INTENT_CONFLICT_transactional"});
    expect(check("what is kroll credit monitoring","informational"))
      .toMatchObject({status:"SEPARATE_PAGE_INTENT"});
  });
  it("keeps concepts credit monitoring and credit score distinct",()=>{
    expect(check("credit score")).toMatchObject({
      status:"SEPARATE_PAGE_INTENT",
    });
    expect(check("does credit monitoring affect credit score")).toMatchObject({
      status:"CORE_INFORMATIONAL_CANDIDATE",
      family:"CREDIT_SCORE_RELATION",
    });
  });
  it("does not add overlapping keyword volumes and retains unknown metrics",()=>{
    const make=(keyword:string,searchVolume:number|null,
      providerMainIntent:string|null="informational")=>({
      keyword,searchVolume,keywordDifficulty:null,providerMainIntent,
    });
    const r=groupObservedArticleQuestionsV2(seed,[
      make("are credit monitoring services worth it",70),
      make("is credit monitoring worth the cost",10),
      make("how much does credit monitoring cost",50),
      make("what is kroll credit monitoring",30),
      make("what does credit monitoring mean",40),
      make("what is a credit monitoring alert",null),
    ]);
    expect(r.observed).toBe(6);
    expect(r.topicalQuestions).toBe(5);
    expect(r.separatePageQueries).toHaveLength(1);
    const price=r.semanticClusters.find(x=>x.family==="PRICE_AND_VALUE");
    expect(price?.distinctObservedQueries).toBe(3);
    expect(price?.highestObservedSearchVolume).toBe(70);
    expect(price?.questions).toHaveLength(3);
    expect(r.semanticClusters.find(x=>
      x.family==="OPERATION_AND_ALERTS")?.highestObservedSearchVolume)
      .toBeNull();
  });
});
