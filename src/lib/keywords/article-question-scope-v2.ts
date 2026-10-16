/**
 * Second-stage semantic-scope TRIAGE for provider-observed question
 * queries. Unlike keyword-relevance, this decides the question's ACTUAL
 * READER JOB: consumer education vs product/brand/support, tax/legal,
 * entrepreneurship, community-forum, or adjacent service feature.
 *
 * A deterministic boundary, not general-purpose LLM understanding:
 * ambiguous concepts go to REVIEW, not auto same-page. Neither same-page
 * proposals nor numerical demand are treated as proved H2 coverage.
 */
import {normalizeKeywordV2} from "./keyword-intelligence-v2";
import {assessKeywordTopicIntentV1}
  from "./keyword-topic-intent-gate-v1";

export type ArticleQuestionScopeV2=
  "CORE_INFORMATIONAL_CANDIDATE"|
  "SEPARATE_PAGE_INTENT"|
  "HUMAN_INTENT_REVIEW";
export type ArticleQuestionFamilyV2=
  "DEFINITION"|"OPERATION_AND_ALERTS"|"COST"|"VALUE_AND_NECESSITY"|
  "WHO_NEEDS_IT"|"FREE_AND_PAID"|"CREDIT_SCORE_RELATION"|
  "FREEZE_AND_PROTECTION"|"ACTIVATION_AND_ACCESS"|
  "LIMITS_AND_BENEFITS"|"MISCELLANEOUS";
export type ArticleQuestionTriageV2={
  query:string;
  status:ArticleQuestionScopeV2;
  family:ArticleQuestionFamilyV2|null;
  reason:string;
  providerIntent:string|null;
  baseDecision:string;
  requiresEvidenceAndSamePageApproval:true;
};
const normalize=(value:string)=>normalizeKeywordV2(value);
function isProviderSpecificSubject(value:string,core:string){
  if(!core||!value.includes(core))return false;
  const before=value.slice(0,value.indexOf(core)).trim();
  if(/^(?:does|do|can|is|are|has|have|will)\s+.+\s+(?:offer|offers|offering|provide|provides|providing|include|includes|give|gives)(?:\s+(?:free|paid))?$/u.test(before))
    return true;
  const prefix=/^(?:what is|what was|is|are|how much is|how much does|what happened to|how does)\s+(.+)$/u.exec(before);
  if(prefix){
    const leftover=prefix[1].replace(/^(?:a|an|the)(?:\s+|$)/u,"")
      .replace(/^(?:free|paid|premium|basic|good|3|three|single|new|personal|consumer)(?:\s+|$)/u,"").trim();
    if(leftover)return true;
  }
  return false;
}
function familyForQuestion(value:string):ArticleQuestionFamilyV2{
  if(/\b(?:credit score|credit scores|hard inquiry|soft inquiry)\b/u.test(value))
    return "CREDIT_SCORE_RELATION";
  if(/\b(?:frozen|freeze|freezing|identity theft|prevent fraud)\b/u.test(value))
    return "FREEZE_AND_PROTECTION";
  if(/\b(?:do i have|how do i know|already have|am i enrolled|enroll|signed up)\b/u.test(value))
    return "ACTIVATION_AND_ACCESS";
  if(/\b(?:worth it|worth the|is it worth|should you pay|should i pay)\b/u.test(value))
    return "VALUE_AND_NECESSITY";
  if(/\b(?:how much|cost|price|per year|expensive|afford)\b/u.test(value))
    return "COST";
  if(/\b(?:free|without paying|no cost)\b/u.test(value))
    return "FREE_AND_PAID";
  if(/\b(?:do i need|should i|why.+important|benefit|benefits|who needs)\b/u.test(value))
    return "WHO_NEEDS_IT";
  if(/\b(?:alert|alerts|notification|notifications|how does|how do|what does.+do|what can.+detect)\b/u.test(value))
    return "OPERATION_AND_ALERTS";
  if(/\b(?:limitations|protect|prevent|can it|risks|does it help)\b/u.test(value))
    return "LIMITS_AND_BENEFITS";
  if(/\b(?:what is|what are|mean|meaning|definition|what does.+mean)\b/u.test(value))
    return "DEFINITION";
  return "MISCELLANEOUS";
}
export function assessArticleQuestionScopeV2({
  seed,query,providerMainIntent,
}:{
  seed:string;query:string;providerMainIntent:string|null;
}):ArticleQuestionTriageV2{
  const value=normalize(query);
  const base=assessKeywordTopicIntentV1({seed,query});
  const core=base.coreTopic;
  const providerIntent=providerMainIntent?.trim().toLowerCase()??null;
  const reply=(status:ArticleQuestionScopeV2,reason:string):ArticleQuestionTriageV2=>({
    query,status,reason,
    family:status==="CORE_INFORMATIONAL_CANDIDATE"?
      familyForQuestion(value):null,
    providerIntent,baseDecision:base.decision,
    requiresEvidenceAndSamePageApproval:true,
  });

  // Evaluate the READER'S ASK before letting "credit monitoring" or
  // a provider's broad informational intent certify this page.
  // Credit Monitoring Arrangement (CMA) is a distinct banking
  // business-credit appraisal concept in verified lender terminology,
  // NOT consumer credit-report monitoring. Protect the top-volume
  // false positive rather than trusting lexical/topic match.
  if(/\bcredit monitoring arrangements?\b/u.test(value)&&
    !/\bcredit monitoring arrangements?\b/u.test(normalize(seed)))
    return reply("SEPARATE_PAGE_INTENT",
      "BANKING_CREDIT_MONITORING_ARRANGEMENT_NOT_CONSUMER_REPORT_SERVICE");
  // Named provider hidden in enrollment grammar: "should i enroll in IDX
  // credit monitoring". The general "should i sign up for credit
  // monitoring" has NO named provider, so this rule must not exclude it.
  const brandedEnrollment=/^(?:should|can|do|how do|how can)\s+(?:i\s+)?(?:enroll in|sign up for|activate|join|subscribe to)\s+(.+?)\s+credit monitoring\b/u.exec(value);
  if(brandedEnrollment&&brandedEnrollment[1].trim())
    return reply("SEPARATE_PAGE_INTENT",
      "NAMED_PROVIDER_ENROLLMENT_INTENT");
  if(/\b(?:tax deductible|tax deduction|tax return|tax write off)\b/u.test(value))
    return reply("SEPARATE_PAGE_INTENT","TAX_TREATMENT_NOT_CONSUMER_EXPLAINER");
  if(/\b(?:start|launch|build|create|open|run)\s+(?:a\s+|an\s+)?(?:\w+\s+){0,4}(?:business|company|agency)\b/u.test(value))
    return reply("SEPARATE_PAGE_INTENT","BUSINESS_CREATION_NOT_CONSUMER_EXPLAINER");
  if(/\b(?:reddit|quora|forum|trustpilot|glassdoor)\b/u.test(value))
    return reply("SEPARATE_PAGE_INTENT","THIRD_PARTY_COMMUNITY_PLATFORM_INTENT");
  if(/\b(?:what happened to|whatever happened to)\b/u.test(value))
    return reply("SEPARATE_PAGE_INTENT","VENDOR_NEWS_OR_ACCOUNT_STATUS_INTENT");
  if(/\b(?:which|what are|what is a good|what is the good)\b.+\b(?:companies|company|providers|provider|brands|good .+ service)\b/u.test(value))
    return reply("SEPARATE_PAGE_INTENT","VENDOR_SELECTION_OR_DIRECTORY_INTENT");
  if(/^what is (?:a|the) good .*(?:service|provider|company)\b/u.test(value)||
    /^which .*(?:service|provider|company)\b/u.test(value))
    return reply("SEPARATE_PAGE_INTENT","PROVIDER_CHOICE_REQUIRES_COMPARISON_PAGE");
  if(isProviderSpecificSubject(value,core))
    return reply("SEPARATE_PAGE_INTENT","NAMED_SUBJECT_OR_PROVIDER_SERVICE_INTENT");
  if(/\b(?:internet surveillance|dark web scan)\b.+\b(?:report|dashboard|feature)\b/u.test(value))
    return reply("HUMAN_INTENT_REVIEW","PRODUCT_SPECIFIC_FEATURE_NOT_CORE_DEFINITION");
  if(/\b(?:monitoring system|monitoring systems)\b/u.test(value))
    return reply("HUMAN_INTENT_REVIEW","SYSTEM_MAY_MEAN_ENTERPRISE_SOFTWARE_OR_CONSUMER_SERVICE");

  if(!base.eligibleForArticleSerp)
    return reply(base.decision==="AMBIGUOUS_TOPIC_REVIEW"?
      "HUMAN_INTENT_REVIEW":"SEPARATE_PAGE_INTENT",
      "UPSTREAM_TOPIC_AND_PAGE_INTENT_"+base.reason);

  // Provider data is OBSERVATION, not a semantic oracle. A conflicting
  // commercial/transactional label requires review instead of being
  // accepted on the strength of one lexical token.
  if(providerIntent&&providerIntent!=="informational")
    return reply("HUMAN_INTENT_REVIEW","PROVIDER_INTENT_CONFLICT_"+providerIntent);

  return reply("CORE_INFORMATIONAL_CANDIDATE",
    "READER_QUESTION_ALIGNED_WITH_CORE_SUBJECT");
}

export function groupObservedArticleQuestionsV2<T extends {
  keyword:string;searchVolume:number|null;keywordDifficulty:number|null;
  providerMainIntent:string|null;
}>(seed:string,items:readonly T[]){
  const assessed=items.map(item=>({
    ...item,scope:assessArticleQuestionScopeV2({
      seed,query:item.keyword,providerMainIntent:item.providerMainIntent,
    }),
  }));
  const candidates=assessed.filter(item=>
    item.scope.status==="CORE_INFORMATIONAL_CANDIDATE");
  const byFamily=new Map<ArticleQuestionFamilyV2,typeof candidates>();
  for(const item of candidates){
    const family=item.scope.family!;
    const bucket=byFamily.get(family)??[];
    bucket.push(item);
    byFamily.set(family,bucket);
  }
  const byVolume=(a:{
    searchVolume:number|null;query?:string;keyword?:string;
  },b:{
    searchVolume:number|null;query?:string;keyword?:string;
  })=>(b.searchVolume??-1)-(a.searchVolume??-1)||
    (a.keyword??a.query??"").localeCompare(b.keyword??b.query??"");
  const familyGroups=[...byFamily.entries()].map(([family,rows])=>({
    family,
    distinctObservedQueries:rows.length,
    // Never add variant volumes: overlapping queries are NOT additive.
    highestObservedSearchVolume:rows.reduce<number|null>((value,row)=>
      row.searchVolume===null?value:
      Math.max(value??0,row.searchVolume),null),
    questions:[...rows].sort(byVolume).map(x=>({
      query:x.keyword,searchVolume:x.searchVolume,
      keywordDifficulty:x.keywordDifficulty,
    })),
  })).sort((a,b)=>
    (b.highestObservedSearchVolume??-1)-
      (a.highestObservedSearchVolume??-1)||
    a.family.localeCompare(b.family));
  return {
    observed:items.length,
    topicalQuestions:candidates.length,
    separatePageQueries:assessed.filter(item=>
      item.scope.status==="SEPARATE_PAGE_INTENT").map(item=>({
        query:item.keyword,searchVolume:item.searchVolume,
        reason:item.scope.reason,
      })).sort(byVolume),
    intentReviewQueries:assessed.filter(item=>
      item.scope.status==="HUMAN_INTENT_REVIEW").map(item=>({
        query:item.keyword,searchVolume:item.searchVolume,
        reason:item.scope.reason,
      })).sort(byVolume),
    semanticClusters:familyGroups,
  };
}
