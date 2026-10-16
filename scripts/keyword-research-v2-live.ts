/**
 * Explicitly authorized ONE-SEED Keyword Intelligence V2 research CLI.
 *
 * READ ONLY (default):
 * GROWTH_OS_ENV_DIR=/Users/user/growth-os NODE_OPTIONS=--conditions=react-server \
 * npx tsx scripts/keyword-research-v2-live.ts \
 * --website=WEBSITE_ID --seed="what is credit monitoring" \
 * --market=US --limit=300 --serp=3 --expanded
 *
 * PAID CALLS + CACHE WRITE: append --execute. --expanded individually
 * authorizes a second discovery call (Keyword Suggestions).
 * Never calls Writer, creates a brief or publishes content.
 */
import {loadEnvConfig} from "@next/env";
loadEnvConfig(process.env.GROWTH_OS_ENV_DIR?.trim() || process.cwd());

async function main():Promise<void>{
  const args=process.argv.slice(2);
  const known=["--website=","--seed=","--market=","--limit=","--serp=",
    "--execute","--expanded","--gpt","--deep"];
  if(args.some(a=>!known.some(k=>k.endsWith("=")?a.startsWith(k):a===k)))
    throw Error("UNRECOGNIZED_OPTION");
  const arg=(key:string)=>args.find(a=>a.startsWith(key+"="))?.slice(key.length+1);
  const websiteId=arg("--website")??"";
  const seed=arg("--seed")?.trim()??"";
  const market=arg("--market")??"US";
  const limit=Number(arg("--limit")??"300");
  const deepSerpLimit=Number(arg("--serp")??"3");
  const execute=args.includes("--execute");
  const expanded=args.includes("--expanded");
  const deep=args.includes("--deep");
  const gpt=args.includes("--gpt");
  if(!/^[a-zA-Z0-9_-]{5,100}$/.test(websiteId)||
    seed.length<3||seed.length>180||
    !["US","CA","GB","AU"].includes(market)||
    !Number.isInteger(limit)||limit<1||limit>500||
    !Number.isInteger(deepSerpLimit)||deepSerpLimit<0||deepSerpLimit>10)
    throw Error("USAGE: --website=ID --seed=TOPIC [--market=US] "+
      "[--limit=300] [--serp=3] [--expanded] [--deep] [--gpt] [--execute]");
  if(execute&&deepSerpLimit===0)
    throw Error("EXECUTE_REQUIRES_SERP_PROOF_FOR_SELECTION");
  const {prisma}=await import("../src/lib/prisma");
  try{
    const website=await prisma.website.findUnique({
      where:{id:websiteId},select:{id:true,url:true},
    });
    if(!website)throw Error("WEBSITE_NOT_FOUND");
    const plan={
      mode:execute?"PAID_KEYWORD_RESEARCH_EXPLICITLY_AUTHORIZED":
        "READ_ONLY_KEYWORD_RESEARCH_PREFLIGHT",
      websiteId:website.id,url:website.url,market,seed,
      limit,deepSerpLimit,expanded,deep,
      deepQualityRequirements:deep?
        "At least five fetched competing organic pages, including #1; recurring section evidence":
        "Standard SERP discovery, not full top-one competitor proof",
      purchasePlan:{
        existingRelatedKeywordsDiscovery:1,
        ...(expanded?{additionalKeywordSuggestionsDiscovery:1}:{}),
        maxDeepSerpRequests:deepSerpLimit,
        optionalGptDecision:gpt,
      },
      note:"Actual charges depend on DataForSEO usage, response sizes and cache hits. No published ranking promise.",
    };
    if(!execute){
      console.log(JSON.stringify({...plan,providerCalls:0,modelCalls:0,
        databaseUnchanged:true,
        next:"Append --execute ONLY after approving provider costs; "+
          "do not run paid research merely for an article already in review.",
      },null,2));return;
    }
    console.log(JSON.stringify(plan));
    const {researchKeywordOpportunitiesV2}=
      await import("../src/lib/keywords/keyword-research-v2");
    const {auditDeepSerpReadinessV1}=await import(
      "../src/lib/keywords/keyword-deep-serp-readiness-v1");
    const result=await researchKeywordOpportunitiesV2({
      websiteId,seed,market:market as "US"|"CA"|"GB"|"AU",
      limit,deepSerpLimit,authorizePaidResearch:true,
      authorizeExpandedDiscovery:expanded,useGptDecision:gpt,
      requireDeepCompetitorEvidence:deep,
    });
    console.log(JSON.stringify({
      mode:"KEYWORD_RESEARCH_V2_RESULT",
      researchKey:result.approvedResearchKey,
      cacheHit:result.cacheHit,
      collectedAt:result.collectedAt,
      discovery:result.discoveryBreakdown??null,
      observed:result.observed,archivedCandidates:result.candidateSnapshots.length,
      selectedStatus:result.decision.status,selected:result.selectedKeyword,
      reasons:result.decision.reasons,risks:result.decision.risks,
      shortlisted:result.clusters.map(c=>({
        id:c.id,primary:c.primary.keyword,
        volume:c.primary.searchVolume,kd:c.primary.keywordDifficulty,
        score:c.opportunityScore,
      })),
      deepCompetitiveReadiness:result.serpResults.map(
        auditDeepSerpReadinessV1),
      serp:result.serpResults.map(s=>({
        keyword:s.query,organicResults:s.organicResults,
        pagesAnalyzed:s.pagesAnalyzed,ownOrganicRank:s.ownOrganicRank??null,
        topOrganic:s.topOrganic??[],
        competitorResearch:s.competitiveResearch??null,
        ...(s.error?{error:s.error}:{}),
      })),
      next:result.decision.status==="SELECTED"?
        "REVIEW_APPROVED_CLUSTER_AND_BRIEF_OWNERSHIP_BEFORE_WRITER":
        "REVIEW_QUERY_INTENT_OR_EVIDENCE_NOT_REGENERATE_WRITER",
      articleCreated:false,publicationPerformed:false,
    },null,2));
  }finally{await prisma.$disconnect();}
}
main().catch(e=>{
  console.error("KEYWORD_RESEARCH_STOPPED="+(e instanceof Error?e.message:String(e)));
  process.exitCode=1;
});
