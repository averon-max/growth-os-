/**
 * Re-evaluate an already-written article rejected ONLY for the old
 * Markdown/prose whitespace audit mismatch. NO AI, NO Writer, NO replay.
 *
 * Requires the FINAL checkpoint and the latest genuine persisted SERP
 * artifact to attest the exact, unchanged article; otherwise fail closed.
 *
 * Usage (read-only):
 *   npx tsx scripts/content-recover-existing-whitespace-rejection.ts BRIEF_ID ARTICLE_ID
 *
 * Explicit DB transition:
 *   GROWTH_OS_WHITESPACE_RECOVERY_COMMIT=1 npx tsx ... BRIEF_ID ARTICLE_ID --commit
 */
import { loadEnvConfig } from "@next/env";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { Prisma } from "@prisma/client";

loadEnvConfig(process.env.GROWTH_OS_ENV_ROOT?.trim() || process.cwd());
const hash=(value:string)=>createHash("sha256").update(value,"utf8").digest("hex");
function check(value:unknown,message:string):asserts value {
  if(!value) throw new Error(message);
}
function record(value:unknown):Record<string,any>{
  check(value!==null&&typeof value==="object"&&!Array.isArray(value),"INVALID_RECORD");
  return value as Record<string,any>;
}
function articleFields(value:unknown){
  const a=record(value);
  check(
    typeof a.title==="string" &&
    typeof a.metaDescription==="string" &&
    typeof a.h1==="string" &&
    typeof a.bodyMarkdown==="string",
    "ARTIFACT_ARTICLE_FIELDS_INVALID"
  );
  return {
    title:a.title as string,
    metaDescription:a.metaDescription as string,
    h1:a.h1 as string,
    bodyMarkdown:a.bodyMarkdown as string,
  };
}
async function main(){
  const [briefId,articleId,flag,...extra]=process.argv.slice(2);
  const commit=flag==="--commit";
  check(!extra.length&&(!flag||commit)&&[briefId,articleId].every(
    x=>/^[a-z0-9_-]{5,100}$/i.test(x??"")
  ),"USAGE: BRIEF_ID ARTICLE_ID [--commit]");
  check(!commit||process.env.GROWTH_OS_WHITESPACE_RECOVERY_COMMIT==="1",
    "EXPLICIT_COMMIT_OPT_IN_REQUIRED");
  const {prisma}=await import("../src/lib/prisma");
  try{
    const [brief,article,snapshot]=await Promise.all([
      prisma.contentBrief.findUnique({
        where:{id:briefId},
        select:{websiteId:true,primaryKeyword:true,secondaryKeywords:true},
      }),
      prisma.contentArticle.findUnique({where:{id:articleId}}),
      prisma.contentEvidenceSnapshot.findUnique({where:{briefId},select:{plan:true}}),
    ]);
    check(brief&&article&&snapshot&&article.briefId===briefId,
      "BRIEF_ARTICLE_OR_EVIDENCE_SNAPSHOT_NOT_FOUND");
    check(article.status==="REJECTED" && article.publishedAt===null &&
      article.publishedUrl===null &&
      article.publishError?.includes("BROKEN_ARTICLE_EXCESSIVE_SPACES"),
      "NOT_A_WHITESPACE_ONLY_REJECTED_ARTICLE");

    const { normalizeMasterArticleProseSpacesV1 }=
      await import("../src/lib/content/article-prose-whitespace-v1");
    check(normalizeMasterArticleProseSpacesV1(article.bodyMarkdown)===article.bodyMarkdown,
      "STORED_ARTICLE_HAS_ACTUAL_UNNORMALIZED_PROSE");
    const {auditArticle}=await import("../src/lib/content/content-quality");
    const {evaluateContentGate}=await import("../src/lib/content/content-gate");
    const {getBusinessFactRegistryForBrief}=
      await import("../src/lib/content/evidence-snapshot");
    const {assertStoredPublicationEvidenceV1}=
      await import("../src/lib/content/stored-publication-evidence-gate-v1");
    const {analyzeArticleAgainstPlan}=
      await import("../src/lib/content/content-plan-analysis");
    const {evaluateArticlePublicationPolicy}=
      await import("../src/lib/content/article-publication-policy");
    const {buildSerpReplayArticleFingerprintV1}=
      await import("../src/lib/content/serp-replay-fingerprint");
    const {parsePersistedArticleExecutionPlanV1}=
      await import("../src/lib/content/article-execution-plan-binding-v1");
    const {buildProductionFinalArticleReadinessV1}=
      await import("../src/lib/content/production-final-article-readiness-adapter-v1");

    const fields=articleFields(article),fp=buildSerpReplayArticleFingerprintV1(fields);
    const replay=await prisma.serpReplayArtifact.findFirst({
      where:{contentArticleId:articleId},
      orderBy:[{createdAt:"desc"},{id:"desc"}],
    });
    check(replay&&replay.executionStatus==="SUCCEEDED" &&
      ["READY","WARN"].includes(replay.replayStatus??"") &&
      replay.articleFingerprintAlgo==="SHA256_V1"&&
      replay.articleFingerprint===fp&&
      replay.replayVersion==="SERP_REPLAY_V1",
      "LATEST_REAL_SERP_REPLAY_MUST_MATCH_EXACT_ARTICLE");

    assertStoredPublicationEvidenceV1(snapshot.plan);
    const audit=auditArticle({article:fields,primaryKeyword:brief.primaryKeyword});
    const analysis=analyzeArticleAgainstPlan({
      ...fields,plan:snapshot.plan,
      primaryKeyword:brief.primaryKeyword,
      secondaryKeywords:brief.secondaryKeywords,
    });
    const registry=await getBusinessFactRegistryForBrief({
      briefId,websiteId:brief.websiteId,
    });
    const gate=evaluateContentGate({
      article:fields,primaryKeyword:brief.primaryKeyword,audit,registry,
    });
    const policy=evaluateArticlePublicationPolicy({article:fields,intelligence:analysis});
    check(gate.pass&&policy.pass, "STILL_BLOCKED_AFTER_CANONICAL_WHITESPACE_FIX");

    // This full run checkpoint was persisted AFTER the accepted nine-critic
    // suite and competitive SERP replay. Never fabricate missing authority.
    const cpRoot=resolve(process.env.GROWTH_OS_ARTICLE_CHECKPOINT_DIR?.trim() ||
      join(process.cwd(),".growth-os-tmp/article-checkpoints"));
    const cpName=join(cpRoot,articleId+"-POST_FINAL_REPLAY.json");
    let cpRaw:string;
    try{
      cpRaw=await readFile(cpName,"utf8");
    }catch{
      throw new Error("POST_FINAL_REPLAY_CHECKPOINT_NOT_FOUND__NO_AI_OR_DB_CHANGES");
    }
    const saved=record(JSON.parse(cpRaw)),cp=record(saved.checkpoint);
    check(saved.sha256===hash(JSON.stringify(cp)) &&
      cp.version==="ARTICLE_RECOVERY_CHECKPOINT_V1" &&
      cp.stage==="POST_FINAL_REPLAY"&&cp.articleId===articleId&&cp.briefId===briefId,
      "FINAL_CHECKPOINT_INTEGRITY_FAILED");
    const run=record(cp.writerRun),critics=record(cp.finalCritics);
    check(run.version==="MASTER_WRITER_RUN_V1" &&
      hash(JSON.stringify(articleFields(record(run.article))))===
        hash(JSON.stringify(fields)) &&
      critics.version==="MASTER_ARTICLE_CRITIC_EXECUTION_V1" &&
      ["PASS","WARN"].includes(critics.suite?.status) &&
      critics.provenance?.finalCriticCount===9 &&
      critics.suite?.counts?.blockFindings===0,
      "FINAL_CRITIC_OR_ARTICLE_VERSION_NOT_PROVEN");

    const plan=parsePersistedArticleExecutionPlanV1(
      record(snapshot.plan).articleExecutionPlan
    );
    const restoredReplay={
      version:"SERP_REPLAY_V1",status:replay.replayStatus,
      keyword:replay.keyword,
      serpSnapshotFingerprint:replay.serpSnapshotFingerprint,
      serpCapturedAt:replay.serpCapturedAt,
      comparisons:replay.comparisons,
      blockers:replay.blockers,
      warnings:replay.warnings,
      provenance:replay.provenance,
    };
    const readiness=buildProductionFinalArticleReadinessV1({
      plan,writerRun:run,finalCritics:critics,
      articleBodyMarkdown:fields.bodyMarkdown,
      contentGatePass:gate.pass,
      publicationPolicyPass:policy.pass,
      serpReplay:restoredReplay,
      serpReplayWarning:null,
    });
    check(["PASS","WARN"].includes(readiness.status) &&
      readiness.blockers.length===0,
      "FINAL_READINESS_STILL_BLOCKED:"+JSON.stringify(readiness.blockers));

    console.log(JSON.stringify({
      result:commit?"CONTROLLED_WHITESPACE_PROMOTION_REQUESTED":
        "READ_ONLY_WHITESPACE_RECOVERY_PREFLIGHT_PASS",
      articleId,briefId,statusBefore:article.status,
      contentGate:"PASS",publicationPolicy:"PASS",
      criticStatus:critics.suite.status,
      replayStatus:replay.replayStatus,
      readinessStatus:readiness.status,
      blockers:readiness.blockers,
      qualityAudit:audit.score,readerWords:audit.wordCount,
      plannedKeywords:analysis.article.keywordCoverage,
      exactArticleFingerprint:fp,
      articleBytesUnchanged:true,replayReusedWithoutModelCall:true,
      checkpointSha256:saved.sha256,
      commit,
    },null,2));
    if(!commit)return;

    const result=await prisma.$transaction(async tx=>{
      const [now,nowSnapshot,latestReplay]=await Promise.all([
        tx.contentArticle.findUnique({where:{id:articleId}}),
        tx.contentEvidenceSnapshot.findUnique({where:{briefId},select:{plan:true}}),
        tx.serpReplayArtifact.findFirst({
          where:{contentArticleId:articleId},
          orderBy:[{createdAt:"desc"},{id:"desc"}],
        }),
      ]);
      check(now&&nowSnapshot&&latestReplay&&
        now.status==="REJECTED"&&now.briefId===briefId&&
        now.updatedAt.getTime()===article.updatedAt.getTime()&&
        now.publishError===article.publishError&&
        hash(JSON.stringify(articleFields(now)))===hash(JSON.stringify(fields)) &&
        hash(JSON.stringify(nowSnapshot.plan))===hash(JSON.stringify(snapshot.plan)) &&
        latestReplay.id===replay.id &&
        latestReplay.articleFingerprint===fp,
        "STORED_INPUTS_CHANGED_BEFORE_TRANSACTION");
      const promoted=await tx.contentArticle.updateMany({
        where:{id:articleId,briefId,status:"REJECTED",
          updatedAt:article.updatedAt,publishError:article.publishError},
        data:{status:"IN_REVIEW",publishError:null},
      });
      check(promoted.count===1,"ARTICLE_CAS_FAILED");
      return promoted.count;
    },{
      isolationLevel:Prisma.TransactionIsolationLevel.Serializable,
      maxWait:10000,
      timeout:30000,
    });
    const after=await prisma.contentArticle.findUnique({where:{id:articleId}});
    check(result===1&&after?.status==="IN_REVIEW"&&
      hash(JSON.stringify(articleFields(after)))===hash(JSON.stringify(fields)),
      "POST_COMMIT_STATUS_OR_ARTICLE_FINGERPRINT_MISMATCH");
    console.log(JSON.stringify({
      result:"EXISTING_ARTICLE_RECOVERED_IN_REVIEW",
      articleId,briefId,status:"IN_REVIEW",
      originalSerpReplayArtifactId:replay.id,
      exactArticleFingerprint:fp,
      originalTextUnchanged:true,newAiCalls:0,published:false,
    },null,2));
  }finally{
    await prisma.$disconnect();
  }
}
main().catch(error=>{
  console.error("WHITESPACE_RECOVERY_STOPPED:",
    error instanceof Error?error.message:String(error));
  process.exitCode=1;
});
