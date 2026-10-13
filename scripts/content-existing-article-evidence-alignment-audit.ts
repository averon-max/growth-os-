/**
 * HISTORICAL_EVIDENCE_REVALIDATION_V1
 *
 * Read-only re-verification of ALL saved VERIFIED_EXCERPT -> Claim pairs.
 * Important distinction: lexical revalidation is necessary, not sufficient
 * for logical entailment; a PASS is NOT a semantic support verdict.
 *
 * No web, search providers, models, new articles or DB mutations.
 * Usage: NODE_OPTIONS=--conditions=react-server npx tsx
 *   scripts/content-existing-article-evidence-alignment-audit.ts ARTICLE_ID
 */
import {loadEnvConfig} from "@next/env";
loadEnvConfig(process.cwd());
import {
  inspectMasterRuntimeSnapshot,
} from "../src/lib/content/master-runtime-adapter";
import {
  parsePersistedArticleExecutionPlanV1,
} from "../src/lib/content/article-execution-plan-binding-v1";
import {
  findVerifiedExcerptCandidateV1,
  canonicalEvidenceTokenV1,
} from "../src/lib/content/live-evidence-verification";

function claimTokens(value:string):string[]{
  const words=value.toLowerCase().match(/[a-z0-9]+/g)??[];
  const excluded=new Set([
    "a","an","the","is","are","was","were","be","to","of","in","on",
    "by","and","or","that","it","its","this","these","those","can",
    "does","do","did","may","might","should","would","could","will",
    "for","with","from","as","at","your","you","their","they","person",
    "people","consumer","service","services","information","about",
  ]);
  return [...new Set(words.map(canonicalEvidenceTokenV1)
    .filter(token=>token.length>=3&&!excluded.has(token)))];
}

async function main(){
  const id=process.argv[2];
  if(!id||!/^[a-zA-Z0-9_-]{5,100}$/.test(id)||process.argv.length!==3){
    throw new Error("USAGE: content-existing-article-evidence-alignment-audit.ts ARTICLE_ID");
  }
  const {prisma}=await import("../src/lib/prisma");
  try{
    const article=await prisma.contentArticle.findUnique({
      where:{id},select:{id:true,status:true,briefId:true},
    });
    if(!article)throw new Error("ARTICLE_NOT_FOUND");
    const snapshot=await prisma.contentEvidenceSnapshot.findUnique({
      where:{briefId:article.briefId},select:{plan:true},
    });
    if(!snapshot)throw new Error("EVIDENCE_SNAPSHOT_NOT_FOUND");
    const inspection=inspectMasterRuntimeSnapshot(snapshot.plan);
    if(!inspection.runtime){
      throw new Error("PERSISTED_MASTER_RUNTIME_INVALID");
    }
    const snapshotPlan=snapshot.plan as Record<string,unknown>;
    const plan=parsePersistedArticleExecutionPlanV1(
      snapshotPlan.articleExecutionPlan);
    const graph=inspection.runtime.evidenceGraph;
    const claimsById=new Map(
      inspection.runtime.claimLedger.claims.map(c=>[c.id,c]));
    const sourcesById=new Map(graph.sources.map(s=>[s.id,s]));
    const details=plan.sections.filter(s=>s.state==="WRITABLE").map(section=>{
      const claims=section.requiredClaimIds.map(claimId=>{
        const claim=claimsById.get(claimId);
        const excerptRows=graph.claimEvidence
          .filter(e=>e.claimId===claimId &&
            e.kind==="VERIFIED_EXCERPT"&&e.relation==="SUPPORTS"&&
            typeof e.excerpt==="string"&&e.excerpt.trim().length>0)
          .map(e=>{
            const source=sourcesById.get(e.sourceId);
            const passage=e.excerpt!.trim();
            const tokens=claimTokens(claim?.text??"");
            const evidenceTokens=new Set(claimTokens(passage));
            const missingMaterialTokens=tokens.filter(x=>
              !evidenceTokens.has(x));
            const reverified=claim
              ?findVerifiedExcerptCandidateV1({
                claimText:claim.text,
                bodyText:passage,
              })
              :null;
            let host:string|null=null;
            if(source){
              try{host=new URL(source.url).hostname;}catch{}
            }
            return {
              evidenceId:e.id,
              sourceId:e.sourceId,
              sourceHost:host,
              authorityTier:source?.authorityTier??null,
              currentLexicalVerifierPass:reverified!==null,
              currentLexicalCoverage:reverified?.coverage??null,
              missingMaterialLexicalTokens:missingMaterialTokens,
              excerptPreview:passage.slice(0,240),
            };
          });
        return {
          claimId,claim:claim?.text??null,
          savedStatus:claim?.status??null,
          savedVerifiedExcerpts:excerptRows.length,
          currentlyLexicallyReverifiedExcerpts:excerptRows.filter(
            row=>row.currentLexicalVerifierPass).length,
          semanticEntailmentProven:false,
          sourceEvidence:excerptRows,
        };
      });
      return {heading:section.heading,claims};
    });
    const all=details.flatMap(s=>s.claims);
    const borderline=all.filter(c=>
      c.savedVerifiedExcerpts>0&&
      c.currentlyLexicallyReverifiedExcerpts===0);
    console.log(JSON.stringify({
      mode:"READ_ONLY_HISTORICAL_EVIDENCE_REVALIDATION_V1",
      articleId:id,status:article.status,
      warning:"Lexical overlap is not semantic entailment. A lexical PASS alone does not prove support.",
      sections:details,
      summary:{
        claims:all.length,
        savedVerifiedExcerpts:all.reduce((n,c)=>n+c.savedVerifiedExcerpts,0),
        currentLexicallyReverifiedExcerpts:all.reduce((n,c)=>
          n+c.currentlyLexicallyReverifiedExcerpts,0),
        claimsWithNoCurrentlyMatchingStoredExcerpt:borderline.map(c=>
          c.claimId),
        allClaimsRequireSemanticEntailmentReview:true,
      },
      aiCalls:0,externalRequests:0,databaseUnchanged:true,
    },null,2));
  }finally{
    await prisma.$disconnect();
  }
}
main().catch(error=>{
  console.error("HISTORICAL_EVIDENCE_AUDIT_FAILED:",
    error instanceof Error?error.message:String(error));
  process.exitCode=1;
});
