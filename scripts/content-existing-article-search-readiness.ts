/**
 * Free, read-only SEARCH readiness for a SAVED article.
 * Does not call DataForSEO, Gemini/OpenAI, crawl, mutate DB or write files.
 *
 * GROWTH_OS_ENV_DIR=/Users/user/growth-os \
 * NODE_OPTIONS=--conditions=react-server \
 * npx tsx scripts/content-existing-article-search-readiness.ts --article=ID
 */
import {loadEnvConfig} from "@next/env";
loadEnvConfig(process.env.GROWTH_OS_ENV_DIR?.trim()||process.cwd());
async function main(){
  const argv=process.argv.slice(2);
  const articleId=argv.find(x=>x.startsWith("--article="))?.slice(10);
  if(!articleId||!/^[a-z0-9_-]{5,100}$/i.test(articleId)||
    argv.length!==1)throw new Error(
      "USAGE: --article=EXISTING_ARTICLE_ID (FREE, READ_ONLY)");
  const {prisma}=await import("../src/lib/prisma");
  try{
    const [article,replay]=await Promise.all([
      prisma.contentArticle.findUnique({
        where:{id:articleId},
        include:{brief:{include:{evidenceSnapshot:true}}},
      }),
      prisma.serpReplayArtifact.findFirst({
        where:{contentArticleId:articleId},
        orderBy:[{createdAt:"desc"},{id:"desc"}],
      }),
    ]);
    if(!article)throw new Error("ARTICLE_NOT_FOUND");
    const snap=article.brief.evidenceSnapshot?.plan;
    const {inspectMasterRuntimeSnapshot}=
      await import("../src/lib/content/master-runtime-adapter");
    const {parsePersistedArticleExecutionPlanV1}=
      await import("../src/lib/content/article-execution-plan-binding-v1");
    const {evaluateArticleSearchReadinessV2}=
      await import("../src/lib/content/article-search-readiness-v2");
    const normalized=snap&&typeof snap==="object"&&!Array.isArray(snap)
      ?snap as Record<string,unknown>:null;
    let plan:null|ReturnType<typeof parsePersistedArticleExecutionPlanV1>=null;
    try{
      if(normalized?.articleExecutionPlan)
        plan=parsePersistedArticleExecutionPlanV1(normalized.articleExecutionPlan);
    }catch{
      // Invalid historic plan is a blocker, not permission to guess scope.
    }
    const runtime=inspectMasterRuntimeSnapshot(snap).runtime;
    const readiness=evaluateArticleSearchReadinessV2({
      article:{
        title:article.title,metaDescription:article.metaDescription,
        h1:article.h1,bodyMarkdown:article.bodyMarkdown,
      },
      primaryKeyword:article.brief.primaryKeyword,
      secondaryKeywords:article.brief.secondaryKeywords,
      runtime,plan,replay,
    });
    console.log(JSON.stringify({
      mode:"FREE_READ_ONLY_SEARCH_READINESS_V2",
      articleId,articleStatus:article.status,
      articleUpdatedAt:article.updatedAt.toISOString(),
      latestReplayArtifactId:replay?.id??null,
      ...readiness,
      paidResearchCalls:0,paidWriterCalls:0,
      databaseUnchanged:true,
    },null,2));
  }finally{
    await prisma.$disconnect();
  }
}
main().catch(e=>{
  console.error("SEARCH_READINESS_AUDIT_STOPPED:",
    e instanceof Error?e.message:String(e));
  process.exitCode=1;
});
