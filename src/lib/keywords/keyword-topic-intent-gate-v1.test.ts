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
    "free credit monitoring",
    "3 bureau credit monitoring",
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
    ["best credit monitoring services","SEPARATE_COMMERCIAL_PAGE"],
    ["credit monitoring reviews","SEPARATE_COMMERCIAL_PAGE"],
    ["credit monitoring jobs near me","SEPARATE_NAVIGATION_OR_SUPPORT"],
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
