/**
 * FREE unless explicitly given --execute AND exact review attestation.
 * Appends ONE human-approved query-owner review, never updates signed
 * ContentEvidenceSnapshot.plan, article Markdown, SERP Replay or research.
 *
 * First install Prisma migration and regenerate Prisma Client.
 * No DataForSEO or AI model calls. Must have personally reviewed the
 * specific observed query, existing H2 text, and signed excerpt evidence.
 */
import {loadEnvConfig} from "@next/env";
loadEnvConfig(process.env.GROWTH_OS_ENV_DIR?.trim()||process.cwd());

const attestation="I_REVIEWED_THE_QUERY_AND_EXISTING_H2";
const sha=(v:unknown)=>import("node:crypto")
  .then(({createHash})=>createHash("sha256").update(JSON.stringify(v)).digest("hex"));

async function main(){
  const argv=process.argv.slice(2);
  const articleId=argv.find(x=>x.startsWith("--article="))?.slice(10);
  const node=argv.find(x=>x.startsWith("--approve-node="))?.slice(15);
  const indexText=argv.find(x=>x.startsWith("--approve-h2="))?.slice(13);
  const approval=argv.find(x=>x.startsWith("--review-attestation="))
    ?.slice(21);
  const execute=argv.includes("--execute");
  const allowed=new Set([
    "--execute",...argv.filter(x=>
      x.startsWith("--article=")||x.startsWith("--approve-node=")||
      x.startsWith("--approve-h2=")||
      x.startsWith("--review-attestation=")),
  ]);
  if(!articleId||!/^[a-z0-9_-]{5,100}$/i.test(articleId)||
    argv.some(x=>!allowed.has(x)) ||
    (execute&&(!node||!indexText||approval!==attestation))||
    (!execute&&(node||indexText||approval))||
    (execute&&argv.length!==5)||(!execute&&argv.length!==1))
    throw new Error(
      "USAGE: --article=ID [--approve-node=REAL_NODE_ID --approve-h2=INDEX "+
      "--review-attestation="+attestation+" --execute]");
  const {prisma}=await import("../src/lib/prisma");
  try{
    const article=await prisma.contentArticle.findUnique({
      where:{id:articleId},
      include:{brief:{select:{
        websiteId:true,primaryKeyword:true,secondaryKeywords:true,
      }}},
    });
    if(!article||article.status!=="IN_REVIEW"||
      article.publishedAt!==null||article.publishedUrl!==null)
      throw new Error("ARTICLE_MUST_BE_UNPUBLISHED_IN_REVIEW");
    const [snapshot,replay]=await Promise.all([
      prisma.contentEvidenceSnapshot.findUnique({
        where:{briefId:article.briefId},select:{id:true,plan:true},
      }),
      prisma.serpReplayArtifact.findFirst({
        where:{contentArticleId:articleId},
        orderBy:[{createdAt:"desc"},{id:"desc"}],
      }),
    ]);
    if(!snapshot||!replay||replay.executionStatus!=="SUCCEEDED")
      throw new Error("EXACT_SIGNED_RESEARCH_OR_REPLAY_MISSING");
    const {inspectMasterRuntimeSnapshot}=await import(
      "../src/lib/content/master-runtime-adapter");
    const {parsePersistedArticleExecutionPlanV1}=await import(
      "../src/lib/content/article-execution-plan-binding-v1");
    const {proposeExistingArticleQueryOwnerRebindV1}=await import(
      "../src/lib/content/existing-article-query-owner-proposal-v1");
    const {buildSerpReplayArticleFingerprintV1}=await import(
      "../src/lib/content/serp-replay-fingerprint");
    const {HUMAN_OWNER_APPROVAL_ATTESTATION_V1}=await import(
      "../src/lib/content/existing-article-approved-query-owner-v1");
    const obj=snapshot.plan;
    if(!obj||typeof obj!=="object"||Array.isArray(obj))
      throw new Error("SNAPSHOT_INVALID");
    const runtime=inspectMasterRuntimeSnapshot(obj).runtime;
    if(!runtime)throw new Error("SIGNED_RUNTIME_INVALID");
    const plan=parsePersistedArticleExecutionPlanV1(
      (obj as Record<string,unknown>).articleExecutionPlan);
    if(plan.websiteId!==article.brief.websiteId)
      throw new Error("EXECUTION_PLAN_SITE_CHANGED");
    const shape={
      title:article.title,metaDescription:article.metaDescription,
      h1:article.h1,bodyMarkdown:article.bodyMarkdown,
    };
    const fingerprint=buildSerpReplayArticleFingerprintV1(shape);
    if(replay.articleFingerprint!==fingerprint)
      throw new Error("REPLAY_STALE_FOR_SAVED_ARTICLE");
    const proposal=proposeExistingArticleQueryOwnerRebindV1({
      article:shape,runtime,plan,
      primaryKeyword:article.brief.primaryKeyword,
      secondaryKeywords:article.brief.secondaryKeywords,replay,
    });
    if(proposal.candidateCount!==1)
      throw new Error("NO_SINGLE_EVIDENCED_QUERY_OWNER_PROPOSAL");
    const proposed=proposal.proposals[0]!;
    const match=execute&&
      node===proposed.nodeId&&
      String(proposed.proposedOwnerSectionIndex)===indexText &&
      approval===HUMAN_OWNER_APPROVAL_ATTESTATION_V1;
    if(!execute){
      console.log(JSON.stringify({
        mode:"FREE_QUERY_OWNER_REVIEW_PREVIEW",
        articleId,status:article.status,proposal,
        actualReplayId:replay.id,
        next:"Human must review this H2+evidence and explicitly approve append-only record.",
        dataForSeoCalls:0,modelCalls:0,databaseUnchanged:true,
      },null,2));return;
    }
    if(!match)throw new Error("EXPLICIT_REVIEW_DOES_NOT_MATCH_SIGNED_PROPOSAL");
    const snapHash=await sha(obj);
    const {Prisma}=await import("@prisma/client");
    const outcome=await prisma.$transaction(async(tx)=>{
      // Prisma transaction uses one PostgreSQL connection: never submit
      // overlapping client.query calls on it (deprecated in pg 8, rejected
      // in pg 9). All reads retain the same SERIALIZABLE snapshot.
      const current=await tx.contentArticle.findUnique({
        where:{id:articleId},
      });
      const source=await tx.contentEvidenceSnapshot.findUnique({
        where:{briefId:article.briefId},select:{id:true,plan:true},
      });
      const lastReplay=await tx.serpReplayArtifact.findFirst({
        where:{contentArticleId:articleId},
        orderBy:[{createdAt:"desc"},{id:"desc"}],
      });
      const existing=await tx.contentQueryOwnerReview.findFirst({
        where:{contentArticleId:articleId,
          queryNodeId:proposed.nodeId,
          sourceArticleFingerprint:fingerprint,
          sourceQueryGraphSha256:proposal.sourceQueryGraphSha256},
      });
      if(!current||!source||current.status!=="IN_REVIEW"||
        current.updatedAt.getTime()!==article.updatedAt.getTime()||
        current.title!==article.title||
        current.metaDescription!==article.metaDescription||
        current.h1!==article.h1||
        current.bodyMarkdown!==article.bodyMarkdown||
        source.id!==snapshot.id||await sha(source.plan)!==snapHash||
        lastReplay?.id!==replay.id)
        throw new Error("ARTICLE_EVIDENCE_OR_REPLAY_CONCURRENTLY_CHANGED");
      if(existing){
        if(existing.ownerSectionIndex!==proposed.proposedOwnerSectionIndex||
          existing.ownerHeading!==proposed.proposedOwnerH2||
          existing.reviewerAttestation!==attestation||
          existing.sourceReplayArtifactId!==replay.id||
          existing.sourceSectionBlueprintSha256!==
            proposal.sourceSectionBlueprintSha256||
          existing.sourceExecutionPlanSha256!==proposal.sourceExecutionPlanSha256)
          throw new Error("EXISTING_OWNER_REVIEW_CONFLICT");
        return {id:existing.id,inserted:false};
      }
      const saved=await tx.contentQueryOwnerReview.create({
        data:{
          contentArticleId:articleId,
          evidenceSnapshotId:snapshot.id,
          queryNodeId:proposed.nodeId,
          observedQuery:proposed.observedQuery,
          ownerSectionIndex:proposed.proposedOwnerSectionIndex,
          ownerHeading:proposed.proposedOwnerH2,
          sourceArticleFingerprint:fingerprint,
          sourceQueryGraphSha256:proposal.sourceQueryGraphSha256,
          sourceSectionBlueprintSha256:proposal.sourceSectionBlueprintSha256,
          sourceExecutionPlanSha256:proposal.sourceExecutionPlanSha256,
          sourceReplayArtifactId:replay.id,
          decisionVersion:"QUERY_OWNER_HUMAN_APPROVAL_V1",
          decision:"APPROVED",
          reviewerAttestation:attestation,
        },
      });
      return {id:saved.id,inserted:true};
    },{
      isolationLevel:Prisma.TransactionIsolationLevel.Serializable,
      maxWait:10000,timeout:30000,
    });
    console.log(JSON.stringify({
      mode:"HUMAN_APPROVED_APPEND_ONLY_QUERY_OWNER_REVIEW",
      reviewId:outcome.id,newReviewInserted:outcome.inserted,
      articleId,unchangedArticleFingerprint:fingerprint,
      nodeId:proposed.nodeId,approvedH2:proposed.proposedOwnerH2,
      originalResearchAndArticleUnchanged:true,
      replayUnchanged:true,articleStillInReview:true,
      dataForSeoCalls:0,modelCalls:0,
      warning:"Human owner decision does NOT certify whole-article SEO readiness or publish it.",
    },null,2));
  }finally{await prisma.$disconnect();}
}
main().catch(error=>{
  console.error("QUERY_OWNER_REVIEW_STOPPED="+(
    error instanceof Error?error.message:String(error)));
  process.exitCode=1;
});
