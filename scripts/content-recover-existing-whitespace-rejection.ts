/**
 * One-article deterministic salvage after the old whitespace-only
 * Content Gate rejection. No Writer, model, web requests or paid replay.
 *
 * IMPORTANT: normalized bytes DIFFER from the original SERP-compared
 * article. A new FAILED/diagnostic replay artifact is appended, so the
 * real publish gate refuses to publish until a fresh replay is run.
 *
 * Default read only. The --commit path requires an explicit env opt-in.
 */
import { loadEnvConfig } from "@next/env";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { Prisma } from "@prisma/client";

loadEnvConfig(process.env.GROWTH_OS_ENV_ROOT?.trim() || process.cwd());
const hash=(x:string)=>createHash("sha256").update(x,"utf8").digest("hex");
function check(ok:unknown,why:string):asserts ok{if(!ok)throw new Error(why);}
function rec(value:unknown):Record<string,any>{
  check(value!==null&&typeof value==="object"&&!Array.isArray(value),
    "RECOVERY_EXPECTED_RECORD");
  return value as Record<string,any>;
}
function fields(value:unknown){
  const a=rec(value);
  check(["title","metaDescription","h1","bodyMarkdown"].every(
    key=>typeof a[key]==="string"),"RECOVERY_ARTICLE_FIELDS_INVALID");
  return {title:a.title as string,metaDescription:a.metaDescription as string,
    h1:a.h1 as string,bodyMarkdown:a.bodyMarkdown as string};
}
function jsonValue(x:unknown):Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(x)) as Prisma.InputJsonValue;
}
function errored(e:unknown){return e instanceof Error?e.message:String(e);}

async function main(){
  const [briefId,articleId,flag,...rest]=process.argv.slice(2);
  const commit=flag==="--commit";
  check(rest.length===0&&(!flag||commit)&&[briefId,articleId].every(
    id=>/^[a-z0-9_-]{5,100}$/i.test(id??"")),
    "USAGE: BRIEF_ID ARTICLE_ID [--commit]");
  check(!commit||process.env.GROWTH_OS_WHITESPACE_RECOVERY_COMMIT==="1",
    "EXPLICIT_WHITESPACE_RECOVERY_COMMIT_OPT_IN_REQUIRED");

  const {prisma}=await import("../src/lib/prisma");
  try{
    const [brief,article,snapshot]=await Promise.all([
      prisma.contentBrief.findUnique({where:{id:briefId},
        select:{websiteId:true,primaryKeyword:true,secondaryKeywords:true}}),
      prisma.contentArticle.findUnique({where:{id:articleId}}),
      prisma.contentEvidenceSnapshot.findUnique({where:{briefId},select:{plan:true}}),
    ]);
    check(brief&&article&&snapshot&&article.briefId===briefId,
      "RECOVERY_BRIEF_ARTICLE_EVIDENCE_NOT_FOUND");
    check(article.status==="REJECTED"&&!article.publishedAt&&!article.publishedUrl,
      "RECOVERY_STATUS_NOT_UNPUBLISHED_REJECTED");
    check(article.publishError===
      "CONTENT_GATE_FAILED: BROKEN_ARTICLE_EXCESSIVE_SPACES",
      "RECOVERY_ERROR_NOT_EXACTLY_WHITESPACE_ONLY");

    const original=fields(article);
    const {normalizeMasterArticleProseSpacesV1}=
      await import("../src/lib/content/article-prose-whitespace-v1");
    const cleaned=normalizeMasterArticleProseSpacesV1(original.bodyMarkdown);
    check(cleaned!==original.bodyMarkdown,
      "RECOVERY_NO_CANONICAL_WHITESPACE_CHANGE_FOUND");
    check(normalizeMasterArticleProseSpacesV1(cleaned)===cleaned,
      "RECOVERY_NORMALIZER_NOT_IDEMPOTENT");
    // Prove identical non-space characters and words, including code,
    // headings and claims. No punctuation or words may be changed.
    check(original.bodyMarkdown.replace(/ +/g," ")===cleaned.replace(/ +/g," "),
      "RECOVERY_CHANGED_NON_WHITESPACE_CONTENT");
    const changedLines=original.bodyMarkdown.split("\n").filter(
      (line,i)=>line!==cleaned.split("\n")[i]).length;
    check(changedLines>=1&&changedLines<=30,
      "RECOVERY_WHITESPACE_DIFF_TOO_LARGE");

    const proposed={...original,bodyMarkdown:cleaned};
    const {buildSerpReplayArticleFingerprintV1}=
      await import("../src/lib/content/serp-replay-fingerprint");
    const oldFingerprint=buildSerpReplayArticleFingerprintV1(original);
    const newFingerprint=buildSerpReplayArticleFingerprintV1(proposed);
    check(oldFingerprint!==newFingerprint,"RECOVERY_FINGERPRINT_UNCHANGED");

    const replay=await prisma.serpReplayArtifact.findFirst({
      where:{contentArticleId:articleId},
      orderBy:[{createdAt:"desc"},{id:"desc"}],
    });
    check(replay&&replay.executionStatus==="SUCCEEDED" &&
      replay.replayVersion==="SERP_REPLAY_V1" &&
      (replay.replayStatus==="READY"||replay.replayStatus==="WARN") &&
      replay.articleFingerprintAlgo==="SHA256_V1" &&
      replay.articleFingerprint===oldFingerprint &&
      replay.keyword?.trim().toLowerCase()===
        brief.primaryKeyword.trim().toLowerCase() &&
      replay.serpSnapshotFingerprint &&
      replay.serpCapturedAt instanceof Date &&
      Array.isArray(replay.comparisons) &&
      Array.isArray(replay.blockers) &&
      replay.blockers.length===0,
      "RECOVERY_ORIGINAL_GENUINE_REPLAY_NOT_VERIFIABLE");

    const {assertStoredPublicationEvidenceV1}=
      await import("../src/lib/content/stored-publication-evidence-gate-v1");
    const {auditArticle}=await import("../src/lib/content/content-quality");
    const {evaluateContentGate}=
      await import("../src/lib/content/content-gate");
    const {getBusinessFactRegistryForBrief}=
      await import("../src/lib/content/evidence-snapshot");
    const {analyzeArticleAgainstPlan}=
      await import("../src/lib/content/content-plan-analysis");
    const {evaluateArticlePublicationPolicy}=
      await import("../src/lib/content/article-publication-policy");
    assertStoredPublicationEvidenceV1(snapshot.plan);
    const auditBefore=auditArticle({article:original,
      primaryKeyword:brief.primaryKeyword});
    const audit=auditArticle({article:proposed,
      primaryKeyword:brief.primaryKeyword});
    check(auditBefore.issues.includes("BROKEN_ARTICLE_EXCESSIVE_SPACES") &&
      !audit.issues.includes("BROKEN_ARTICLE_EXCESSIVE_SPACES") &&
      auditBefore.wordCount===audit.wordCount &&
      auditBefore.h2Count===audit.h2Count &&
      auditBefore.h3Count===audit.h3Count,
      "RECOVERY_AUDIT_DID_NOT_CONVERGE");

    const before=analyzeArticleAgainstPlan({...original,plan:snapshot.plan,
      primaryKeyword:brief.primaryKeyword,
      secondaryKeywords:brief.secondaryKeywords});
    const analysis=analyzeArticleAgainstPlan({...proposed,plan:snapshot.plan,
      primaryKeyword:brief.primaryKeyword,
      secondaryKeywords:brief.secondaryKeywords});
    check(isDeepStrictEqual(before.article.keywordCoverage,
      analysis.article.keywordCoverage) &&
      isDeepStrictEqual(before.article.structure,analysis.article.structure),
      "RECOVERY_STRUCTURE_OR_KEYWORD_DRIFT");
    const registry=await getBusinessFactRegistryForBrief({
      briefId,websiteId:brief.websiteId,
    });
    const gate=evaluateContentGate({article:proposed,
      primaryKeyword:brief.primaryKeyword,audit,registry});
    const policy=evaluateArticlePublicationPolicy({
      article:proposed,intelligence:analysis,
    });
    check(gate.pass&&policy.pass,
      "RECOVERY_CONTENT_OR_PUBLICATION_GATE_STILL_BLOCKED");

    // Local checkpoints are OPTIONAL, and were not enabled for the
    // user's 3000 run. A real persisted post-critic SERP artifact
    // remains the authority when the checkpoint is missing.
    const cpDir=resolve(process.env.GROWTH_OS_ARTICLE_CHECKPOINT_DIR?.trim() ||
      join(process.cwd(),".growth-os-tmp/article-checkpoints"));
    const cpPath=join(cpDir,articleId+"-POST_FINAL_REPLAY.json");
    const checkpointRaw:string|null=await readFile(cpPath,"utf8")
      .catch((error:NodeJS.ErrnoException)=>{
        if(error.code==="ENOENT")return null;
        throw error;
      });
    let checkpointVerified=false;
    let checkpointHash:string|null=null;
    if(checkpointRaw){
      const saved=rec(JSON.parse(checkpointRaw)),cp=rec(saved.checkpoint);
      check(saved.sha256===hash(JSON.stringify(cp)) &&
        cp.stage==="POST_FINAL_REPLAY"&&
        cp.version==="ARTICLE_RECOVERY_CHECKPOINT_V1"&&
        cp.articleId===articleId&&cp.briefId===briefId &&
        cp.writerRun?.version==="MASTER_WRITER_RUN_V1" &&
        hash(JSON.stringify(fields(cp.writerRun.article)))===
          hash(JSON.stringify(original)) &&
        ["PASS","WARN"].includes(cp.finalCritics?.suite?.status) &&
        cp.finalCritics?.provenance?.finalCriticCount===9 &&
        cp.finalCritics?.suite?.counts?.blockFindings===0,
        "RECOVERY_EXISTING_CHECKPOINT_CONFLICT");
      checkpointVerified=true;
      checkpointHash=saved.sha256;
    }

    const summary={
      result:commit?"DETERMINISTIC_FORMATTING_RECOVERY_COMMIT_REQUESTED":
        "READ_ONLY_FORMATTING_RECOVERY_PASS",
      briefId,articleId,
      from:"REJECTED",to:"IN_REVIEW",
      readerWords:audit.wordCount,
      h2:audit.h2Count,h3:audit.h3Count,
      plannedKeywords:analysis.article.keywordCoverage,
      changedLines,whitespaceOnly:true,
      originalReplayStatus:replay.replayStatus,
      originalReplayArtifactId:replay.id,
      originalFingerprint:oldFingerprint,
      normalizedFingerprint:newFingerprint,
      checkpointVerified,
      checkpointHash,
      contentGate:"PASS",
      publicationPolicy:"PASS",
      publicationReplayStatus:"REVALIDATION_REQUIRED",
      publicationBlockedUntilNewRealReplay:true,
      newModelCalls:0,
      databaseUnchanged:!commit,
    };
    console.log(JSON.stringify(summary,null,2));
    if(!commit)return;

    // Single serializable unit. Archive the complete original text and
    // original genuine replay ID inside a transparent diagnostic
    // append-only artifact with FAILED execution, not fake SUCCEEDED.
    // The explicit Publish Gate will reject this latest artifact until
    // a genuine new replay of normalized article bytes is available.
    const recovery={
      version:"DETERMINISTIC_FORMATTING_RECOVERY_V1",
      originalArticle:original,
      originalArticleId:articleId,briefId,
      originalStatus:article.status,
      originalPublishError:article.publishError,
      originalUpdatedAt:article.updatedAt.toISOString(),
      originalReplayArtifactId:replay.id,
      originalReplayFingerprint:oldFingerprint,
      normalizedFingerprint:newFingerprint,
      checkpointHash,
      checkpointVerified,
      normalizationAlgorithm:"CANONICAL_PROSE_WHITESPACE_V1",
      changedLines,
      equivalentReaderWords:audit.wordCount,
      runSource:checkpointVerified?
        "EXACT_POST_FINAL_REPLAY_CHECKPOINT":
        "PERSISTED_ORIGINAL_POST_CRITIC_REPLAY",
      publicationGate:"MUST_REPLAY_NORMALIZED_TEXT_BEFORE_PUBLISH",
    };
    const result=await prisma.$transaction(async tx=>{
      const [now,nowSnapshot,latestReplay]=await Promise.all([
        tx.contentArticle.findUnique({where:{id:articleId}}),
        tx.contentEvidenceSnapshot.findUnique({where:{briefId},select:{plan:true}}),
        tx.serpReplayArtifact.findFirst({
          where:{contentArticleId:articleId},
          orderBy:[{createdAt:"desc"},{id:"desc"}],
        }),
      ]);
      check(now&&nowSnapshot&&latestReplay&&now.briefId===briefId &&
        now.status==="REJECTED"&&!now.publishedAt&&!now.publishedUrl &&
        now.updatedAt.getTime()===article.updatedAt.getTime() &&
        now.publishError===article.publishError &&
        hash(JSON.stringify(fields(now)))===hash(JSON.stringify(original)) &&
        isDeepStrictEqual(nowSnapshot.plan,snapshot.plan) &&
        latestReplay.id===replay.id &&
        latestReplay.articleFingerprint===oldFingerprint,
        "RECOVERY_DATA_CHANGED_BEFORE_COMMIT");
      const update=await tx.contentArticle.updateMany({
        where:{id:articleId,briefId,status:"REJECTED",
          updatedAt:article.updatedAt,publishError:article.publishError},
        data:{bodyMarkdown:cleaned,status:"IN_REVIEW",publishError:null},
      });
      check(update.count===1,"RECOVERY_COMPARE_AND_SWAP_FAILED");
      const diagnostic=await tx.serpReplayArtifact.create({
        data:{
          contentArticleId:articleId,
          artifactVersion:"SERP_REPLAY_ARTIFACT_V1",
          replayVersion:"SERP_REPLAY_V1",
          executionStatus:"FAILED",
          replayStatus:null,
          articleFingerprint:newFingerprint,
          articleFingerprintAlgo:"SHA256_V1",
          keyword:replay.keyword,
          serpSnapshotFingerprint:replay.serpSnapshotFingerprint,
          serpCapturedAt:replay.serpCapturedAt,
          comparisons:Prisma.DbNull,
          blockers:Prisma.DbNull,
          warnings:Prisma.DbNull,
          provenance:jsonValue(recovery),
          errorMessage:"SERP_REPLAY_REQUIRED_AFTER_SAFE_WHITESPACE_NORMALIZATION",
        },
      });
      return diagnostic.id;
    },{
      isolationLevel:Prisma.TransactionIsolationLevel.Serializable,
      maxWait:10000,timeout:30000,
    });
    const [after,latestReplay]=await Promise.all([
      prisma.contentArticle.findUnique({where:{id:articleId}}),
      prisma.serpReplayArtifact.findFirst({
        where:{contentArticleId:articleId},
        orderBy:[{createdAt:"desc"},{id:"desc"}],
      }),
    ]);
    check(after?.status==="IN_REVIEW"&&
      hash(JSON.stringify(fields(after)))===hash(JSON.stringify(proposed)) &&
      latestReplay?.id===result &&latestReplay.executionStatus==="FAILED" &&
      latestReplay.articleFingerprint===newFingerprint,
      "RECOVERY_POST_COMMIT_VERIFICATION_FAILED");
    console.log(JSON.stringify({
      result:"ARTICLE_FORMATTING_RECOVERED_IN_REVIEW",
      briefId,articleId,status:"IN_REVIEW",
      words:audit.wordCount,
      originalTextArchived:true,
      currentFingerprint:newFingerprint,
      oldRealReplayPreserved:replay.id,
      newDiagnosticReplayArtifactId:result,
      publishGate:"REVALIDATION_REQUIRED",
      noWriterCalls:true,newAiCalls:0,published:false,
    },null,2));
  }finally{
    await prisma.$disconnect();
  }
}
main().catch(error=>{
  console.error("WHITESPACE_RECOVERY_STOPPED:",errored(error));
  process.exitCode=1;
});
