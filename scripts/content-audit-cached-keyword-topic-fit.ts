/**
 * READ ONLY, FREE: run the new concept + intent gate over the actual
 * PREVIOUSLY PAID source snapshot. Never re-call DataForSEO/SERP/GPT.
 *
 * GROWTH_OS_ENV_DIR=/Users/user/growth-os \
 * NODE_OPTIONS=--conditions=react-server \
 * npx tsx scripts/content-audit-cached-keyword-topic-fit.ts \
 *   --article=ID --market=US
 */
import {loadEnvConfig} from "@next/env";
loadEnvConfig(process.env.GROWTH_OS_ENV_DIR?.trim()||process.cwd());

async function main(){
  const args=process.argv.slice(2);
  const articleId=args.find(x=>x.startsWith("--article="))?.slice(10);
  const market=args.find(x=>x.startsWith("--market="))?.slice(9)?.toUpperCase();
  if(args.length!==2||!articleId||
    !/^[a-z0-9_-]{5,100}$/i.test(articleId)||
    !market||!["US","CA","GB","AU"].includes(market))
    throw new Error("USAGE: --article=ID --market=US|CA|GB|AU");
  const {prisma}=await import("../src/lib/prisma");
  try{
    const article=await prisma.contentArticle.findUnique({
      where:{id:articleId},
      include:{brief:{include:{evidenceSnapshot:true}}},
    });
    if(!article)throw new Error("ARTICLE_NOT_FOUND");
    const {inspectMasterRuntimeSnapshot}=
      await import("../src/lib/content/master-runtime-adapter");
    const runtime=inspectMasterRuntimeSnapshot(
      article.brief.evidenceSnapshot?.plan).runtime;
    if(!runtime||runtime.mission.jurisdiction.toUpperCase()!==market)
      throw new Error("TOPIC_CACHE_MARKET_NOT_ARTICLE_MISSION");
    const seed=article.brief.primaryKeyword;
    const cacheKey=[
      article.brief.websiteId,market,seed.trim().toLowerCase(),
      75,3,false,"momentum-v1",
    ].join(":");
    const stored=await prisma.keywordSuggestionCache.findUnique({
      where:{normalized_source:{
        normalized:cacheKey,source:"KEYWORD_INTELLIGENCE_V2",
      }},
    });
    if(!stored)throw new Error(
      "PREVIOUS_PAID_75_3_KEYWORD_RESEARCH_CACHE_NOT_FOUND");
    const {parseCachedKeywordResearchV2}=
      await import("../src/lib/keywords/keyword-research-cache-v2");
    const snapshot=parseCachedKeywordResearchV2(stored.payload,{
      websiteId:article.brief.websiteId,cacheKey,seed,
      market:market as "US"|"CA"|"GB"|"AU",
    });
    if(!snapshot)throw new Error("PREVIOUS_PAID_KEYWORD_SNAPSHOT_INVALID");
    const {createTopicScopedKeywordShortlistV1}=
      await import("../src/lib/keywords/keyword-topic-scoped-shortlist-v1");
    const {assessKeywordTopicIntentV1}=
      await import("../src/lib/keywords/keyword-topic-intent-gate-v1");
    const scoped=createTopicScopedKeywordShortlistV1({
      seed,candidates:snapshot.candidateSnapshots,maxClusters:75,
    });
    const oldDeepSerp=snapshot.serpResults.map(s=>({
      query:s.query,
      topic:assessKeywordTopicIntentV1({seed,query:s.query}),
      analyzedPages:s.pagesAnalyzed,organicResults:s.organicResults,
    }));
    const sourceAgeHours=Math.round(
      (Date.now()-new Date(snapshot.collectedAt).getTime())/3600000*10)/10;
    console.log(JSON.stringify({
      mode:"FREE_RECLASSIFICATION_OF_PAID_KEYWORD_CACHE",
      articleId,market,seed,
      cacheCollectedAt:snapshot.collectedAt,sourceAgeHours,
      original:{
        observed:snapshot.observed,totalClusters:snapshot.totalClusters,
        displayedClusters:snapshot.clusters.length,
        expensiveSerpQueries:oldDeepSerp,
      },
      afterTopicGate:{
        eligibleCandidates:scoped.acceptedCandidateCount,
        eligibleClusters:scoped.clusters.length,
        shortlist:scoped.clusters.slice(0,20).map(cluster=>({
          query:cluster.primary.keyword,
          intent:cluster.intent,
          source:cluster.primary.sources,
          searchVolume:cluster.primary.searchVolume,
          difficulty:cluster.primary.keywordDifficulty,
          scoreAfterScope:cluster.opportunityScore,
          classification:assessKeywordTopicIntentV1({
            seed,query:cluster.primary.keyword,
          }).decision,
        })),
        rejected:scoped.assessments.filter(x=>!x.eligibleForArticleSerp)
          .slice(0,45),
      },
      note:"Already-paid evidence only; presence in this topical shortlist does not itself prove that a query should be an H2 on the existing page. Verify page intent, factual sources and signed ownership before rewriting.",
      paidProviderCalls:0,paidSerpCalls:0,paidWriterCalls:0,
      articleUnchanged:true,databaseUnchanged:true,
    },null,2));
  }finally{await prisma.$disconnect();}
}
main().catch(error=>{
  console.error("TOPIC_CACHE_AUDIT_STOPPED:",
    error instanceof Error?error.message:String(error));
  process.exitCode=1;
});
