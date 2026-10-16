/**
 * ZERO API/AI calls, ZERO DB writes.
 * Joins the previously paid/cached DataForSEO question research to
 * the ACTUAL persisted article body and verified H2 source links.
 * Does not touch immutable Brief, article, signed research plan or Replay.
 *
 * GROWTH_OS_ENV_DIR=/Users/user/growth-os \
 * NODE_OPTIONS=--conditions=react-server \
 * npx tsx scripts/content-existing-article-question-gap-audit.ts \
 *   --article=ID --market=US
 */
import {loadEnvConfig} from "@next/env";
loadEnvConfig(process.env.GROWTH_OS_ENV_DIR?.trim()||process.cwd());
async function main(){
  const args=process.argv.slice(2);
  const articleId=args.find(x=>x.startsWith("--article="))?.slice(10);
  const market=args.find(x=>x.startsWith("--market="))?.slice(9)?.toUpperCase();
  if(args.length!==2||!articleId||
    !/^[a-z0-9_-]{5,100}$/i.test(articleId)||
    !market||!["US","CA","GB","AU"].includes(market))
    throw new Error("USAGE: --article=EXISTING_ID --market=US|CA|GB|AU (READ_ONLY)");
  const {prisma}=await import("../src/lib/prisma");
  try{
    const article=await prisma.contentArticle.findUnique({
      where:{id:articleId},
      include:{brief:{include:{evidenceSnapshot:true}}},
    });
    if(!article)throw new Error("SAME_ID_ARTICLE_NOT_FOUND");
    const {inspectMasterRuntimeSnapshot}=
      await import("../src/lib/content/master-runtime-adapter");
    const runtime=inspectMasterRuntimeSnapshot(
      article.brief.evidenceSnapshot?.plan).runtime;
    if(!runtime||runtime.mission.jurisdiction?.toUpperCase()!==market)
      throw new Error("ARTICLE_QUESTION_GAP_SIGNED_MARKET_MISMATCH");
    const {assessKeywordTopicIntentV1}=
      await import("../src/lib/keywords/keyword-topic-intent-gate-v1");
    const core=assessKeywordTopicIntentV1({
      seed:article.brief.primaryKeyword,
      query:article.brief.primaryKeyword,
    }).coreTopic;
    const normalized=[
      "ARTICLE_QUESTION_SUGGESTIONS_V1",article.brief.websiteId,
      market,core.toLowerCase(),"limit100","question-prefix-filter",
    ].join(":");
    const cache=await prisma.keywordSuggestionCache.findUnique({
      where:{normalized_source:{
        normalized,source:"ARTICLE_QUESTION_SUGGESTIONS_V1",
      }},
    });
    const json=cache?.payload&&typeof cache.payload==="object"&&
      !Array.isArray(cache.payload)?
      cache.payload as Record<string,unknown>:null;
    const raw=json?.data&&typeof json.data==="object"&&
      !Array.isArray(json.data)?json.data as Record<string,unknown>:null;
    if(!raw||raw.source!=="DATAFORSEO_KEYWORD_SUGGESTIONS"||
      raw.seed!==core||raw.market!==market||
      !Array.isArray(raw.suggestions)||!cache)
      throw new Error("PAID_OBSERVED_QUESTION_CACHE_MISSING_OR_INVALID");
    const ageDays=Math.round(
      (Date.now()-cache.fetchedAt.getTime())/8640000)/10;
    const {groupObservedArticleQuestionsV2}=
      await import("../src/lib/keywords/article-question-scope-v2");
    type Suggestion=Parameters<typeof groupObservedArticleQuestionsV2>[1][number];
    const suggestions=raw.suggestions.filter((s:unknown):s is Suggestion=>{
      if(!s||typeof s!=="object")return false;
      const v=s as Record<string,unknown>;
      return typeof v.keyword==="string"&&v.keyword.trim().length>0&&
        (v.searchVolume===null||
          typeof v.searchVolume==="number"&&Number.isFinite(v.searchVolume))&&
        (v.keywordDifficulty===null||
          typeof v.keywordDifficulty==="number"&&Number.isFinite(v.keywordDifficulty))&&
        (v.providerMainIntent===null||
          typeof v.providerMainIntent==="string");
    });
    if(suggestions.length!==raw.suggestions.length)
      throw new Error("PAID_OBSERVED_QUESTION_CACHE_ROWS_INVALID");
    const semantic=groupObservedArticleQuestionsV2(
      article.brief.primaryKeyword,suggestions);
    const {evaluateArticleSearchReadinessV2}=
      await import("../src/lib/content/article-search-readiness-v2");
    const base=evaluateArticleSearchReadinessV2({
      article:{
        title:article.title,metaDescription:article.metaDescription,
        h1:article.h1,bodyMarkdown:article.bodyMarkdown,
      },
      primaryKeyword:article.brief.primaryKeyword,
      secondaryKeywords:article.brief.secondaryKeywords,
      runtime,plan:null,replay:null,
    });
    const {auditExistingArticleQuestionGapsV1}=
      await import("../src/lib/content/article-question-gap-audit-v1");
    const audit=auditExistingArticleQuestionGapsV1({
      bodyMarkdown:article.bodyMarkdown,
      groups:semantic.semanticClusters,
      sources:base.sectionSourceCandidates.map(s=>({
        sectionIndex:s.sectionIndex,heading:s.heading,
        verifiedExternalSources:s.evidenceBackedLinks.length,
        sourceUrls:s.evidenceBackedLinks.map(e=>e.url),
      })),
    });
    console.log(JSON.stringify({
      mode:"FREE_SAME_ID_EVIDENCED_QUESTION_GAP_PREVIEW_V1",
      articleId,articleStatus:article.status,
      articleUpdatedAt:article.updatedAt.toISOString(),
      market,coreTopic:core,
      cacheSource:"DATAFORSEO_KEYWORD_SUGGESTIONS",
      cacheAgeDays:ageDays,cacheObservedRows:suggestions.length,
      semanticScopeSummary:{
        topical:semantic.topicalQuestions,
        otherPages:semantic.separatePageQueries.length,
        intentReview:semantic.intentReviewQueries.length,
      },
      ...audit,
      articleSourceLinks:base.article.visibleExternalLinks,
      articleProseAnomalies:base.article.probableSpacingIssues,
      readerWarning:"Heading/body token proximity NEVER establishes a complete answer. Review actual excerpt, source validity and user task. This audit does NOT assign new query nodes or change any signed snapshot.",
      dataForSeoCalls:0,deepSerpCalls:0,aiCalls:0,
      articleUnchanged:true,briefUnchanged:true,
      databaseUnchanged:true,
    },null,2));
  }finally{await prisma.$disconnect();}
}
main().catch(error=>{
  console.error("ARTICLE_QUESTION_GAP_AUDIT_STOPPED:",
    error instanceof Error?error.message:String(error));
  process.exitCode=1;
});
