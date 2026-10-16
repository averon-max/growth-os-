/**
 * Independent single-stage QUESTION discovery, cache-first.
 *
 * FREE: --article=ID --market=US
 * EXPLICITLY PAID: above + --authorize-paid-question-suggestions
 *
 * Exactly ONE keyword_suggestions/live request (up to 100 rows);
 * ZERO deep SERP calls, ZERO AI calls. Never modifies article, Brief,
 * signed Query Graph, evidence ledger, or replay. Paid mode may update
 * keywordSuggestionCache only.
 */
import {loadEnvConfig} from "@next/env";
loadEnvConfig(process.env.GROWTH_OS_ENV_DIR?.trim()||process.cwd());
type Market="US"|"CA"|"GB"|"AU";
const markets=new Set(["US","CA","GB","AU"]);
async function main(){
  const args=process.argv.slice(2);
  const id=args.find(x=>x.startsWith("--article="))?.slice(10);
  const market=args.find(x=>x.startsWith("--market="))?.slice(9)?.toUpperCase();
  const paid=args.includes("--authorize-paid-question-suggestions");
  if(!id||!/^[a-z0-9_-]{5,100}$/i.test(id)||!market||
    !markets.has(market)||args.length!==(paid?3:2)||
    args.some(x=>!x.startsWith("--article=")&&
      !x.startsWith("--market=")&&
      x!=="--authorize-paid-question-suggestions"))
    throw new Error("USAGE: --article=ID --market=US|CA|GB|AU [--authorize-paid-question-suggestions]");
  const {prisma}=await import("../src/lib/prisma");
  try{
    const article=await prisma.contentArticle.findUnique({
      where:{id},include:{brief:{include:{evidenceSnapshot:true}}},
    });
    if(!article)throw new Error("QUESTION_RESEARCH_ARTICLE_MISSING");
    const {inspectMasterRuntimeSnapshot}=
      await import("../src/lib/content/master-runtime-adapter");
    const runtime=inspectMasterRuntimeSnapshot(
      article.brief.evidenceSnapshot?.plan).runtime;
    if(!runtime||runtime.mission.jurisdiction?.toUpperCase()!==market)
      throw new Error("QUESTION_RESEARCH_SIGNED_MISSION_MARKET_MISMATCH");
    if(!["english","en","en-us","en-ca","en-gb","en-au"].includes(
      runtime.mission.language.toLowerCase()))
      throw new Error("QUESTION_RESEARCH_SIGNED_MISSION_LANGUAGE_MISMATCH");
    const {assessKeywordTopicIntentV1}=
      await import("../src/lib/keywords/keyword-topic-intent-gate-v1");
    const {assessArticleQuestionScopeV2,groupObservedArticleQuestionsV2}=
      await import("../src/lib/keywords/article-question-scope-v2");
    const seed=article.brief.primaryKeyword;
    const topic=assessKeywordTopicIntentV1({seed,query:seed}).coreTopic;
    if(topic.length<4)throw new Error("QUESTION_RESEARCH_CORE_TOPIC_MISSING");
    const cacheKey=[
      "ARTICLE_QUESTION_SUGGESTIONS_V1",article.brief.websiteId,
      market,topic.toLowerCase(),"limit100","question-prefix-filter",
    ].join(":");
    const cached=await prisma.keywordSuggestionCache.findUnique({
      where:{normalized_source:{
        normalized:cacheKey,source:"ARTICLE_QUESTION_SUGGESTIONS_V1",
      }},
    });
    const {questionSuggestionsRequestV1}=
      await import("../src/lib/keywords/keyword-question-suggestions-provider-v1");
    type Result=Awaited<ReturnType<typeof import(
      "../src/lib/keywords/keyword-question-suggestions-provider-v1"
    )["fetchQuestionSuggestionsV1"]>>;
    const object=cached?.payload&&typeof cached.payload==="object"&&
      !Array.isArray(cached.payload)?
      cached.payload as Record<string,unknown>:null;
    const stored=object?.data&&typeof object.data==="object"&&
      !Array.isArray(object.data)?object.data as unknown as Result:null;
    const usable=stored?.source==="DATAFORSEO_KEYWORD_SUGGESTIONS"&&
      stored?.market===market&&stored.seed===topic&&
      Array.isArray(stored.suggestions)&&
      cached?.fetchedAt&&Date.now()-cached.fetchedAt.getTime()<7*86400000;
    if(!usable&&!paid){
      console.log(JSON.stringify({
        mode:"FREE_QUESTION_SUGGESTIONS_PREFLIGHT",
        articleId:id,market,seed,coreTopic:topic,
        request:questionSuggestionsRequestV1({
          seed:topic,market:market as Market,limit:100,
        }),
        provider:"DATAFORSEO_GOOGLE_KEYWORD_SUGGESTIONS",
        requiresExplicitPaidAuthorization:true,
        charges:"Unknown before provider response. One DataForSEO request, no deep SERP, no OpenAI.",
        paidProviderCalls:0,articleUnchanged:true,databaseUnchanged:true,
      },null,2));
      return;
    }
    let data:Result;
    let providerCalls=0;
    if(usable){
      data=stored!;
    }else{
      const {fetchQuestionSuggestionsV1}=
        await import("../src/lib/keywords/keyword-question-suggestions-provider-v1");
      providerCalls=1;
      data=await fetchQuestionSuggestionsV1({
        seed:topic,market:market as Market,limit:100,
      });
      await prisma.keywordSuggestionCache.upsert({
        where:{normalized_source:{
          normalized:cacheKey,source:"ARTICLE_QUESTION_SUGGESTIONS_V1",
        }},
        create:{normalized:cacheKey,
          source:"ARTICLE_QUESTION_SUGGESTIONS_V1",
          payload:JSON.parse(JSON.stringify({version:"V1",
            articleSeed:seed,data}))},
        update:{payload:JSON.parse(JSON.stringify({version:"V1",
            articleSeed:seed,data})),fetchedAt:new Date()},
      });
    }
    const semantic=groupObservedArticleQuestionsV2(
      seed,data.suggestions);
    const classified=data.suggestions.map(suggestion=>{
      const assessed=assessArticleQuestionScopeV2({
        seed,query:suggestion.keyword,
        providerMainIntent:suggestion.providerMainIntent,
      });
      return {
        ...suggestion,
        decision:assessed.baseDecision,
        semanticScope:assessed.status,
        semanticFamily:assessed.family,
        providerIntent:assessed.providerIntent,
        eligibleForEditorialReview:
          assessed.status==="CORE_INFORMATIONAL_CANDIDATE",
        reviewReason:assessed.reason,
        requiresEvidenceAndSamePageApproval:true,
      };
    });
    console.log(JSON.stringify({
      mode:"ARTICLE_QUESTION_SUGGESTIONS_REVIEW_V1",
      articleId:id,market,seed,coreTopic:topic,
      cacheHit:!!usable,
      providerCalls,
      chargedUsdThisRun:providerCalls?data.providerChargedUsd:0,
      providerReportedCostUsdHistorical:data.providerChargedUsd,
      observedSuggestions:classified.length,
      semanticScopeSummary:{
        topicalCandidates:semantic.topicalQuestions,
        separatePage:semantic.separatePageQueries.length,
        humanIntentReview:semantic.intentReviewQueries.length,
      },
      nonAdditiveQuestionClusters:semantic.semanticClusters,
      editorialReviewCandidates:classified.filter(s=>
        s.eligibleForEditorialReview),
      separatePageQueries:semantic.separatePageQueries.slice(0,35),
      humanIntentReviewQueries:semantic.intentReviewQueries.slice(0,35),
      noteOnGrouping:"Similar queries in a family do NOT have additive search volume. Their individual volume/KD is shown, not a fabricated total.",
      note:"These are real provider candidates, not article claims, validated H2 coverage, or publication approval. Review query intent and evidence before re-planning.",
      deepSerpCalls:0,aiCalls:0,
      articleUnchanged:true,briefUnchanged:true,
      evidenceSnapshotUnchanged:true,
      researchCacheMayBeUpdated:providerCalls>0,
    },null,2));
  }finally{await prisma.$disconnect();}
}
main().catch(error=>{
  console.error("ARTICLE_QUESTION_RESEARCH_STOPPED:",
    error instanceof Error?error.message:String(error));
  process.exitCode=1;
});
