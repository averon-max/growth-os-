/**
 * READ ONLY: explain why the 18 saved atomic research hypotheses fail
 * against the first 24 already-discovered source pages.
 *
 * No DataForSEO, OpenAI, database mutations, new articles or new
 * checkpoints. Real public HTTP page refetch through SSRF-safe crawler.
 * Default: first 24 pages. Explicit --all-sources: up to 64
 * previously saved sources, concurrency=3, <=8s each.
 *
 * NODE_OPTIONS=--conditions=react-server npx tsx \
 *  scripts/content-existing-article-research-evidence-diagnose.ts ARTICLE_ID \
 *  --all-sources --focus=section-4,section-5,section-6
 */
import {loadEnvConfig} from "@next/env";
import {createHash} from "node:crypto";
loadEnvConfig(process.cwd());

async function main(){
  const articleId=process.argv[2];
  const extras=process.argv.slice(3);
  const allSources=extras.includes("--all-sources");
  const focusArgument=extras.find(arg=>arg.startsWith("--focus="));
  const focusIds=focusArgument
    ?focusArgument.slice("--focus=".length).split(",").filter(Boolean):[];
  if(!articleId||!/^[a-zA-Z0-9_-]{5,100}$/.test(articleId)||
    extras.some(arg=>arg!=="--all-sources"&&
      !/^--focus=section-[a-zA-Z0-9,-]+$/.test(arg))||
    (focusArgument!==undefined&&
      (focusIds.length===0||focusIds.length>8||
       new Set(focusIds).size!==focusIds.length)))
    throw new Error("USAGE: content-existing-article-research-evidence-diagnose.ts ARTICLE_ID [--all-sources] [--focus=section-4,section-5]");
  const {prisma}=await import("../src/lib/prisma");
  try{
    const article=await prisma.contentArticle.findUnique({
      where:{id:articleId},
      select:{id:true,briefId:true,updatedAt:true,status:true},
    });
    if(!article)throw new Error("ARTICLE_NOT_FOUND");
    const snap=await prisma.contentEvidenceSnapshot.findUnique({
      where:{briefId:article.briefId},select:{plan:true},
    });
    if(!snap)throw new Error("EVIDENCE_SNAPSHOT_NOT_FOUND");
    const record=snap.plan as Record<string,unknown>;
    const {readExistingResearchPlanningCheckpointV1}=await import(
      "../src/lib/content/existing-article-research-checkpoint-v1");
    const evidenceSha256=createHash("sha256")
      .update(JSON.stringify(snap.plan),"utf8").digest("hex");
    const raw=await readExistingResearchPlanningCheckpointV1({
      articleId,briefId:article.briefId,
      updatedAt:article.updatedAt.toISOString(),evidenceSha256,
    });
    if(!raw)throw new Error("PAID_RESEARCH_PLANNING_CHECKPOINT_MISSING");
    const planResponse=JSON.parse(raw) as {sections:unknown};
    const {parsePersistedArticleExecutionPlanV1}=await import(
      "../src/lib/content/article-execution-plan-binding-v1");
    const execution=parsePersistedArticleExecutionPlanV1(
      record.articleExecutionPlan);
    const {inspectMasterRuntimeSnapshot}=await import(
      "../src/lib/content/master-runtime-adapter");
    const runtime=inspectMasterRuntimeSnapshot(snap.plan).runtime;
    if(!runtime)throw new Error("STORED_MASTER_RUNTIME_NOT_READY");
    const {budgetResearchExpansionProposalsV1,
      validateResearchExpansionProposalsV1}=await import(
      "../src/lib/content/existing-article-research-plan-v1");
    const bounded=budgetResearchExpansionProposalsV1({
      plan:execution,
      proposals:planResponse.sections as Parameters<
        typeof budgetResearchExpansionProposalsV1>[0]["proposals"],
    });
    const proposed=validateResearchExpansionProposalsV1({
      plan:execution,existingClaimTexts:
        runtime.claimLedger.claims.map(c=>c.text),
      proposals:bounded.proposals,
    });
    // Default keeps the historical 24-page diagnostic unchanged.
    // Explicit opt-in scans up to 64 ALREADY SAVED public sources,
    // including sources previously skipped by the production 24-URL
    // fetch ceiling. No paid searches, model calls or DB mutations.
    const sources=runtime.evidenceGraph.sources
      .slice(0,allSources?64:24)
      .map(s=>({id:s.id,url:s.url}));
    const focus=new Set(focusIds);
    const focusedClaims=focus.size>0
      ?proposed.filter(claim=>focus.has(claim.sectionId)):proposed;
    if(focusedClaims.length===0)
      throw new Error("FOCUS_SECTIONS_NOT_IN_SAVED_PLAN");
    const {fetchSinglePage}=await import("../src/lib/crawler/crawler");
    const bodyRows:Array<{
      sourceId:string;bodyText:string|null;
      status:"FETCHED"|"FETCH_FAILED";
    }>=[];
    for(let i=0;i<sources.length;i+=3){
      const group=sources.slice(i,i+3);
      const results=await Promise.all(group.map(async source=>{
        try{
          const result=await fetchSinglePage(source.url,{
            timeoutMs:8000,maxResponseSize:2*1024*1024,
          });
          if(result.error||result.statusCode<200||
            result.statusCode>=300||!result.parsed||
            result.parsed.bodyText.trim().length<200)
            return {sourceId:source.id,bodyText:null,
              status:"FETCH_FAILED" as const};
          return {sourceId:source.id,
            bodyText:result.parsed.bodyText.trim(),
            status:"FETCHED" as const};
        }catch{
          return {sourceId:source.id,bodyText:null,
            status:"FETCH_FAILED" as const};
        }
      }));
      bodyRows.push(...results);
    }
    const {inspectResearchRecoveryEvidenceV1}=await import(
      "../src/lib/content/research-recovery-evidence-diagnostics-v1");
    const result=inspectResearchRecoveryEvidenceV1({
      claims:focusedClaims,sources,bodies:bodyRows,
    });
    const {rankEvidenceRecoveryExcerptsV1}=await import(
      "../src/lib/content/live-evidence-verification");
    const {buildSourceGroundedReplanPacketV1}=await import(
      "../src/lib/content/source-grounded-claim-replan-v1");
    const strictSections=new Set(result.claimDiagnostics
      .filter(c=>c.strictMatches>0).map(c=>c.sectionId));
    const missingSections=execution.sections.filter(section=>
      section.state==="WRITABLE"&&
      (focus.size===0||focus.has(section.id))&&
      !strictSections.has(section.id));
    const missingClaims=focusedClaims.filter(claim=>
      missingSections.some(section=>section.id===claim.sectionId));
    const sourceCandidates=missingClaims.flatMap(claim=>
      sources.flatMap(source=>{
        const body=bodyRows.find(x=>x.sourceId===source.id);
        if(!body?.bodyText)return [];
        return rankEvidenceRecoveryExcerptsV1({
          claimText:claim.text,bodyText:body.bodyText,maxCandidates:2,
        }).map(candidate=>({
          claimId:claim.id,sourceId:source.id,sourceUrl:source.url,
          excerpt:candidate.excerpt,coverage:candidate.coverage,
        }));
      }));
    const packet=buildSourceGroundedReplanPacketV1({
      sections:missingSections.map(section=>({
        id:section.id,heading:section.heading,mission:section.mission,
      })),
      claims:missingClaims,
      candidates:sourceCandidates,
      sources:runtime.evidenceGraph.sources,
    });
    const sourceFirstReadiness={
      missingSections:missingSections.map(s=>s.id),
      sections:packet.map(p=>({
        sectionId:p.sectionId,heading:p.heading,
        authoritativeQuotes:p.quotes.length,
        sourceHosts:p.quotes.map(q=>new URL(q.sourceUrl).hostname),
        sourceQuotePreviews:p.quotes.map(q=>q.excerpt.slice(0,160)),
      })),
      allMissingSectionsHaveSourceQuotes:
        packet.every(p=>p.quotes.length>0),
      callsNeededIfLiveRecoveryProceeds:
        packet.length>0&&packet.every(p=>p.quotes.length>0)?1:0,
      qualification:"Quote relevance and semantic entailment are NOT proven by this diagnostic.",
    };
    console.log(JSON.stringify({
      mode:"READ_ONLY_EXISTING_SOURCES_CLAIM_DIAGNOSIS",
      articleId,briefId:article.briefId,articleStatus:article.status,
      cachedPaidPlanner:true,
      proposedClaims:proposed.length,
      auditedClaims:focusedClaims.length,
      focusedSections:focusIds,
      scannedEntireSavedInventory:allSources,
      sourceInventoryTotal:runtime.evidenceGraph.sources.length,
      checkedSources:sources.length,
      unscannedSources:Math.max(0,runtime.evidenceGraph.sources.length-
        sources.length),
      fetchFailures:bodyRows.filter(b=>b.status==="FETCH_FAILED").length,
      ...result,
      sourceFirstReadiness,
      aiCalls:0,dataForSeoCalls:0,databaseUnchanged:true,
    },null,2));
  }finally{
    await prisma.$disconnect();
  }
}
main().catch(error=>{
  console.error("READ_ONLY_EVIDENCE_DIAGNOSIS_FAILED:",
    error instanceof Error?error.message:String(error));
  process.exitCode=1;
});
