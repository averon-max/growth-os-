/**
 * READ_ONLY_ARTICLE_FACT_COVERAGE_V1
 * Fact-by-fact diagnosis of ONE existing article's locked research plan.
 *
 * No AI, no paid search, no crawler, no DB mutation, no article generation.
 * npx tsx scripts/content-existing-article-fact-coverage-audit.ts ARTICLE_ID
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
import { inspectMasterRuntimeSnapshot } from "../src/lib/content/master-runtime-adapter";
import { parsePersistedArticleExecutionPlanV1 } from "../src/lib/content/article-execution-plan-binding-v1";
import { inspectStagePlanInformationGainV1 } from "../src/lib/content/stage-plan-information-gain-v1";

async function main(){
  const id=process.argv[2];
  if(!id || !/^[A-Za-z0-9_-]{5,100}$/.test(id) ||
     process.argv.length!==3)
    throw new Error("USAGE: tsx scripts/content-existing-article-fact-coverage-audit.ts ARTICLE_ID");
  const {prisma}=await import("../src/lib/prisma");
  try{
    const article=await prisma.contentArticle.findUnique({
      where:{id},
      select:{id:true,briefId:true,status:true},
    });
    if(!article)throw new Error("ARTICLE_NOT_FOUND");
    const snapshot=await prisma.contentEvidenceSnapshot.findUnique({
      where:{briefId:article.briefId},select:{plan:true},
    });
    if(!snapshot)throw new Error("ARTICLE_EVIDENCE_SNAPSHOT_NOT_FOUND");
    const source= snapshot.plan && typeof snapshot.plan==="object" &&
      !Array.isArray(snapshot.plan) ?
      snapshot.plan as Record<string,unknown>:null;
    if(!source)throw new Error("INVALID_STORED_EVIDENCE_PLAN");
    const plan=parsePersistedArticleExecutionPlanV1(source.articleExecutionPlan);
    const inspection=inspectMasterRuntimeSnapshot(snapshot.plan);
    if(!inspection.runtime)throw new Error("INVALID_PERSISTED_MASTER_RUNTIME");
    const {claimLedger,evidenceGraph}=inspection.runtime;
    const sourcesById=new Map(evidenceGraph.sources.map(s=>[s.id,s]));
    const claimsById=new Map(claimLedger.claims.map(c=>[c.id,c]));
    const questionsById=new Map(plan.requiredQuestions.map(q=>[q.id,q.label]));
    const topicsById=new Map(plan.requiredTopics.map(t=>[t.id,t.label]));
    const rows=plan.sections.filter(s=>s.state==="WRITABLE").map(section=>{
      const claimRows=section.requiredClaimIds.map(claimId=>{
        const claim=claimsById.get(claimId);
        const proof=evidenceGraph.claimEvidence.filter(e=>
          e.claimId===claimId && e.kind==="VERIFIED_EXCERPT" &&
          e.relation==="SUPPORTS" && !!e.excerpt?.trim());
        const domains=[...new Set(proof.flatMap(e=>{
          const s=sourcesById.get(e.sourceId);
          if(!s)return [];
          try{return [new URL(s.url).hostname];}catch{return [];}
        }))];
        return {
          claimId,text:claim?.text??null,
          status:claim?.status??null,
          verifiedExcerpts:proof.length,
          independentSourceDomains:domains,
          sampleVerifiedExcerpt:proof[0]?.excerpt?.slice(0,220)??null,
        };
      });
      return {
        sectionId:section.id,
        heading:section.heading,
        approvedQuestions:section.requiredQuestionIds.map(id=>
          questionsById.get(id)??id),
        plannedTopics:section.requiredTopicIds.map(id=>
          topicsById.get(id)??id),
        plannedWords:section.targetWords.preferred,
        distinctAssignedClaims:section.requiredClaimIds.length,
        assignedEvidenceIds:section.evidenceIds.length,
        claims:claimRows,
      };
    });
    const breadth=inspectStagePlanInformationGainV1(
      rows.map(row=>({
        heading:row.heading,
        questions:row.approvedQuestions,
        requiredClaimIds:row.claims.map(claim=>claim.claimId),
      }))
    );
    const allProof=rows.flatMap(r=>r.claims);
    console.log(JSON.stringify({
      mode:"READ_ONLY_ARTICLE_FACT_COVERAGE_V1",
      articleId:id,briefId:article.briefId,status:article.status,
      planningDiagnosis:breadth,
      sections:rows,
      totals:{
        sections:rows.length,
        verifiedClaims:allProof.filter(c=>c.status==="VERIFIED" &&
          c.verifiedExcerpts>0).length,
        assignedVerifiedExcerpts:allProof.reduce((n,c)=>
          n+c.verifiedExcerpts,0),
      },
      aiCalls:0,databaseUnchanged:true,
    },null,2));
  }finally{
    await prisma.$disconnect();
  }
}
main().catch(error=>{
  console.error("READ_ONLY_FACT_AUDIT_FAILED:",
    error instanceof Error?error.message:String(error));
  process.exitCode=1;
});
