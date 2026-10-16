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
    ["what is credit monitoring arrangement","BANKING_CREDIT_MONITORING_ARRANGEMENT_NOT_CONSUMER_REPORT_SERVICE"],
    ["what is a credit monitoring arrangement","BANKING_CREDIT_MONITORING_ARRANGEMENT_NOT_CONSUMER_REPORT_SERVICE"],
    ["should i enroll in idx credit monitoring","NAMED_PROVIDER_ENROLLMENT_INTENT"],
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
    const value=r.semanticClusters.find(x=>
      x.family==="VALUE_AND_NECESSITY");
    expect(value?.distinctObservedQueries).toBe(2);
    expect(value?.highestObservedSearchVolume).toBe(70);
    const cost=r.semanticClusters.find(x=>x.family==="COST");
    expect(cost?.questions).toHaveLength(1);
    expect(cost?.highestObservedSearchVolume).toBe(50);
    expect(r.semanticClusters.find(x=>
      x.family==="OPERATION_AND_ALERTS")?.highestObservedSearchVolume)
      .toBeNull();
  });
});

describe("semantic collision verified from real Oct 16 highest-volume keyword",()=>{
  it("does not let banking CMA 2900 searches outrank consumer monitoring definition",()=>{
    const make=(keyword:string,searchVolume:number)=>({
      keyword,searchVolume,keywordDifficulty:null,
      providerMainIntent:"informational",
    });
    const r=groupObservedArticleQuestionsV2(seed,[
      make("what is credit monitoring arrangement",2900),
      make("what is credit monitoring",480),
      make("what is a credit monitoring service",110),
    ]);
    expect(r.topicalQuestions).toBe(2);
    expect(r.separatePageQueries).toEqual([
      {query:"what is credit monitoring arrangement",
        searchVolume:2900,
        reason:"BANKING_CREDIT_MONITORING_ARRANGEMENT_NOT_CONSUMER_REPORT_SERVICE"},
    ]);
    expect(r.semanticClusters.find(x=>x.family==="DEFINITION")
      ?.highestObservedSearchVolume).toBe(480);
  });
  it("distinguishes activation/access from how monitoring technology works",()=>{
    const r=check("how do i know if i have credit monitoring");
    expect(r.family).toBe("ACTIVATION_AND_ACCESS");
    expect(check("what does credit monitoring do").family)
      .toBe("OPERATION_AND_ALERTS");
  });
  it("does not discard unknown commercial transactional intent from generic article",()=>{
    expect(check("should i sign up for credit monitoring","transactional")
      .status).toBe("HUMAN_INTENT_REVIEW");
    expect(check("should i enroll in idx credit monitoring","transactional")
      .status).toBe("SEPARATE_PAGE_INTENT");
  });
});
