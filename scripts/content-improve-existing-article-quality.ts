/**
 * SAME-ID source-grounded article improvement.
 *
 * Free preview:
 *  GROWTH_OS_ENV_DIR=... NODE_OPTIONS=--conditions=react-server \
 *  npx tsx scripts/content-improve-existing-article-quality.ts --article=ID
 *
 * Paid, explicit:
 *  ... --article=ID --execute --authorize-paid-improvement
 *
 * No new brief/article, no paid research. Requires a saved SHA256-verified
 * same-article POST_FINAL_REPLAY checkpoint and unchanged local database.
 * Preserves old bytes unless all section, 9 critic, publication, Content,
 * and SERP replay gates pass and a serializable CAS commits.
 */
import {loadEnvConfig} from "@next/env";
loadEnvConfig(process.env.GROWTH_OS_ENV_DIR?.trim()||process.cwd());
async function main(){
  const args=process.argv.slice(2);
  const articleId=args.find(a=>a.startsWith("--article="))?.slice(10);
  const execute=args.includes("--execute");
  const authorized=args.includes("--authorize-paid-improvement");
  if(!articleId||!/^[a-z0-9_-]{5,100}$/i.test(articleId)||
    args.some(a=>a!=="--execute"&&a!=="--authorize-paid-improvement"&&
      !a.startsWith("--article="))||
    execute!==authorized)throw new Error(
      "USAGE: --article=EXISTING_ID [--execute --authorize-paid-improvement]");
  const {prisma}=await import("../src/lib/prisma");
  try{
    const article=await prisma.contentArticle.findUnique({
      where:{id:articleId},
      include:{brief:{select:{
        primaryKeyword:true,secondaryKeywords:true,websiteId:true,
      }}},
    });
    if(!article)throw new Error("ARTICLE_NOT_FOUND");
    const snapshot=await prisma.contentEvidenceSnapshot.findUnique({
      where:{briefId:article.briefId},select:{plan:true},
    });
    if(!snapshot)throw new Error("EVIDENCE_SNAPSHOT_NOT_FOUND");
    const {parsePersistedArticleExecutionPlanV1}=
      await import("../src/lib/content/article-execution-plan-binding-v1");
    const {resolveArticleLengthContractV1}=
      await import("../src/lib/content/article-length-contract-v1");
    const {planSameArticleQualityImprovementV1}=
      await import("../src/lib/content/same-article-quality-improvement-v1");
    const {countWords}=
      await import("../src/lib/content/article-analyzer");
    const plan=parsePersistedArticleExecutionPlanV1(
      (snapshot.plan as Record<string,unknown>).articleExecutionPlan);
    const profile=resolveArticleLengthContractV1(plan);
    const minimumWords=profile.targetWords?.min??0;
    const sectionPlans=plan.sections.filter(s=>s.state==="WRITABLE");
    const sections=article.bodyMarkdown.split(/^##\s+/m).slice(1)
      .map((raw,index)=>{
        const body=raw.slice(Math.max(0,raw.indexOf("\n")+1));
        const section=sectionPlans[index];
        return {
          index,words:countWords(body),
          maxWords:section?.targetWords?.max??0,
          claimCount:section?.requiredClaimIds.length??0,
          evidenceCount:section?.evidenceIds.length??0,
          h3Count:(body.match(/^###\s+/gm)??[]).length,
        };
      });
    const improvement=planSameArticleQualityImprovementV1({
      wordCount:countWords(article.bodyMarkdown),minimumWords,sections,
    });
    console.log(JSON.stringify({
      mode:execute?"EXPLICIT_PAID_SAME_ID_IMPROVEMENT":
        "FREE_SAME_ID_QUALITY_IMPROVEMENT_PREVIEW",
      articleId,status:article.status,updatedAt:article.updatedAt.toISOString(),
      currentWords:countWords(article.bodyMarkdown),requiredWords:minimumWords,
      currentH3:(article.bodyMarkdown.match(/^###\s+/gm)??[]).length,
      improvement,
      ...(execute?{}:{modelCalls:0,databaseUnchanged:true}),
    },null,2));
    if(!execute){
      console.log("READ_ONLY_PREVIEW_FINISHED");
      return;
    }
    if(article.status!=="IN_REVIEW"||article.publishedAt!==null||
      article.publishedUrl!==null||!improvement.eligible)
      throw new Error("PAID_IMPROVEMENT_NOT_ELIGIBLE");
    const {improveExistingArticleQualityV1}=
      await import("../src/lib/content/existing-article-quality-improvement-v1");
    const result=await improveExistingArticleQualityV1(
      articleId,article.updatedAt.toISOString());
    console.log(JSON.stringify(result,null,2));
    console.log("SAME_ID_QUALITY_IMPROVEMENT_FINISHED");
  }finally{await prisma.$disconnect();}
}
main().catch(e=>{
  console.error("QUALITY_IMPROVEMENT_STOPPED:",
    e instanceof Error?e.message:String(e));process.exitCode=1;
});
