/**
 * FREE keyword-intelligence V2 diagnostics from existing Prisma cache.
 * No provider requests, no model calls, no database writes.
 *
 * GROWTH_OS_ENV_DIR=/Users/user/growth-os NODE_OPTIONS=--conditions=react-server \
 * npx tsx scripts/keyword-research-v2-cached-audit.ts --website=WEBSITE_ID
 */
import {loadEnvConfig} from "@next/env";
loadEnvConfig(process.env.GROWTH_OS_ENV_DIR?.trim() || process.cwd());

const record=(v:unknown):Record<string,unknown>|null=>
  !!v&&typeof v==="object"&&!Array.isArray(v)
    ?v as Record<string,unknown>:null;
const nonnegative=(v:unknown):v is number=>
  typeof v==="number"&&Number.isFinite(v)&&v>=0;
const safeError=(e:unknown)=>e instanceof Error?e.message:String(e);

async function main():Promise<void>{
  const args=process.argv.slice(2);
  const websiteId=args.find(a=>a.startsWith("--website="))?.slice(10);
  if(args.length!==1||!websiteId||!/^[a-zA-Z0-9_-]{5,100}$/.test(websiteId))
    throw new Error("USAGE: --website=WEBSITE_ID");
  const {prisma}=await import("../src/lib/prisma");
  try{
    const website=await prisma.website.findUnique({
      where:{id:websiteId},select:{id:true,url:true},
    });
    if(!website)throw new Error("WEBSITE_NOT_FOUND");
    const items=await prisma.keywordSuggestionCache.findMany({
      where:{source:"KEYWORD_INTELLIGENCE_V2",
        normalized:{startsWith:websiteId+":"}},
      orderBy:[{fetchedAt:"desc"}],
      take:10,
    });
    const {parseCachedKeywordResearchV2,
      projectApprovedKeywordEvidenceV2}=
      await import("../src/lib/keywords/keyword-research-cache-v2");
    const summaries=items.map(item=>{
      const v=record(item.payload);
      if(!v||typeof v.seed!=="string"||
        !["US","CA","GB","AU"].includes(String(v.market)))
        return {cacheKey:item.normalized,invalidSnapshot:true,
          reason:"SNAPSHOT_SHAPE_INVALID"};
      const snapshot=parseCachedKeywordResearchV2(item.payload,{
        websiteId,cacheKey:item.normalized,seed:v.seed,
        market:v.market as "US"|"CA"|"GB"|"AU",
      });
      if(!snapshot)return {cacheKey:item.normalized,invalidSnapshot:true,
        reason:"SNAPSHOT_CONTRACT_INVALID"};
      const observations=snapshot.candidateSnapshots;
      const allowedKeys=new Set(snapshot.clusters.flatMap(c=>
        c.keywords.map(row=>row.normalized)));
      const samePage=observations.filter(c=>allowedKeys.has(c.normalized));
      const serpValid=snapshot.serpResults.filter(x=>
        !x.error&&x.organicResults>=3&&x.uniqueDomains>=2);
      let projected=0,projectionError:string|null=null;
      if(snapshot.decision.status==="SELECTED"){
        try{projected=projectApprovedKeywordEvidenceV2(snapshot).length;}
        catch(e){projectionError=safeError(e);}
      }
      return {
        cacheKey:item.normalized,
        fetchedAt:item.fetchedAt.toISOString(),
        collectedAt:snapshot.collectedAt,market:snapshot.market,seed:snapshot.seed,
        observedFromProviderGscTrendsAndSeed:snapshot.observed,
        archivedCandidateCount:observations.length,
        samePageApprovedCandidates:samePage.length,
        archivedNotAuthorizedForWriter:observations.length-samePage.length,
        clustersInShortlist:snapshot.clusters.length,
        totalEligibleClusters:snapshot.totalClusters,
        excludedRows:snapshot.excludedCount,
        withKnownVolume:samePage.filter(x=>nonnegative(x.searchVolume)).length,
        withKnownKD:samePage.filter(x=>nonnegative(x.keywordDifficulty)).length,
        withGscPosition:samePage.filter(x=>
          x.sources.includes("GSC")&&nonnegative(x.position)).length,
        nearWinGscQueries:samePage.filter(x=>
          x.sources.includes("GSC")&&nonnegative(x.position)&&
          x.position>=4&&x.position<=20).slice(0,15)
          .map(x=>({keyword:x.keyword,averagePosition:x.position,
            impressions:x.impressions??null,clicks:x.clicks??null})),
        serpChecksAttempted:snapshot.serpResults.length,
        serpVerified:serpValid.length,
        serpFailures:snapshot.serpResults.filter(x=>!!x.error).length,
        selectionStatus:snapshot.decision.status,
        selectionReasons:snapshot.decision.reasons,
        selectionRisks:snapshot.decision.risks,
        selectedPrimary:snapshot.selectedKeyword,
        gptDecisionUsed:snapshot.aiUsed,
        keywordsActuallyAllowedToWriter:projected,
        ...(projectionError?{projectionError}:{}),
        highestScoredSamePageCandidates:samePage.slice()
          .sort((a,b)=>b.opportunityScore-a.opportunityScore)
          .slice(0,12).map(x=>({
            keyword:x.keyword,volume:x.searchVolume,kd:x.keywordDifficulty,
            averageGscPosition:x.position??null,score:x.opportunityScore,
          })),
      };
    });
    console.log(JSON.stringify({
      mode:"READ_ONLY_CACHED_KEYWORD_RESEARCH_V2_AUDIT",
      websiteId:website.id,website:website.url,
      researchRunsAvailable:items.length,
      researchRuns:summaries,
      interpretation:{
        volume:"Estimated monthly market searches, not website impressions.",
        kd:"Vendor organic top-10 difficulty estimate, not Google Ads competition or guaranteed position.",
        gscPosition:"Observed average position over the saved report's coverage, not a real-time exact rank.",
        gscScope:"Website keyword context may aggregate countries/devices; check original snapshot before claiming market-specific rankings.",
        archivedNotAuthorizedForWriter:"Excluded/other-page intent rows are retained for audit, never article keyword obligations.",
      },
      providerCalls:0,modelCalls:0,databaseUnchanged:true,
    },null,2));
  }finally{await prisma.$disconnect();}
}
main().catch(e=>{
  console.error("KEYWORD_CACHE_AUDIT_FAILED="+safeError(e));process.exitCode=1;
});