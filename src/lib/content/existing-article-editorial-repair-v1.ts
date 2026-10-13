/**
 * EXISTING_ARTICLE_EDITORIAL_RECOVERY_V1
 *
 * Explicit user-triggered repair of one saved IN_REVIEW article, not a
 * fresh brief/research/Writer. Reuses genuine saved Evidence, the exact
 * post-final-replay checkpoint, and the existing production section repair.
 *
 * Physical model calls: <=10; model repair calls: <=1.
 * Any failure leaves the entire ContentArticle and its replay untouched.
 * Only a fully source-supported, 9-critic-accepted, SERP-compared version
 * may be committed. Original article is archived in append-only provenance.
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { geminiGenerator } from "./gemini-generator";
import { createContentRunBudgetV1, withContentRunBudgetV1 } from "./content-run-budget-v1";
import { assertStoredPublicationEvidenceV1 } from "./stored-publication-evidence-gate-v1";
import { inspectMasterRuntimeSnapshot } from "./master-runtime-adapter";
import { parsePersistedArticleExecutionPlanV1, bindArticleExecutionPlanToGenerationContractV1 } from "./article-execution-plan-binding-v1";
import { buildArticleGenerationContractV1 } from "./article-generation-contract";
import { buildMasterArticleSemanticCriticContextV1 } from "./master-article-semantic-critic-context";
import { buildCrawlCannibalizationCandidatesV1 } from "./crawl-cannibalization-context";
import { detectPersistedArticleEditorialRepetitionV1 } from "./editorial-repetition-guard-v1";
import { normalizeMasterArticleProseSpacesV1 } from "./article-prose-whitespace-v1";
import { executeMasterArticleCriticsV1, assertMasterArticleCriticExecutionPassed } from "./master-article-critic-fusion";
import { executeMasterArticleCriticRepairReplayV1 } from "./master-article-critic-repair-execution";
import { executeSerpReplayV1 } from "./serp-replay";
import { buildSerpReplayArticleFingerprintV1 } from "./serp-replay-fingerprint";
import { auditArticle } from "./content-quality";
import { evaluateContentGate } from "./content-gate";
import { analyzeArticleAgainstPlan } from "./content-plan-analysis";
import { evaluateArticlePublicationPolicy } from "./article-publication-policy";
import { getBusinessFactRegistryForBrief } from "./evidence-snapshot";
import { buildProductionFinalArticleReadinessV1 } from "./production-final-article-readiness-adapter-v1";
import type { MasterWriterRunV1 } from "./master-writer-orchestrator";

function check(condition:unknown,code:string):asserts condition{
  if(!condition)throw new Error(code);
}
function record(value:unknown):Record<string,unknown>{
  check(value!==null&&typeof value==="object"&&!Array.isArray(value),
    "SAVED_EDITORIAL_CHECKPOINT_INVALID_RECORD");
  return value as Record<string,unknown>;
}
const sha=(value:string)=>createHash("sha256").update(value,"utf8").digest("hex");
function articleShape(source:{title:string;metaDescription:string;h1:string;bodyMarkdown:string}){
  return {title:source.title,metaDescription:source.metaDescription,
    h1:source.h1,bodyMarkdown:source.bodyMarkdown};
}
function json(value:unknown):Prisma.InputJsonValue{
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
function checkpointDir(){
  return resolve(process.env.GROWTH_OS_ARTICLE_CHECKPOINT_DIR?.trim() ||
    join(process.cwd(),".growth-os-tmp/article-checkpoints"));
}
function sameArticle(a:ReturnType<typeof articleShape>,
  b:ReturnType<typeof articleShape>){
  return a.title===b.title&&a.metaDescription===b.metaDescription&&
    a.h1===b.h1&&a.bodyMarkdown===b.bodyMarkdown;
}
const active=new Set<string>();

export async function repairExistingArticleEditorialV1(articleId:string,
  expectedUpdatedAt:string){
  check(/^[a-z0-9_-]{5,100}$/i.test(articleId),
    "SAVED_EDITORIAL_INVALID_ARTICLE_ID");
  check(typeof expectedUpdatedAt==="string"&&
    Number.isFinite(Date.parse(expectedUpdatedAt)),
    "SAVED_EDITORIAL_EXPECTED_VERSION_REQUIRED");
  if(active.has(articleId)){
    throw new Error("SAVED_EDITORIAL_RECOVERY_ALREADY_RUNNING");
  }
  active.add(articleId);
  try{
    const original=await prisma.contentArticle.findUnique({
      where:{id:articleId},
      include:{brief:{select:{
        id:true,websiteId:true,primaryKeyword:true,
        secondaryKeywords:true,website:{select:{url:true}},
      }}},
    });
    check(original && original.status==="IN_REVIEW" &&
      !original.publishedAt && !original.publishedUrl &&
      original.updatedAt.getTime()===Date.parse(expectedUpdatedAt),
      "SAVED_EDITORIAL_ARTICLE_STATE_CHANGED");
    check(detectPersistedArticleEditorialRepetitionV1(
      original.bodyMarkdown).length>0,
      "SAVED_EDITORIAL_NOT_A_REPETITION_REPAIR_TARGET");

    const snap=await prisma.contentEvidenceSnapshot.findUnique({
      where:{briefId:original.briefId},select:{plan:true},
    });
    check(snap,"SAVED_EDITORIAL_EVIDENCE_NOT_FOUND");
    assertStoredPublicationEvidenceV1(snap.plan);
    const inspection=inspectMasterRuntimeSnapshot(snap.plan);
    check(inspection.runtime,"SAVED_EDITORIAL_MASTER_RUNTIME_INVALID");
    const runtime=inspection.runtime;
    const plan=parsePersistedArticleExecutionPlanV1(
      record(snap.plan).articleExecutionPlan);
    const contract=bindArticleExecutionPlanToGenerationContractV1({
      plan,contract:buildArticleGenerationContractV1(runtime),
    });

    const dir=checkpointDir();
    const path=join(dir,articleId+"-POST_FINAL_REPLAY.json");
    let raw:string;
    try{raw=await readFile(path,"utf8");}
    catch{throw new Error("SAVED_EDITORIAL_FINAL_CHECKPOINT_REQUIRED");}
    const payload=record(JSON.parse(raw)),cp=record(payload.checkpoint);
    check(payload.sha256===sha(JSON.stringify(cp)) &&
      cp.version==="ARTICLE_RECOVERY_CHECKPOINT_V1" &&
      cp.stage==="POST_FINAL_REPLAY"&&cp.articleId===articleId &&
      cp.briefId===original.briefId,
      "SAVED_EDITORIAL_FINAL_CHECKPOINT_HASH_OR_SCOPE_MISMATCH");
    const savedRun=record(cp.writerRun);
    check(savedRun.version==="MASTER_WRITER_RUN_V1" &&
      Array.isArray(savedRun.sections) &&
      savedRun.sections.length===contract.sectionContracts.length,
      "SAVED_EDITORIAL_WRITER_RUN_INVALID");
    const run=savedRun as unknown as MasterWriterRunV1;
    const initial=articleShape(original);
    const fromCheckpoint=articleShape(run.article);
    check(fromCheckpoint.title===initial.title &&
      fromCheckpoint.metaDescription===initial.metaDescription &&
      fromCheckpoint.h1===initial.h1 &&
      normalizeMasterArticleProseSpacesV1(fromCheckpoint.bodyMarkdown)===
        initial.bodyMarkdown,
      "SAVED_EDITORIAL_CHECKPOINT_ARTICLE_VERSION_MISMATCH");

    const storedCtx=buildMasterArticleSemanticCriticContextV1(runtime);
    const fallbackCandidates=storedCtx.cannibalizationCandidates.length
      ? [] : await buildCrawlCannibalizationCandidatesV1({
        websiteId:original.brief.websiteId,
      });
    const context={
      ...storedCtx,
      rankReadyKeywords:[
        original.brief.primaryKeyword,...original.brief.secondaryKeywords,
      ],
      cannibalizationCandidates:
        storedCtx.cannibalizationCandidates.length
          ? storedCtx.cannibalizationCandidates : fallbackCandidates,
    };
    check(context.cannibalizationCandidates.length>0,
      "SAVED_EDITORIAL_REAL_CRAWL_CONTEXT_REQUIRED");

    const budget=createContentRunBudgetV1({
      maxModelCalls:10,maxEstimatedInputTokens:60000,
      maxRepairCalls:1,
    });
    const generator=withContentRunBudgetV1({
      generator:geminiGenerator,budget,
    });
    // Baseline full critic re-evaluation is necessary: old checkpoints
    // predate the stricter editorial policy.
    const beforeCritics=await executeMasterArticleCriticsV1({
      contract,run,generator,context,
    });
    check(beforeCritics.suite.status==="BLOCK" &&
      beforeCritics.suite.results.some(item=>
        item.criticId==="EDITORIAL"&&
        item.findings.some(f=>
          f.code==="EDITORIAL_RECYCLED_ADVICE_ACROSS_SECTIONS" ||
          f.code==="EDITORIAL_REPEATED_PARAGRAPH_ACROSS_SECTIONS")),
      "SAVED_EDITORIAL_NEW_CRITIC_NOT_REPRODUCED");

    const repaired=await executeMasterArticleCriticRepairReplayV1({
      contract,run,initialCritics:beforeCritics,generator,context,
    });
    assertMasterArticleCriticExecutionPassed(repaired.finalCritics);
    check(repaired.finalCritics.suite.status!=="BLOCK" &&
      repaired.provenance.wholeArticleRewriteCount===0 &&
      repaired.provenance.repairedSectionCount>=1 &&
      repaired.provenance.repairAttemptCount<=1,
      "SAVED_EDITORIAL_BOUNDED_REPAIR_FAILED");
    const candidate=articleShape(repaired.run.article);
    check(!sameArticle(initial,candidate)&&candidate.title===initial.title &&
      candidate.h1===initial.h1 &&
      normalizeMasterArticleProseSpacesV1(candidate.bodyMarkdown)===
        candidate.bodyMarkdown &&
      detectPersistedArticleEditorialRepetitionV1(
        candidate.bodyMarkdown).length===0,
      "SAVED_EDITORIAL_CANDIDATE_NOT_ACTUALLY_FIXED");

    const audit=auditArticle({article:candidate,
      primaryKeyword:original.brief.primaryKeyword});
    const intelligence=analyzeArticleAgainstPlan({
      ...candidate,plan:snap.plan,
      primaryKeyword:original.brief.primaryKeyword,
      secondaryKeywords:original.brief.secondaryKeywords,
    });
    const originalIntelligence=analyzeArticleAgainstPlan({
      ...initial,plan:snap.plan,
      primaryKeyword:original.brief.primaryKeyword,
      secondaryKeywords:original.brief.secondaryKeywords,
    });
    check(
      intelligence.article.keywordCoverage.used>=
        originalIntelligence.article.keywordCoverage.used &&
      intelligence.article.keywordCoverage.missing<=
        originalIntelligence.article.keywordCoverage.missing,
      "SAVED_EDITORIAL_KEYWORD_COVERAGE_REGRESSED"
    );
    const initialAudit=auditArticle({article:initial,
      primaryKeyword:original.brief.primaryKeyword});
    check(audit.h2Count===initialAudit.h2Count &&
      audit.h3Count===initialAudit.h3Count,
      "SAVED_EDITORIAL_HEADING_STRUCTURE_DRIFT");

    const registry=await getBusinessFactRegistryForBrief({
      briefId:original.briefId,websiteId:original.brief.websiteId,
    });
    const content=evaluateContentGate({
      article:candidate,primaryKeyword:original.brief.primaryKeyword,
      audit,registry,
    });
    const publication=evaluateArticlePublicationPolicy({
      article:candidate,intelligence,
    });
    check(content.pass&&publication.pass,
      "SAVED_EDITORIAL_FINAL_CONTENT_OR_POLICY_BLOCKED");

    // Compare the exact repaired bytes with real saved SERP evidence.
    // It can use model calls, but never runs new research/Writer.
    let siteDomain:string|null=null;
    try{siteDomain=new URL(original.brief.website.url).hostname;}catch{}
    const replay=await executeSerpReplayV1({
      runtime,run:repaired.run,generator,siteDomain,
    });
    check(["READY","WARN"].includes(replay.status)&&
      replay.blockers.length===0 &&
      replay.serpSnapshotFingerprint!==null &&
      replay.serpCapturedAt!==null &&
      replay.comparisons.length>0,
      "SAVED_EDITORIAL_FRESH_REPLAY_NOT_READY");

    const readiness=buildProductionFinalArticleReadinessV1({
      plan,writerRun:repaired.run,finalCritics:repaired.finalCritics,
      articleBodyMarkdown:candidate.bodyMarkdown,
      contentGatePass:content.pass,publicationPolicyPass:publication.pass,
      serpReplay:replay,serpReplayWarning:null,
    });
    check(readiness.status==="PASS"||readiness.status==="WARN",
      "SAVED_EDITORIAL_FINAL_READINESS_BLOCKED");
    const fingerprint=buildSerpReplayArticleFingerprintV1(candidate);
    const oldFingerprint=buildSerpReplayArticleFingerprintV1(initial);
    const priorReplay=await prisma.serpReplayArtifact.findFirst({
      where:{contentArticleId:articleId},
      orderBy:[{createdAt:"desc"},{id:"desc"}],
    });

    const committed=await prisma.$transaction(async tx=>{
      const [actual,evidence,previousReplay]=await Promise.all([
        tx.contentArticle.findUnique({where:{id:articleId}}),
        tx.contentEvidenceSnapshot.findUnique({
          where:{briefId:original.briefId},select:{plan:true},
        }),
        tx.serpReplayArtifact.findFirst({
          where:{contentArticleId:articleId},
          orderBy:[{createdAt:"desc"},{id:"desc"}],
        }),
      ]);
      check(actual&&evidence&&actual.status==="IN_REVIEW"&&
        actual.updatedAt.getTime()===original.updatedAt.getTime() &&
        sameArticle(articleShape(actual),initial) &&
        sha(JSON.stringify(evidence.plan))===sha(JSON.stringify(snap.plan)) &&
        (previousReplay?.id??null)===(priorReplay?.id??null),
        "SAVED_EDITORIAL_CONCURRENT_ARTICLE_OR_EVIDENCE_CHANGE");
      const cas=await tx.contentArticle.updateMany({
        where:{id:articleId,briefId:original.briefId,
          status:"IN_REVIEW",updatedAt:original.updatedAt},
        data:{title:candidate.title,metaDescription:candidate.metaDescription,
          h1:candidate.h1,bodyMarkdown:candidate.bodyMarkdown,
          publishError:null},
      });
      check(cas.count===1,"SAVED_EDITORIAL_CAS_FAILED");
      const artifact=await tx.serpReplayArtifact.create({
        data:{
          contentArticleId:articleId,
          artifactVersion:"SERP_REPLAY_ARTIFACT_V1",
          replayVersion:"SERP_REPLAY_V1",
          executionStatus:"SUCCEEDED",
          replayStatus:replay.status,
          articleFingerprint:fingerprint,
          articleFingerprintAlgo:"SHA256_V1",
          keyword:replay.keyword,
          serpSnapshotFingerprint:replay.serpSnapshotFingerprint,
          serpCapturedAt:replay.serpCapturedAt,
          comparisons:json(replay.comparisons),
          blockers:json(replay.blockers),
          warnings:json(replay.warnings),
          provenance:json({
            ...replay.provenance,
            editorialRecovery:{
              version:"SAVED_EDITORIAL_RECOVERY_V1",
              previousArticle:initial,
              previousStatus:original.status,
              previousArticleUpdatedAt:original.updatedAt.toISOString(),
              previousFingerprint:oldFingerprint,
              previousReplayArtifactId:priorReplay?.id??null,
              evidenceSnapshotSha256:sha(JSON.stringify(snap.plan)),
              checkpointSha256:payload.sha256,
              initialCriticStatus:beforeCritics.suite.status,
              finalCriticStatus:repaired.finalCritics.suite.status,
              repairSections:repaired.repairs.map(x=>x.sectionIndex),
              readinessStatus:readiness.status,
              budget:budget.snapshot(),
            },
          }),
          errorMessage:null,
        },
      });
      return artifact.id;
    },{
      isolationLevel:Prisma.TransactionIsolationLevel.Serializable,
      maxWait:10000,timeout:30000,
    });
    return {
      articleId,status:"IN_REVIEW" as const,
      result:"ARTICLE_EDITORIAL_SELF_REPAIR_APPLIED" as const,
      newFingerprint:fingerprint,
      oldFingerprint,
      replayArtifactId:committed,
      repairedSections:repaired.repairs.map(x=>x.sectionIndex),
      readerWords:audit.wordCount,
      editorialFindings:0,
      criticStatus:repaired.finalCritics.suite.status,
      replayStatus:replay.status,
      readinessStatus:readiness.status,
      budget:budget.snapshot(),
      article:candidate,
    };
  } finally {
    active.delete(articleId);
  }
}
