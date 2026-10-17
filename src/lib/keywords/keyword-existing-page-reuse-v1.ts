import {assessKeywordTopicIntentV1,keywordCoreTopicV1} from "./keyword-topic-intent-gate-v1";
import {auditDeepSerpReadinessV1} from "./keyword-deep-serp-readiness-v1";
import type {KeywordCandidateV2,SerpOpportunityV2} from "./keyword-intelligence-v2";

const normalize=(value:string)=>value.toLocaleLowerCase("en-US")
  .replace(/[^\p{L}\p{N}]+/gu," ").trim();
const queryTerms=(value:string)=>new Set(normalize(value).split(" ")
  .filter(t=>t.length>=3&&!new Set([
    "what","does","your","the","are","for","how","its","why","and",
  ]).has(t)));
const headingSimilarity=(a:string,b:string)=>{
  const left=queryTerms(a),right=queryTerms(b);
  if(!left.size||!right.size)return 0;
  let shared=0;for(const term of left)if(right.has(term))shared++;
  return shared/new Set([...left,...right]).size;
};

export function auditPaidSerpReuseForExistingPageV1(input:{
  seed:string;market:string;
  websiteId:string;
  article:{
    id:string;websiteId:string;title:string;bodyMarkdown:string;
    status:string;primaryKeyword:string;
  };
  candidateSnapshots:readonly KeywordCandidateV2[];
  serpResults:readonly SerpOpportunityV2[];
}){
  if(input.websiteId!==input.article.websiteId)
    throw new Error("ARTICLE_RESEARCH_WEBSITE_MISMATCH");
  const core=keywordCoreTopicV1(input.seed);
  const articleMain=normalize([input.article.title,
    input.article.primaryKeyword].join(" "));
  if(!core||!articleMain.includes(core))
    throw new Error("ARTICLE_DOES_NOT_OWN_RESEARCH_TOPIC");
  const headings=[...input.article.bodyMarkdown.matchAll(
    /^##[ \t]+(.+)$/gm)].map(m=>m[1].trim());
  const lookup=new Map(input.candidateSnapshots.map(c=>[
    normalize(c.keyword),c] as const));
  const observed=input.serpResults.map(serp=>{
    const intent=assessKeywordTopicIntentV1({
      seed:input.seed,query:serp.query,
    });
    const deep=auditDeepSerpReadinessV1(serp,core);
    const candidate=lookup.get(normalize(serp.query));
    const h2=headings.map(heading=>({
      heading,score:headingSimilarity(serp.query,heading),
    })).sort((a,b)=>b.score-a.score)[0]??null;
    const samePage=intent.eligibleForArticleSerp &&
      deep.status==="DEEP_COMPETITOR_OBSERVED";
    const score=h2?.score??0;
    const isSeedTopic=normalize(serp.query)===core||
      normalize(serp.query)===normalize(input.seed);
    return {
      query:serp.query,
      observedVolume:candidate?.searchVolume??null,
      observedOrganicKD:candidate?.keywordDifficulty??null,
      observedGscAveragePosition:candidate?.position??null,
      observedSources:candidate?.sources??[],
      historicalOpportunityScore:candidate?.opportunityScore??null,
      intentDecision:intent.decision,
      deepResearchStatus:deep.status,
      deepBlockers:deep.blockers,
      usableCompetitorPages:deep.fetchedCompetitorPages,
      topOneTopicAligned:deep.topOneMatchesCoreTopic,
      existingArticleRoute:samePage
        ?isSeedTopic?"EXISTING_PAGE_PRIMARY_TOPIC"
        :score>=0.70?"EXISTING_H2_POSSIBLE_SUPPORT"
        :"EXISTING_PAGE_EDITORIAL_REVIEW"
        :"NOT_AUTHORIZED_FOR_PAGE",
      closestExistingH2:h2&&score>=0.45?h2.heading:null,
      h2LexicalOverlap:score,
      signedQueryOwnershipVerified:false,
      signedClaimEvidenceVerified:false,
      mayCreateNewArticle:false,
      canWriteToExistingArticle:false,
      // A related intent and deep content observation do NOT sign evidence.
    };
  });
  const reusable=observed.filter(row=>row.existingArticleRoute!==
    "NOT_AUTHORIZED_FOR_PAGE");
  return {
    version:"EXISTING_PAGE_PAID_SERP_REUSE_V1",
    existingArticleId:input.article.id,
    articleStatus:input.article.status,
    market:input.market,seed:input.seed,coreTopic:core,
    originalSerpCount:input.serpResults.length,
    reuseCandidateCount:reusable.length,
    reuseCandidates:reusable,
    rejectedOrUnverifiedSerps:observed.filter(row=>
      row.existingArticleRoute==="NOT_AUTHORIZED_FOR_PAGE"),
    route:reusable.length
      ?"REVIEW_SAME_ARTICLE_RESEARCH_ENRICHMENT"
      :"NO_DEEP_SERP_AVAILABLE_FOR_EXISTING_ARTICLE",
    nextAction:"REVIEW_VERSIONED_QUERY_GRAPH_AND_SIGNED_EVIDENCE_ON_EXISTING_ARTICLE",
    newArticleAllowed:false,publishAllowed:false,cacheMutated:false,
    modelCalls:0,providerCalls:0,
    note:"Read-only historical market observations. No implicit primary selection, new article, editorial verification or evidence ownership change.",
  };
}
