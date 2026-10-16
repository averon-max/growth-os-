/**
 * Topic/entity + page-intent eligibility for informational keyword research.
 *
 * This is a CONSERVATIVE deterministic guard, not a semantic model:
 * lexical overlap is never enough to prove same-page relevance.
 * New/ambiguous intents are REVIEW, not silently forced into the article.
 * Paid SERP sampling may only examine SAME_TOPIC_SUBQUESTION candidates.
 */
import {normalizeKeywordV2} from "./keyword-intelligence-v2";

export type KeywordTopicDecisionV1=
  "SAME_TOPIC_SUBQUESTION"|"SEPARATE_BRAND_PRODUCT_PAGE"|
  "SEPARATE_NAVIGATION_OR_SUPPORT"|"ADJACENT_ENTITY_NOT_SAME_TOPIC"|
  "AMBIGUOUS_TOPIC_REVIEW";
export type KeywordTopicAssessmentV1={
  query:string;
  seed:string;
  coreTopic:string;
  decision:KeywordTopicDecisionV1;
  eligibleForArticleSerp:boolean;
  reason:string;
};
const normalize=normalizeKeywordV2;
const topicFromSeed=(seed:string)=>{
  const stripped=normalize(seed)
    .replace(/^(what is|what are|how does|how do|how can|why does|why is|guide to|introduction to|understanding)\s+/u,"")
    .replace(/\s+(explained|guide|definition|meaning|overview)$/u,"").trim();
  return stripped;
};
const phrase=(text:string,value:string)=>
  Boolean(value)&&(" "+text+" ").includes(" "+value+" ");
const creditMonitoringVendorNames=[
  "credit karma","equifax","experian","transunion","trans union","aura",
  "myfico","identityforce","credit sesame","freescore360",
  "capital one","chase","wallethub",
] as const;
const navOrSupport=[
  "phone number","customer service","customer support","contact number",
  "contact information","address and phone","phone number change",
  "phone number verification","hours of operation","opening hours",
  "login","log in","sign in","account recovery","reset password",
  "activation code","verification code",
  "jobs near me","job openings","career opportunities",
  "salary","careers","employment","vacancies",
] as const;
const commercialReviews=[
  "best","top","reviews","review","alternatives","buy",
  "purchase","subscribe","plans","cheapest",
] as const;
function isBrandQuery(query:string,core:string){
  // When a brand is the TOPIC (e.g. "Aura review"), don't exclude it.
  return creditMonitoringVendorNames.some(brand=>
    phrase(query,brand)&&!phrase(core,brand));
}
function isNavigation(query:string){
  return navOrSupport.some(x=>phrase(query,x))||
    /\b(?:hours|telephone|helpline)\b/u.test(query);
}
export function assessKeywordTopicIntentV1({
  seed,query,
}:{
  seed:string;query:string;
}):KeywordTopicAssessmentV1{
  const core=topicFromSeed(seed);
  const normalized=normalize(query);
  if(!core||!normalized)return {
    seed,query,coreTopic:core,
    decision:"AMBIGUOUS_TOPIC_REVIEW",eligibleForArticleSerp:false,
    reason:"TOPIC_OR_QUERY_EMPTY",
  };
  if(isNavigation(normalized))return {
    seed,query,coreTopic:core,
    decision:"SEPARATE_NAVIGATION_OR_SUPPORT",
    eligibleForArticleSerp:false,
    reason:"SUPPORT_OR_NAVIGATION_INTENT_NOT_EDUCATIONAL_CONTENT",
  };
  const informationalSeed=/^(what is|what are|how does|how do|how can|why|does|is)\s/u
    .test(normalize(seed));
  const commercialIntent=informationalSeed&&
    (commercialReviews.some(term=>phrase(normalized,term)) ||
      /\b(?:comparison of providers|compare monitoring companies)\b/u
        .test(normalized));
  if(commercialIntent)return {
    seed,query,coreTopic:core,
    decision:"SEPARATE_BRAND_PRODUCT_PAGE",eligibleForArticleSerp:false,
    reason:"BUYER_COMPARISON_INTENT_SEPARATE_FROM_INFORMATIONAL_DEFINITION",
  };
  if(isBrandQuery(normalized,core))return {
    seed,query,coreTopic:core,
    decision:"SEPARATE_BRAND_PRODUCT_PAGE",eligibleForArticleSerp:false,
    reason:"NAMED_PRODUCT_OR_BRAND_REQUIRES_OWN_PAGE_INTENT",
  };
  // Core entity must remain the SUBJECT. "credit score" alone is not
  // "credit monitoring"; but the relational question "does credit
  // monitoring affect credit score?" is eligible because the primary
  // concept appears intact and the verb defines the relationship.
  if(phrase(normalized,core))return {
    seed,query,coreTopic:core,
    decision:"SAME_TOPIC_SUBQUESTION",eligibleForArticleSerp:true,
    reason:"CORE_ENTITY_EXPLICIT_AND_INFO_INTENT_COMPATIBLE",
  };
  return {
    seed,query,coreTopic:core,
    decision:"ADJACENT_ENTITY_NOT_SAME_TOPIC",
    eligibleForArticleSerp:false,
    reason:"NO_EXPLICIT_CORE_TOPIC_OR_APPROVED_EQUIVALENT",
  };
}
