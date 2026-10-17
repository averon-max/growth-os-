/**
 * RESEARCH_RECOVERY_PROOF_CLI_V1
 *
 * Dry-run by default. A real, paid, same-article recovery requires
 * --execute + --article=... explicitly. No new brief or article.
 *
 * NODE_OPTIONS=--conditions=react-server npx tsx \
 *   scripts/content-existing-article-research-recovery-live.ts \
 *   --article=...                       # FREE PREFLIGHT
 *
 * NODE_OPTIONS=--conditions=react-server npx tsx \
 *   scripts/content-existing-article-research-recovery-live.ts \
 *   --article=... --execute              # PAID AUTHORIZED RUN
 */
import {loadEnvConfig} from "@next/env";
loadEnvConfig(process.cwd());

async function main(){
  const args=process.argv.slice(2);
  const articleId=args.find(a=>a.startsWith("--article="))?.slice(10);
  const execute=args.includes("--execute");
  if(!articleId||!/^[A-Za-z0-9_-]{5,100}$/.test(articleId)||
    args.some(a=>a!=="--execute"&&!a.startsWith("--article="))){
    throw new Error("USAGE: --article=EXISTING_ARTICLE_ID [--execute]");
  }
  const {prisma}=await import("../src/lib/prisma");
  try{
    const existing=await prisma.contentArticle.findUnique({
      where:{id:articleId},
      select:{
        id:true,briefId:true,status:true,updatedAt:true,publishedAt:true,
      },
    });
    if(!existing)throw new Error("ARTICLE_NOT_FOUND");
    const siblingCount=await prisma.contentArticle.count({
      where:{briefId:existing.briefId,id:{not:articleId}},
    });
    const snapshot=await prisma.contentEvidenceSnapshot.findUnique({
      where:{briefId:existing.briefId},select:{plan:true},
    });
    if(!snapshot)throw new Error("EVIDENCE_SNAPSHOT_NOT_FOUND");
    const record=snapshot.plan as Record<string,unknown>;
    const {parsePersistedArticleExecutionPlanV1}=await import(
      "../src/lib/content/article-execution-plan-binding-v1");
    const {inspectSectionEvidenceCapacityV1}=await import(
      "../src/lib/content/section-evidence-capacity-v1");
    const plan=parsePersistedArticleExecutionPlanV1(record.articleExecutionPlan);
    const problems=inspectSectionEvidenceCapacityV1(plan.sections);
    const {resolveResearchRecoverySerpMarketV1}=await import(
      "../src/lib/content/research-recovery-serp-market-v1");
    const mission=record.searchMissionInput &&
      typeof record.searchMissionInput==="object" &&
      !Array.isArray(record.searchMissionInput)
      ?record.searchMissionInput as Record<string,unknown>:{};
    const searchMarket=resolveResearchRecoverySerpMarketV1({
      language:typeof mission.language==="string"?mission.language:"",
      location:typeof mission.location==="string"?mission.location:"",
    });
    const {createHash}=await import("node:crypto");
    const {readExistingResearchPlanningCheckpointV1}=await import(
      "../src/lib/content/existing-article-research-checkpoint-v1");
    const evidenceSha256=createHash("sha256")
      .update(JSON.stringify(snapshot.plan),"utf8").digest("hex");
    const cachedPlan=await readExistingResearchPlanningCheckpointV1({
      articleId:existing.id,briefId:existing.briefId,
      updatedAt:existing.updatedAt.toISOString(),evidenceSha256,
    });
    console.log(JSON.stringify({
      mode:execute?"PAID_RECOVERY_EXPLICITLY_REQUESTED":"READ_ONLY_PREFLIGHT",
      articleId:existing.id,briefId:existing.briefId,
      status:existing.status,updatedAt:existing.updatedAt.toISOString(),
      siblingArticleCount:siblingCount,
      searchMarket,
      paidPlanningCheckpointCached:cachedPlan!==null,
      paidPlanningCheckpointReusedOnExecute:cachedPlan!==null,
      eligible:existing.status==="IN_REVIEW"&&
        existing.publishedAt===null&&siblingCount===0&&
        problems.length>0,
      evidenceGaps:problems,
      ...(execute?{}:{aiCalls:0,databaseUnchanged:true}),
    },null,2));
    if(!execute){
      console.log("NO_AI_CALLS_NO_DATABASE_WRITES_TO_RUN_PAID_PASS_EXECUTE");
      return;
    }
    if(existing.status!=="IN_REVIEW" || existing.publishedAt!==null ||
      siblingCount!==0||problems.length===0)
      throw new Error("PAID_RECOVERY_PREFLIGHT_NOT_ELIGIBLE");
    const {recoverExistingArticleResearchV1}=await import(
      "../src/lib/content/existing-article-research-recovery-v1");
    const result=await recoverExistingArticleResearchV1({
      articleId,expectedUpdatedAt:existing.updatedAt.toISOString(),
    });
    console.log(JSON.stringify(result,null,2));
    console.log("SAME_ARTICLE_ID_RESEARCH_RECOVERY_FINISHED");
  }finally{
    await prisma.$disconnect();
  }
}
main().catch(error=>{
  console.error("RESEARCH_RECOVERY_STOPPED:",
    error instanceof Error?error.message:String(error));
  process.exitCode=1;
});
