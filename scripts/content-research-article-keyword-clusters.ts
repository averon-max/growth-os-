/**
 * Same-article market keyword discovery. Free preview by default.
 * PAID run uses the EXISTING cache/checkpoint-protected DataForSEO V2
 * research pipeline, explicitly requires user authorizing spend.
 * Does NOT modify article, evidence snapshot, query graph or headings.
 *
 * npx tsx scripts/content-research-article-keyword-clusters.ts \
 *   --article=ID --market=US
 *
 * Optional paid:
 *   ... --article=ID --market=US --authorize-paid-research
 */
import {loadEnvConfig} from "@next/env";
loadEnvConfig(process.env.GROWTH_OS_ENV_DIR?.trim()||process.cwd());
async function main(){
  const args=process.argv.slice(2);
  const id=args.find(s=>s.startsWith("--article="))?.slice(10);
  const market=args.find(s=>s.startsWith("--market="))?.slice(9)?.toUpperCase();
  const paid=args.includes("--authorize-paid-research");
  if(!id||!/^[a-z0-9_-]{5,100}$/i.test(id)||
    !market||!["US","CA","GB","AU"].includes(market)||
    args.some(x=>x!=="--authorize-paid-research"&&
      !x.startsWith("--article=")&&!x.startsWith("--market=")))
    throw new Error("USAGE: --article=ID --market=US|CA|GB|AU [--authorize-paid-research]");
  const {prisma}=await import("../src/lib/prisma");
  try{
    const article=await prisma.contentArticle.findUnique({
      where:{id},include:{brief:{include:{evidenceSnapshot:true}}},
    });
    if(!article)throw new Error("ARTICLE_NOT_FOUND");
    const {inspectMasterRuntimeSnapshot}=
      await import("../src/lib/content/master-runtime-adapter");
    const saved=article.brief.evidenceSnapshot?.plan;
    const runtime=inspectMasterRuntimeSnapshot(saved).runtime;
    if(!runtime)throw new Error("SEARCH_RESEARCH_RUNTIME_MISSING");
    const expected={
      US:"United States",CA:"Canada",GB:"United Kingdom",AU:"Australia",
    } as const;
    const normalized=runtime.mission.location.trim().toLowerCase();
    const allowed=new Set([market.toLowerCase(),expected[
      market as keyof typeof expected].toLowerCase()]);
    if(!allowed.has(normalized))
      throw new Error("SEARCH_RESEARCH_MARKET_MISMATCH:"+market+
        ":Mission="+runtime.mission.location);
    if(!["en","en-us","en-ca","english","en-gb","en-au"].includes(
      runtime.mission.language.toLowerCase()))
      throw new Error("SEARCH_RESEARCH_LANGUAGE_REVIEW_REQUIRED");
    const request={
      articleId:id,websiteId:article.brief.websiteId,
      seed:article.brief.primaryKeyword,market,
      limit:75,deepSerpLimit:3,useGptDecision:false,
    };
    if(!paid){
      console.log(JSON.stringify({
        mode:"FREE_KEYWORD_RESEARCH_PREFLIGHT",
        ...request,source:"EXISTING_KEYWORD_INTELLIGENCE_V2",
        runtimeMissionVersion:runtime.mission.version,
        warning:"The paid option may make provider calls and write research CACHE, but never overwrites the article, brief, or evidence snapshot. Query assignment still requires human intent and claim review.",
        apiCalls:0,articleUnchanged:true,databaseUnchanged:true,
      },null,2));
      return;
    }
    const {researchKeywordOpportunitiesV2}=
      await import("../src/lib/keywords/keyword-research-v2");
    const {inspectObservedKeywordArticleBridgeV1}=
      await import("../src/lib/content/observed-keyword-article-bridge-v1");
    const result=await researchKeywordOpportunitiesV2({
      websiteId:article.brief.websiteId,
      seed:article.brief.primaryKeyword,
      market:market as "US"|"CA"|"GB"|"AU",
      limit:75,deepSerpLimit:3,
      authorizePaidResearch:true,useGptDecision:false,
    });
    const candidates=inspectObservedKeywordArticleBridgeV1({
      clusters:result.clusters,
      queryGraph:runtime.queryGraph,
      blueprints:runtime.sectionBlueprints,
    });
    console.log(JSON.stringify({
      mode:"PAID_MARKET_KEYWORD_RESEARCH_COMPLETED",
      articleId:id,market:result.market,seed:result.seed,
      cacheHit:result.cacheHit,collectedAt:result.collectedAt,
      observed:result.observed,totalClusters:result.totalClusters,
      decision:result.decision,
      candidates:candidates.slice(0,90),
      serpResults:result.serpResults,
      warning:"Research candidates are not yet bound to article evidence. Do not auto-insert phrases, claim page coverage or publish based on this report. Review SERP intent and claim support first.",
      contentArticleUnchanged:true,briefUnchanged:true,
      evidenceSnapshotUnchanged:true,
      keywordResearchCacheMayBeUpdated:true,
    },null,2));
  }finally{
    await prisma.$disconnect();
  }
}
main().catch(e=>{
  console.error("KEYWORD_CLUSTER_RESEARCH_STOPPED:",
    e instanceof Error?e.message:String(e));
  process.exitCode=1;
});
