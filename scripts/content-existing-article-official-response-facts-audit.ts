/**
 * READ ONLY, NO AI/PAID PROVIDERS: show literal response steps fetched
 * from explicitly supplied US government sources for the SAME saved
 * article section. Candidate sentences are never verified authority.
 *
 * NODE_OPTIONS=--conditions=react-server npx tsx \
 *   scripts/content-existing-article-official-response-facts-audit.ts \
 *   --article=ARTICLE_ID --government-source=https://consumer.ftc.gov/...
 */
import {loadEnvConfig} from "@next/env";
loadEnvConfig(process.cwd());

async function main(){
  const args=process.argv.slice(2);
  const articleId=args.find(a=>a.startsWith("--article="))?.slice(10);
  const urls=args.filter(a=>a.startsWith("--government-source="))
    .map(a=>a.slice("--government-source=".length));
  if(!articleId||!/^[A-Za-z0-9_-]{5,100}$/.test(articleId)||
    urls.length===0||
    args.some(a=>!a.startsWith("--article=")&&
      !a.startsWith("--government-source=")))
    throw new Error("USAGE: --article=ID --government-source=HTTPS_US_GOV_URL [x6]");
  const {buildResearchRecoveryGovernmentSeedsV1}=await import(
    "../src/lib/content/research-recovery-authoritative-sources-v1");
  const seeds=buildResearchRecoveryGovernmentSeedsV1(urls,[]);
  const {prisma}=await import("../src/lib/prisma");
  try{
    const article=await prisma.contentArticle.findUnique({
      where:{id:articleId},
      select:{id:true,briefId:true,status:true},
    });
    if(!article)throw new Error("ARTICLE_NOT_FOUND");
    const snapshot=await prisma.contentEvidenceSnapshot.findUnique({
      where:{briefId:article.briefId},
      select:{plan:true},
    });
    if(!snapshot)throw new Error("EVIDENCE_SNAPSHOT_NOT_FOUND");
    const {parsePersistedArticleExecutionPlanV1}=await import(
      "../src/lib/content/article-execution-plan-binding-v1");
    const record=snapshot.plan as Record<string,unknown>;
    const plan=parsePersistedArticleExecutionPlanV1(
      record.articleExecutionPlan);
    const sections=plan.sections.filter(section=>
      section.id==="section-6"&&section.state==="WRITABLE").map(s=>({
        id:s.id,heading:s.heading,mission:s.mission,
      }));
    if(sections.length!==1)
      throw new Error("SAVED_ARTICLE_SECTION_6_NOT_WRITABLE");
    const {collectOfficialPostSemanticProcedureAlternativesV1}=await import(
      "../src/lib/content/live-evidence-verification");
    const candidateSteps=await collectOfficialPostSemanticProcedureAlternativesV1({
      graph:{sources:seeds,claimEvidence:[]},
      sections,governmentSourceIds:seeds.map(s=>s.id),
    });
    console.log(JSON.stringify({
      mode:"READ_ONLY_POST_SEMANTIC_OFFICIAL_STEPS_AUDIT",
      articleId,articleStatus:article.status,
      sectionId:"section-6",
      governmentSourcesRequested:urls.length,
      alternativeCandidates:candidateSteps.map((s,i)=>({
        rank:i+1,sourceHost:new URL(s.sourceUrl).hostname,
        sourceUrl:s.sourceUrl,exactSentence:s.text,
        status:"UNVERIFIED_SOURCE_CANDIDATE_ONLY",
      })),
      nextGate:"STRICT_PAGE_REFETCH_AND_SEMANTIC_REVIEW",
      aiCalls:0,dataForSeoCalls:0,databaseUnchanged:true,
    },null,2));
  }finally{
    await prisma.$disconnect();
  }
}
main().catch(error=>{
  console.error("FREE_OFFICIAL_STEPS_AUDIT_FAILED:",
    error instanceof Error?error.message:String(error));
  process.exitCode=1;
});
