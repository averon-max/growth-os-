import {describe,expect,it} from "vitest";
import {assessKeywordTopicIntentV1 as classify}
  from "./keyword-topic-intent-gate-v1";
const seed="what is credit monitoring";
const assess=(query:string)=>classify({seed,query});
describe("concept and intent scope before paid SERP",()=>{
  it.each([
    "what is credit monitoring",
    "how does credit monitoring work",
    "does credit monitoring affect credit score",
    "credit monitoring vs credit freeze",
    "can credit monitoring prevent identity theft",
    "credit monitoring alert",
  ])("preserves genuine same-topic question: %s",(q)=>{
    expect(assess(q)).toMatchObject({
      decision:"SAME_TOPIC_SUBQUESTION",eligibleForArticleSerp:true,
      coreTopic:"credit monitoring",
    });
  });
  it.each([
    ["credit karma phone number hours","SEPARATE_NAVIGATION_OR_SUPPORT"],
    ["credit karma phone number verification","SEPARATE_NAVIGATION_OR_SUPPORT"],
    ["credit karma phone number change","SEPARATE_NAVIGATION_OR_SUPPORT"],
    ["credit karma address and phone number","SEPARATE_NAVIGATION_OR_SUPPORT"],
    ["equifax login credit report","SEPARATE_NAVIGATION_OR_SUPPORT"],
    ["equifax credit monitoring","SEPARATE_BRAND_PRODUCT_PAGE"],
    ["aura credit monitoring","SEPARATE_BRAND_PRODUCT_PAGE"],
    ["aura credit monitoring reviews","SEPARATE_BRAND_PRODUCT_PAGE"],
    ["equifax core credit","SEPARATE_BRAND_PRODUCT_PAGE"],
    ["what are the 7 credit bureaus","ADJACENT_ENTITY_NOT_SAME_TOPIC"],
    ["credit monitoring companies","SEPARATE_COMMERCIAL_PAGE"],
    ["free credit monitoring services","SEPARATE_COMMERCIAL_PAGE"],
    ["free credit monitoring app","SEPARATE_COMMERCIAL_PAGE"],
    ["best credit monitoring services","SEPARATE_COMMERCIAL_PAGE"],
    ["credit monitoring reviews","SEPARATE_COMMERCIAL_PAGE"],
    ["credit monitoring jobs near me","SEPARATE_NAVIGATION_OR_SUPPORT"],
    ["credit monitoring arrangement meaning","ADJACENT_ENTITY_NOT_SAME_TOPIC"],
    ["what is credit monitoring arrangement","ADJACENT_ENTITY_NOT_SAME_TOPIC"],
    ["credit monitoring arrangements","ADJACENT_ENTITY_NOT_SAME_TOPIC"],
    ["is idx credit monitoring legit","SEPARATE_BRAND_PRODUCT_PAGE"],
    ["is idx credit monitoring legitimate","SEPARATE_BRAND_PRODUCT_PAGE"],
    ["is kroll credit monitoring legit","SEPARATE_BRAND_PRODUCT_PAGE"],
    ["is kroll credit monitoring legitimate","SEPARATE_BRAND_PRODUCT_PAGE"],
    ["credit score","ADJACENT_ENTITY_NOT_SAME_TOPIC"],
    ["how to improve your credit score","ADJACENT_ENTITY_NOT_SAME_TOPIC"],
    ["credit freeze","ADJACENT_ENTITY_NOT_SAME_TOPIC"],
    ["identity theft protection","ADJACENT_ENTITY_NOT_SAME_TOPIC"],
  ] as const)("does not confuse %s with what is credit monitoring",(
    query,expected)=>{
    expect(assess(query)).toMatchObject({
      decision:expected,eligibleForArticleSerp:false,
    });
  });
  it("preserves separate IDX/Kroll review pages when brand is the explicit subject",()=>{
    const explicit="is kroll credit monitoring legit";
    const result=classify({seed:explicit,query:explicit});
    expect(result.eligibleForArticleSerp).toBe(true);
  });
  it("retains the brand when it IS the explicit seed topic",()=>{
    expect(classify({seed:"aura credit monitoring reviews",
      query:"aura credit monitoring reviews"}).eligibleForArticleSerp).toBe(true);
  });
  it("does not infer semantic equality from a shared generic word",()=>{
    expect(classify({seed:"what is canonical tags",
      query:"canonical camera prices"}).eligibleForArticleSerp).toBe(false);
    expect(classify({seed:"what is canonical tags",
      query:"canonical tags benefits"}).eligibleForArticleSerp).toBe(true);
  });
});

describe("real paid cached keyword research page-intent correctness",()=>{
  const cases=[
    {query:"credit monitoring companies",
      decision:"SEPARATE_COMMERCIAL_PAGE",intent:"COMMERCIAL"},
    {query:"free credit monitoring services",
      decision:"SEPARATE_COMMERCIAL_PAGE",intent:"COMMERCIAL"},
    {query:"3 bureau credit monitoring",
      decision:"AMBIGUOUS_TOPIC_REVIEW",intent:"MIXED"},
    {query:"free credit monitoring",
      decision:"AMBIGUOUS_TOPIC_REVIEW",intent:"MIXED"},
    {query:"free credit monitoring app",
      decision:"SEPARATE_COMMERCIAL_PAGE",intent:"COMMERCIAL"},
    {query:"what is credit monitoring service",
      decision:"SAME_TOPIC_SUBQUESTION",intent:"INFORMATIONAL"},
    {query:"what is credit monitoring services",
      decision:"SAME_TOPIC_SUBQUESTION",intent:"INFORMATIONAL"},
    {query:"what is credit monitoring",
      decision:"SAME_TOPIC_SUBQUESTION",intent:"INFORMATIONAL"},
  ] as const;
  it.each(cases)("$query => $decision / $intent",({query,decision,intent})=>{
    const result=classify({seed:"what is credit monitoring",query});
    expect(result).toMatchObject({
      decision,pageIntent:intent,
      eligibleForArticleSerp:decision==="SAME_TOPIC_SUBQUESTION",
    });
  });
  it("notices real relational question but not bare adjacent entity",()=>{
    expect(classify({seed:"what is credit monitoring",
      query:"does credit monitoring affect credit score"}))
      .toMatchObject({decision:"SAME_TOPIC_SUBQUESTION",
        pageIntent:"INFORMATIONAL"});
    expect(classify({seed:"what is credit monitoring",
      query:"credit score"}))
      .toMatchObject({decision:"ADJACENT_ENTITY_NOT_SAME_TOPIC"});
  });
  it("returns explicit review instead of inventing SERP intent from bare label",()=>{
    const r=classify({seed:"what is credit monitoring",
      query:"3 bureau credit monitoring"});
    expect(r.reason).toBe("UNRESOLVED_GENERIC_PRODUCT_OR_INFORMATIONAL_INTENT");
    expect(r.eligibleForArticleSerp).toBe(false);
  });
});
