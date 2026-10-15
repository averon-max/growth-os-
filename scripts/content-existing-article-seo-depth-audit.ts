/**
 * Same-ID READ-ONLY diagnostics for a recovered comprehensive SEO article.
 * No model/provider searches, DB writes, checkpoint mutation or publication.
 *
 * NODE_OPTIONS=--conditions=react-server npx tsx \
 *   scripts/content-existing-article-seo-depth-audit.ts ARTICLE_ID
 */
import {loadEnvConfig} from "@next/env";
import {prisma} from "../src/lib/prisma";
import {countExactPhrase,countWords}
  from "../src/lib/content/article-analyzer";
import {resolveArticleLengthContractV1}
  from "../src/lib/content/article-length-contract-v1";
import {inspectMasterRuntimeSnapshot}
  from "../src/lib/content/master-runtime-adapter";
import {parsePersistedArticleExecutionPlanV1}
  from "../src/lib/content/article-execution-plan-binding-v1";
loadEnvConfig(process.cwd());

async function main(){
  const articleId=process.argv[2];
  if(!articleId || !/^[a-zA-Z0-9_-]{5,100}$/.test(articleId))
    throw new Error("USAGE: content-existing-article-seo-depth-audit.ts ARTICLE_ID");
  const article=await prisma.contentArticle.findUnique({
    where:{id:articleId},
    include:{brief:{include:{evidenceSnapshot:true}}},
  });
  if(!article)throw new Error("ARTICLE_NOT_FOUND");
  const snapshot=article.brief.evidenceSnapshot?.plan;
  const planValue=snapshot&&typeof snapshot==="object"&&!Array.isArray(snapshot)
    ?snapshot as Record<string,unknown>:null;
  if(!planValue)throw new Error("EVIDENCE_SNAPSHOT_NOT_FOUND");
  const parsed=inspectMasterRuntimeSnapshot(snapshot);
  if(!parsed.runtime)throw new Error("MASTER_RUNTIME_UNAVAILABLE");
  const execution=parsePersistedArticleExecutionPlanV1(
    planValue.articleExecutionPlan);
  const length=resolveArticleLengthContractV1(execution);
  const body=article.bodyMarkdown;
  const corpus=[article.title,article.h1,body].join("\n");
  const sections=body.split(/^##\s+/m).slice(1).map((chunk,index)=>{
    const split=chunk.indexOf("\n");
    const heading=(split<0?chunk:chunk.slice(0,split)).trim();
    const prose=split<0?"":chunk.slice(split+1);
    const owned=execution.sections.filter(s=>s.state==="WRITABLE")[index];
    return {
      sectionIndex:index,heading,words:countWords(prose),
      h3Count:(prose.match(/^###\s+/gm)??[]).length,
      approvedClaimCount:owned?.requiredClaimIds.length??0,
      verifiedEvidenceCount:owned?.evidenceIds.length??0,
      assignedQuestionCount:owned?.requiredQuestionIds.length??0,
      assignedTopicCount:owned?.requiredTopicIds.length??0,
      depthTarget:owned?.targetWords??null,
    };
  });
  const runtime=parsed.runtime,assigned=new Set(
    runtime.sectionBlueprints.sections.flatMap(s=>s.queryNodeIds)
  ),samePage=new Set(runtime.queryGraph.samePageNodeIds);
  const briefKeywords=[article.brief.primaryKeyword,
    ...article.brief.secondaryKeywords].filter(Boolean);
  const briefSet=new Set(briefKeywords.map(k=>k.toLowerCase().trim()));
  const observed=runtime.queryGraph.nodes.filter(node=>
    assigned.has(node.id)&&samePage.has(node.id)&&
    node.intent===runtime.queryGraph.missionIntent&&
    node.sourceConfidence>=0.6&&
    !briefSet.has(node.query.trim().toLowerCase())
  ).sort((a,b)=>(b.gscImpressions??0)-(a.gscImpressions??0)||
    (b.searchVolume??0)-(a.searchVolume??0)||
    b.sourceConfidence-a.sourceConfidence);
  const seen=new Set<string>();
  const supportingQueries=observed.filter(node=>{
    const key=node.query.toLowerCase().trim();
    if(seen.has(key))return false;
    seen.add(key);
    return true;
  }).slice(0,20).map(node=>({
    query:node.query,sourceConfidence:node.sourceConfidence,
    exactMentions:countExactPhrase(corpus,node.query),
    note:"Exact phrase diagnostic only. Absence is NOT proof of missing semantic coverage.",
  }));
  const wordCount=countWords(body);
  console.log(JSON.stringify({
    mode:"READ_ONLY_ARTICLE_SEMANTIC_DEPTH_AUDIT",
    articleId,status:article.status,wordCount,
    wordRange:length.targetWords,
    withinCurrentComprehensiveRange:!length.targetWords||
      (wordCount>=length.targetWords.min&&
        wordCount<=length.targetWords.max),
    headings:{h1:1,h2:sections.length,
      h3:sections.reduce((sum,s)=>sum+s.h3Count,0)},
    briefKeywordCoverage:briefKeywords.map(keyword=>({
      keyword,exactMentions:countExactPhrase(corpus,keyword),
    })),
    assignedObservedSupportingQueries:supportingQueries,
    sections,
    modelCalls:0,searchCalls:0,databaseUnchanged:true,
    warning:"Exact keyword coverage is not a proxy for semantic quality. No source-backed section edits or SERP replay occurred.",
  },null,2));
}
main().catch(error=>{
  console.error("SEO_DEPTH_AUDIT_FAILED:",
    error instanceof Error?error.message:String(error));
  process.exitCode=1;
}).finally(()=>prisma.$disconnect());
