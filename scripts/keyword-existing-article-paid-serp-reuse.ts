/**
 * FREE: re-evaluate stored DataForSEO SERPs against one existing article.
 * Cached research may be INVALID as a selection contract, but actual
 * provider observations remain useful for manual evidence review.
 * No provider calls, Writer, new article or database mutation.
 *
 * GROWTH_OS_ENV_DIR=/Users/user/growth-os NODE_OPTIONS=--conditions=react-server \
 * npx tsx scripts/keyword-existing-article-paid-serp-reuse.ts \
 * --website=WEBSITE_ID --article=ARTICLE_ID --market=US
 */
import {loadEnvConfig} from "@next/env";
loadEnvConfig(process.env.GROWTH_OS_ENV_DIR?.trim()||process.cwd());

const record=(v:unknown):Record<string,unknown>|null=>v&&typeof v==="object"&&
  !Array.isArray(v)?v as Record<string,unknown>:null;
const error=(e:unknown)=>e instanceof Error?e.message:String(e);

async function main(){
  const args=process.argv.slice(2);
  const websiteId=args.find(a=>a.startsWith("--website="))?.slice(10);
  const articleId=args.find(a=>a.startsWith("--article="))?.slice(10);
  const market=args.find(a=>a.startsWith("--market="))?.slice(9)??"US";
  if(!websiteId||!articleId||args.length<2||args.length>3||
    args.some(a=>!/^--(?:website|article|market)=/.test(a))||
    !/^[a-z0-9_-]{5,100}$/i.test(websiteId)||
    !/^[a-z0-9_-]{5,100}$/i.test(articleId)||
    !["US","CA","GB","AU"].includes(market))
    throw new Error("USAGE: --website=ID --article=ID [--market=US]");
  const {prisma}=await import("../src/lib/prisma");
  const {auditPaidSerpReuseForExistingPageV1}=
    await import("../src/lib/keywords/keyword-existing-page-reuse-v1");
  try {
    const article=await prisma.contentArticle.findUnique({
      where:{id:articleId},
      include:{brief:{select:{websiteId:true,primaryKeyword:true}}},
    });
    if(!article)throw new Error("ARTICLE_NOT_FOUND");
    if(article.brief.websiteId!==websiteId)
      throw new Error("ARTICLE_WEBSITE_OWNERSHIP_MISMATCH");
    const cached=await prisma.keywordSuggestionCache.findMany({
      where:{source:"KEYWORD_INTELLIGENCE_V2",
        normalized:{startsWith:websiteId+":"+market+":"}},
      orderBy:[{fetchedAt:"desc"}],
      take:10,
    });
    const results=[];
    for(const item of cached){
      const v=record(item.payload);
      if(!v||v.websiteId!==websiteId||v.market!==market||
        typeof v.seed!=="string"||
        !Array.isArray(v.serpResults)||
        !Array.isArray(v.candidateSnapshots))continue;
      const serp=v.serpResults.filter(x=>{
        const r=record(x);
        return typeof r?.query==="string"&&
          typeof r.clusterId==="string"&&
          typeof r.organicResults==="number"&&
          typeof r.uniqueDomains==="number"&&
          !!record(r.competitiveResearch)&&
          Array.isArray(record(r.competitiveResearch)?.competitorPages)&&
          Array.isArray(record(r.competitiveResearch)?.commonSections);
      });
      if(!serp.length)continue;
      const candidates=v.candidateSnapshots.filter(x=>{
        const r=record(x);
        return typeof r?.keyword==="string"&&
          typeof r.normalized==="string"&&
          Array.isArray(r.sources);
      });
      try{
        const report=auditPaidSerpReuseForExistingPageV1({
          seed:v.seed,market,websiteId,
          article:{id:article.id,websiteId:article.brief.websiteId,
            title:article.title,bodyMarkdown:article.bodyMarkdown,
            status:article.status,primaryKeyword:article.brief.primaryKeyword},
          candidateSnapshots:candidates as Parameters<
            typeof auditPaidSerpReuseForExistingPageV1>[0]["candidateSnapshots"],
          serpResults:serp as Parameters<
            typeof auditPaidSerpReuseForExistingPageV1>[0]["serpResults"],
        });
        const originalDecision=record(v.decision);
        results.push({
          sourceCacheKey:item.normalized,
          sourceCollectedAt:v.collectedAt??null,
          originalDecision:typeof originalDecision?.status==="string"?
            originalDecision.status:null,
          originalDecisionReasons:Array.isArray(originalDecision?.reasons)?
            originalDecision.reasons:[],
          ...report,
        });
      }catch(e){
        results.push({sourceCacheKey:item.normalized,
          reportStatus:"NOT_SAFE_TO_ROUTE",reason:error(e),
          modelCalls:0,providerCalls:0,cacheMutated:false});
      }
    }
    console.log(JSON.stringify({
      mode:"READ_ONLY_EXISTING_ARTICLE_PAID_SERP_REUSE",
      articleId,websiteId,market,
      snapshotsExamined:cached.length,
      researchReports:results,
      duplicateArticlePrevention:true,
      paidCalls:0,modelCalls:0,databaseUnchanged:true,
    },null,2));
  } finally {await prisma.$disconnect();}
}
main().catch(e=>{
  console.error("EXISTING_ARTICLE_SERP_REUSE_FAILED="+error(e));
  process.exitCode=1;
});