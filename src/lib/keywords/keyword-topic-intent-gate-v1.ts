/**
 * Two distinct questions must both pass before an expensive SERP request:
 * 1. Is the SAME CONCEPT the subject (not just a shared token)?
 * 2. Is the USER TASK compatible with this page type?
 *
 * A conservative lexical policy: unverified synonyms and mixed commercial
 * intents remain REVIEW, never silently promoted to article coverage.
 * It is not an LLM semantic equivalence model.
 */
import {normalizeKeywordV2} from "./keyword-intelligence-v2";

export type KeywordTopicDecisionV1=
  "SAME_TOPIC_SUBQUESTION"|"SEPARATE_BRAND_PRODUCT_PAGE"|
  "SEPARATE_COMMERCIAL_PAGE"|
  "SEPARATE_NAVIGATION_OR_SUPPORT"|"ADJACENT_ENTITY_NOT_SAME_TOPIC"|
  "AMBIGUOUS_TOPIC_REVIEW";
export type KeywordPageIntentV1=
  "INFORMATIONAL"|"COMMERCIAL"|"NAVIGATIONAL"|"MIXED"|"UNDETERMINED";
export type KeywordTopicAssessmentV1={
  query:string;seed:string;coreTopic:string;
  decision:KeywordTopicDecisionV1;
  pageIntent:KeywordPageIntentV1;
  eligibleForArticleSerp:boolean;
  reason:string;
};
const normalize=normalizeKeywordV2;
export const keywordCoreTopicV1=(seed:string)=>normalize(seed)
  .replace(/^(what is|what are|how does|how do|how can|why does|why is|guide to|introduction to|understanding)\s+/u,"")
  .replace(/\s+(explained|guide|definition|meaning|overview)$/u,"").trim();
const phrase=(text:string,value:string)=>
  Boolean(value)&&(" "+text+" ").includes(" "+value+" ");
const vendors=[
  "credit karma","equifax","experian","transunion","trans union","aura",
  "myfico","identityforce","credit sesame","freescore360",
  "capital one","chase","wallethub",
] as const;
const navigation=[
  "phone number","customer service","customer support","contact number",
  "contact information","address and phone","phone number change",
  "phone number verification","hours of operation","opening hours",
  "login","log in","sign in","account recovery","reset password",
  "activation code","verification code",
  "jobs near me","job openings","career opportunities",
  "salary","careers","employment","vacancies",
] as const;
const commercial=[
  "best","top","reviews","review","alternatives","alternative",
  "buy","purchase","subscribe","plans","cheapest",
] as const;
const buyerEntities=[
  "companies","company","providers","provider","apps","app",
  "software","tools","products","platforms","services",
  "subscriptions","deals",
] as const;
const mixedBareModifiers=[
  "free","3 bureau","three bureau","paid","premium","low cost",
] as const;
const informationalModifiers=[
  "benefits","limitations","alert","alerts","coverage","how it works",
  "definition","meaning","explained","effects","impact","risks",
] as const;
const informationalQuestion=/^(?:what|who|how|why|when|where|does|do|can|could|will|would|is|are|should|which)\s/u;
function make(
  seed:string,query:string,coreTopic:string,
  decision:KeywordTopicDecisionV1,pageIntent:KeywordPageIntentV1,
  reason:string,
):KeywordTopicAssessmentV1{
  return {seed,query,coreTopic,decision,pageIntent,
    eligibleForArticleSerp:decision==="SAME_TOPIC_SUBQUESTION",reason};
}
export function assessKeywordTopicIntentV1({
  seed,query,
}:{seed:string;query:string;}):KeywordTopicAssessmentV1{
  const core=keywordCoreTopicV1(seed);
  const value=normalize(query);
  if(!core||!value)
    return make(seed,query,core,"AMBIGUOUS_TOPIC_REVIEW",
      "UNDETERMINED","TOPIC_OR_QUERY_EMPTY");
  if(navigation.some(x=>phrase(value,x))||
    /\b(?:hours|telephone|helpline)\b/u.test(value))
    return make(seed,query,core,"SEPARATE_NAVIGATION_OR_SUPPORT",
      "NAVIGATIONAL","SUPPORT_OR_NAVIGATION_INTENT_NOT_EDUCATIONAL_CONTENT");
  // Named vendor products have their own page, unless the vendor itself
  // is explicitly the source page's topic (e.g. Aura review).
  if(vendors.some(vendor=>phrase(value,vendor)&&!phrase(core,vendor)))
    return make(seed,query,core,"SEPARATE_BRAND_PRODUCT_PAGE",
      "COMMERCIAL","NAMED_PRODUCT_OR_BRAND_REQUIRES_OWN_PAGE_INTENT");
  if(!phrase(value,core))
    return make(seed,query,core,"ADJACENT_ENTITY_NOT_SAME_TOPIC",
      "UNDETERMINED","NO_EXPLICIT_CORE_TOPIC_OR_APPROVED_EQUIVALENT");
  // A buyer-comparison keyword is incompatible with a definition article,
  // including queries that literally contain the core concept.
  const informationalSeed=/^(?:what is|what are|how does|how do|how can|why|does|is)\s/u
    .test(normalize(seed));
  const commercialSeed=
    /\b(?:best|top|reviews?|compare|alternatives?|products?|providers?)\b/u
      .test(normalize(seed));
  const explicitCommercial=commercial.some(x=>phrase(value,x));
  const hasBuyerEntity=buyerEntities.some(x=>phrase(value,x));
  const question=informationalQuestion.test(value);
  const contrast=phrase(value,"vs")||phrase(value,"versus")||
    phrase(value,"difference between");
  if(informationalSeed&&!commercialSeed&&explicitCommercial&&
    !(contrast&&!hasBuyerEntity))
    return make(seed,query,core,"SEPARATE_COMMERCIAL_PAGE",
      "COMMERCIAL","BUYER_COMPARISON_INTENT_SEPARATE_FROM_INFORMATIONAL_DEFINITION");
  if(informationalSeed&&!commercialSeed&&hasBuyerEntity&&!question)
    return make(seed,query,core,"SEPARATE_COMMERCIAL_PAGE",
      "COMMERCIAL","PROVIDER_APP_OR_SERVICE_SELECTION_NOT_DEFINITION_INTENT");
  if(informationalSeed&&!commercialSeed&&
    mixedBareModifiers.some(x=>phrase(value,x))&&!question){
    // "free credit monitoring" can be navigational, provider selection,
    // or a definition. "3 bureau credit monitoring" has mixed intent.
    // Keep as evidence to review; do not buy generic SERPs yet.
    if(value===core||value.split(" ").length<=core.split(" ").length+3)
      return make(seed,query,core,"AMBIGUOUS_TOPIC_REVIEW",
        "MIXED","UNRESOLVED_GENERIC_PRODUCT_OR_INFORMATIONAL_INTENT");
  }
  if(contrast&&!hasBuyerEntity)
    return make(seed,query,core,"SAME_TOPIC_SUBQUESTION",
      "INFORMATIONAL","EXPLANATORY_COMPARISON_OF_CONCEPTS");
  if(question)return make(seed,query,core,"SAME_TOPIC_SUBQUESTION",
    "INFORMATIONAL","DIRECT_QUESTION_ABOUT_CORE_ENTITY");
  if(commercialSeed)
    return make(seed,query,core,"SAME_TOPIC_SUBQUESTION",
      "COMMERCIAL","QUERY_ALIGNED_WITH_EXPLICIT_COMMERCIAL_SEED");
  if(informationalModifiers.some(x=>phrase(value,x)))
    return make(seed,query,core,"SAME_TOPIC_SUBQUESTION",
      "INFORMATIONAL","EXPLANATORY_SUBTOPIC_OF_CORE_ENTITY");
  if(value===core)
    return make(seed,query,core,"SAME_TOPIC_SUBQUESTION",
      "INFORMATIONAL","EXACT_SEED_TOPIC");
  // Bare lexical overlap is never enough for a paid SERP decision.
  return make(seed,query,core,"AMBIGUOUS_TOPIC_REVIEW",
    "MIXED","CORE_ENTITY_SHARED_BUT_READER_TASK_UNVERIFIED");
}
