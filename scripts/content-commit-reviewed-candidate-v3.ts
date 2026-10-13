/**
 * Commit ONE fully reviewed saved article to IN_REVIEW, atomically.
 * Default is read-only. --commit requires explicit environment opt-in.
 *
 * No AI, search, Writer or publication. Previous article and Evidence
 * snapshot are archived in the append-only replay artifact's provenance
 * IN THE SAME TRANSACTION as the replacement article, Evidence and replay.
 */
import { loadEnvConfig } from "@next/env";
import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
loadEnvConfig(process.env.GROWTH_OS_ENV_ROOT?.trim() || process.cwd());

const hash=(s:string)=>createHash("sha256").update(s,"utf8").digest("hex");
function guard(x:unknown,why:string):asserts x {if(!x)throw new Error(why)}
function obj(x:unknown):Record<string,any>{
  guard(!!x&&typeof x==="object"&&!Array.isArray(x),"INVALID_RECORD");
  return x as Record<string,any>;
}
function json(x:unknown):Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(x)) as Prisma.InputJsonValue;
}
function failMessage(e:unknown):string{return e instanceof Error?e.message:String(e)}

async function main(){
  const [briefId,articleId,mode]=process.argv.slice(2);
  const commit=mode==="--commit";
  guard((mode===undefined||commit) &&
    [briefId,articleId].every(x=>/^[a-zA-Z0-9_-]{1,100}$/.test(x??"")),
    "USAGE: tsx scripts/content-commit-reviewed-candidate-v3.ts BRIEF_ID ARTICLE_ID [--commit]");
  guard(!commit||process.env.GROWTH_OS_COMMIT_REVIEWED_V3==="1",
    "EXPLICIT_COMMIT_OPT_IN_REQUIRED");
  const folder=resolve(process.env.GROWTH_OS_REVIEW_ARTIFACT_DIR?.trim() ||
    ".growth-os-tmp/final-article-closure");
  const cpFolder=resolve(process.env.GROWTH_OS_ARTICLE_CHECKPOINT_DIR ||
    ".growth-os-tmp/article-checkpoints");
  const prefix=join(folder,articleId);
  const [reviewRaw,v3Raw,md,v2Raw,v1Raw,oldManifestRaw,cpRaw]=await Promise.all([
    readFile(prefix+"-SUPPORTED-CANDIDATE-V3-REVIEW-R2.json","utf8"),
    readFile(prefix+"-SUPPORTED-CANDIDATE-V3.json","utf8"),
    readFile(prefix+"-SUPPORTED-CANDIDATE-V3.md","utf8"),
    readFile(prefix+"-STAGED-EVIDENCE-EXPANSION-V2.json","utf8"),
    readFile(prefix+"-STAGED-EVIDENCE-REVISION.json","utf8"),
    readFile(prefix+"-REVIEW-CANDIDATE.json","utf8"),
    readFile(join(cpFolder,articleId+"-POST_WRITER.json"),"utf8"),
  ]);
  const review=obj(JSON.parse(reviewRaw)), v3=obj(JSON.parse(v3Raw));
  const v2=obj(JSON.parse(v2Raw)),v1=obj(JSON.parse(v1Raw));
  const oldManifest=obj(JSON.parse(oldManifestRaw));
  const cpSaved=obj(JSON.parse(cpRaw)),cp=obj(cpSaved.checkpoint);
  guard(cpSaved.sha256===hash(JSON.stringify(cp)) &&
    cp.stage==="POST_WRITER"&&cp.version==="ARTICLE_RECOVERY_CHECKPOINT_V1" &&
    cp.briefId===briefId&&cp.articleId===articleId &&
    v3.briefId===briefId&&v3.articleId===articleId &&
    v2.briefId===briefId&&v2.articleId===articleId &&
    v1.briefId===briefId&&v1.articleId===articleId &&
    review.briefId===briefId&&review.articleId===articleId &&
    v1.sourceCheckpointSha256===cpSaved.sha256 &&
    v2.sourceCheckpointSha256===cpSaved.sha256 &&
    v3.sourceCheckpointSha256===cpSaved.sha256 &&
    review.sourceCheckpointSha256===cpSaved.sha256 &&
    v2.priorStageSha256===hash(v1Raw) &&
    v3.evidenceExpansionSha256===hash(v2Raw) &&
    review.stagedEvidenceSha256===hash(JSON.stringify(v2.stagedSnapshot)),
    "RECOVERY_VERSION_CHAIN_MISMATCH");
  guard(v3.version==="SUPPORTED_SCORE_CANDIDATE_V3" &&
    v3.status==="NOT_PERSISTED_NOT_SEMANTICALLY_APPROVED" &&
    v2.version==="STAGED_SCORE_EVIDENCE_EXPANSION_V2" &&
    v2.status==="NOT_PERSISTED_NOT_READY_FOR_REVIEW" &&
    review.version==="EXACT_SAVED_ARTICLE_FINAL_REVIEW_V1" &&
    review.candidateMode==="V3_SUPPORTED_SECTION" &&
    review.status==="READY_FOR_CONTROLLED_PERSISTENCE" &&
    review.error===null &&
    v3.contentGate==="PASS"&&v3.publicationPolicy==="PASS" &&
    v2.preWriterGate==="PASS"&&v2.sourceEvidenceGate==="PASS" &&
    Array.isArray(v2.verified)&&v2.verified.length===6 &&
    Array.isArray(v2.unverified)&&v2.unverified.length===0,
    "RECOVERY_REVIEW_OR_EVIDENCE_NOT_APPROVED");
  const semantic=obj(review.semanticVerification);
  const critics=obj(review.finalCritics), replay=obj(review.serpReplay);
  const readiness=obj(review.readiness);
  guard((semantic.status==="PASS"||semantic.status==="WARN") &&
    semantic.sectionIndex===3 &&
    semantic.version==="SECTION_SEMANTIC_VERIFICATION_V1" &&
    Array.isArray(semantic.units) && semantic.unitCount===semantic.units.length &&
    semantic.counts?.unsupported===0&&semantic.counts?.contradicted===0 &&
    critics.version==="MASTER_ARTICLE_CRITIC_EXECUTION_V1" &&
    critics.provenance?.finalCriticCount===9 &&
    (critics.suite?.status==="PASS"||critics.suite?.status==="WARN") &&
    Array.isArray(critics.suite?.findings) &&
    critics.suite.findings.every((x:any)=>x.severity!=="BLOCK") &&
    replay.version==="SERP_REPLAY_V1" &&
    (replay.status==="READY"||replay.status==="WARN") &&
    Array.isArray(replay.comparisons) &&
    Array.isArray(replay.warnings) &&
    Array.isArray(replay.blockers) && replay.blockers.length===0 &&
    (readiness.status==="PASS"||readiness.status==="WARN") &&
    Array.isArray(readiness.blockers) && readiness.blockers.length===0 &&
    review.modelBudget?.modelCalls<=4 &&
    review.modelBudget?.repairCalls===0 &&
    review.modelBudget?.estimatedInputTokens<=65000,
    "FINAL_CRITIC_SEMANTIC_REPLAY_OR_READINESS_NOT_ACCEPTED");
  const heading=/^# ([^\r\n]+)\r?\n(?:\r?\n)*/.exec(md);
  guard(heading&&heading[1].trim()===cp.writerRun.shell.h1.trim(),"V3_H1_INVALID");
  const body=md.slice(heading[0].length).trimEnd();
  guard(!/^#\s+/m.test(body),"V3_BODY_LEVEL_ONE_HEADING");
  const candidate={
    title:cp.writerRun.shell.title as string,
    metaDescription:cp.writerRun.shell.metaDescription as string,
    h1:cp.writerRun.shell.h1 as string,
    bodyMarkdown:body,
  };
  const candidateHash=hash(JSON.stringify(candidate));
  guard(candidateHash===v3.candidateArticleSha256 &&
    candidateHash===review.candidateSha256 &&
    hash(JSON.stringify(review.article))===candidateHash &&
    v3.checkpointSha256===cpSaved.sha256 &&
    v3.changedSectionIndexes?.length===1 &&
    v3.changedSectionIndexes[0]===3 &&
    oldManifest.sourceCheckpointSha256===cpSaved.sha256,
    "FINAL_CANDIDATE_ARTICLE_HASH_MISMATCH");
  const original=cp.writerRun.sections as Array<{heading:string;bodyMarkdown:string}>;
  guard(original.length===5&&v3.originalSectionHashes?.length===5&&
    original.every((sec,i)=>hash(sec.bodyMarkdown)===v3.originalSectionHashes[i]) &&
    original[3].heading==="Does Credit Monitoring Affect Your Credit Score?",
    "ORIGINAL_WRITER_SECTION_INTEGRITY_FAILED");
  const startMarker="## "+original[3].heading+"\n\n";
  const endMarker="\n\n## "+original[4].heading+"\n\n";
  const scoreStart=body.indexOf(startMarker),scoreEnd=body.indexOf(endMarker,scoreStart+startMarker.length);
  guard(scoreStart>=0&&scoreEnd>scoreStart &&
    original.every((sec,i)=>i===3||body.includes("## "+sec.heading+"\n\n"+sec.bodyMarkdown)),
    "V3_SECTION_SCOPE_INVALID");
  const scoreBody=body.slice(scoreStart+startMarker.length,scoreEnd);
  guard(hash(scoreBody)===v3.scoreSectionBodySha256,
    "V3_TARGET_SECTION_HASH_INVALID");
  const sourceSnapshot=obj(v2.stagedSnapshot);
  const targetSection=obj(sourceSnapshot.articleExecutionPlan.sections[3]);
  const targetBlueprint=obj(sourceSnapshot.masterRuntime.sectionBlueprints.sections[3]);
  guard(targetSection.heading===original[3].heading &&
    targetBlueprint.heading===original[3].heading &&
    v3.liveVerifiedClaimIds?.length===7 &&
    v3.liveVerifiedClaimIds.every((id:string)=>
      targetSection.requiredClaimIds.includes(id)&&
      targetBlueprint.requiredClaims.includes(id)&&
      sourceSnapshot.masterRuntime.claimLedger.claims.some((c:any)=>
        c.id===id&&c.status==="VERIFIED")),
    "FINAL_SEVEN_CLAIMS_NOT_VERSIONED");

  const {assertStoredPublicationEvidenceV1}=
    await import("../src/lib/content/stored-publication-evidence-gate-v1");
  const {inspectMasterRuntimeSnapshot}=
    await import("../src/lib/content/master-runtime-adapter");
  const {parsePersistedArticleExecutionPlanV1}=
    await import("../src/lib/content/article-execution-plan-binding-v1");
  const {assertArticlePreWriterEvidenceReadyV1,
    assertArticlePreWriterRequiredCoverageV1,
    assertArticlePreWriterAnswerSupportV2}=
    await import("../src/lib/content/article-prewriter-evidence-gate-v1");
  const {auditArticle}=await import("../src/lib/content/content-quality");
  const {analyzeArticleAgainstPlan}=
    await import("../src/lib/content/content-plan-analysis");
  const {evaluateContentGate}=await import("../src/lib/content/content-gate");
  const {evaluateArticlePublicationPolicy}=
    await import("../src/lib/content/article-publication-policy");
  const {getBusinessFactRegistryForBrief}=
    await import("../src/lib/content/evidence-snapshot");
  const {buildSerpReplayArticleFingerprintV1}=
    await import("../src/lib/content/serp-replay-fingerprint");
  const {evaluateExplicitPublishGateV1}=
    await import("../src/lib/content/publish-gate");
  assertStoredPublicationEvidenceV1(sourceSnapshot);
  guard(inspectMasterRuntimeSnapshot(sourceSnapshot).runtime,
    "STAGED_RUNTIME_NOT_VALID");
  const plan=parsePersistedArticleExecutionPlanV1(sourceSnapshot.articleExecutionPlan);
  assertArticlePreWriterEvidenceReadyV1(plan);
  assertArticlePreWriterRequiredCoverageV1(plan);
  assertArticlePreWriterAnswerSupportV2(plan);

  const serpFingerprint=buildSerpReplayArticleFingerprintV1(candidate);
  const replayDate=replay.serpCapturedAt===null?null:new Date(replay.serpCapturedAt);
  guard(replayDate===null||Number.isFinite(replayDate.getTime()),
    "REPLAY_CAPTURE_DATE_INVALID");
  const publishGate=evaluateExplicitPublishGateV1({
    article:candidate,
    replayArtifact:{
      id:"preflight-only",
      executionStatus:"SUCCEEDED",
      replayStatus:replay.status,
      articleFingerprint:serpFingerprint,
      articleFingerprintAlgo:"SHA256_V1",
      blockers:replay.blockers,
      warnings:replay.warnings,
    },
    existingGates:{contentGatePassed:true,publicationPolicyPassed:true},
  });
  guard(publishGate.pass&&publishGate.blockers.length===0,
    "EXPLICIT_PUBLISH_GATE_BLOCKED");

  const {prisma}=await import("../src/lib/prisma");
  try{
    const [current,existingSnapshot,brief]=await Promise.all([
      prisma.contentArticle.findUnique({
        where:{id:articleId},
      }),
      prisma.contentEvidenceSnapshot.findUnique({
        where:{briefId},
      }),
      prisma.contentBrief.findUnique({
        where:{id:briefId},
        select:{primaryKeyword:true,secondaryKeywords:true,websiteId:true},
      }),
    ]);
    guard(brief&&current&&existingSnapshot&&current.briefId===briefId&&
      current.status==="REJECTED"&&current.publishedAt===null&&
      current.publishedUrl===null&&
      hash(JSON.stringify(existingSnapshot.plan))===v2.originalPlanSha256,
      "PERSISTED_ARTICLE_OR_ORIGINAL_PLAN_DRIFT");

    const audit=auditArticle({article:candidate,primaryKeyword:brief.primaryKeyword});
    const intelligence=analyzeArticleAgainstPlan({
      ...candidate,
      primaryKeyword:brief.primaryKeyword,
      secondaryKeywords:brief.secondaryKeywords,
      plan:sourceSnapshot,
    });
    const registry=await getBusinessFactRegistryForBrief({
      briefId,websiteId:brief.websiteId,
    });
    const contentGate=evaluateContentGate({
      article:candidate,primaryKeyword:brief.primaryKeyword,audit,registry,
    });
    const policy=evaluateArticlePublicationPolicy({
      article:candidate,intelligence,
    });
    guard(contentGate.pass&&policy.pass,
      "RECHECKED_CONTENT_OR_PUBLICATION_GATE_FAILED");
    // A genuine replay is stored, NOT the synthetic replay preflight object.
    // Its provenance also archives the original row and whole Evidence plan.
    const recovery={
      version:"CONTROLLED_ARTICLE_RECOVERY_V1",
      briefId,articleId,
      sourceCheckpointSha256:cpSaved.sha256,
      reviewReportSha256:hash(reviewRaw),
      candidateArticleSha256:candidateHash,
      originalEvidencePlanSha256:v2.originalPlanSha256,
      stageEvidenceSha256:hash(v2Raw),
      semanticStatus:semantic.status,
      criticStatus:critics.suite.status,
      finalReadinessStatus:readiness.status,
      reviewWarn:readiness.warnings??[],
      originalArticle:{
        id:current.id,
        title:current.title,
        h1:current.h1,
        metaDescription:current.metaDescription,
        bodyMarkdown:current.bodyMarkdown,
        status:current.status,
        generatedBy:current.generatedBy,
        publishError:current.publishError,
        updatedAt:current.updatedAt.toISOString(),
      },
      originalEvidencePlan:existingSnapshot.plan,
      semanticVerification:semantic,
      fullMasterCritics:critics,
      finalReadiness:readiness,
    };
    console.log(JSON.stringify({
      mode:commit?"COMMIT_EXPLICITLY_REQUESTED":"READ_ONLY_FINAL_PERSISTENCE_PREFLIGHT",
      articleId,briefId,
      fromStatus:current.status,toStatus:"IN_REVIEW",
      candidateArticleSha256:candidateHash,
      serpReplayArticleFingerprint:serpFingerprint,
      semanticStatus:semantic.status,
      criticStatus:critics.suite.status,
      replayStatus:replay.status,
      readinessStatus:readiness.status,
      contentGate:"PASS",publicationPolicy:"PASS",
      finalWarnings:readiness.warnings??[],
      replayWarnings:replay.warnings,
      previousEvidenceArchivedInReplayProvenance:true,
      previousArticleArchivedInReplayProvenance:true,
      originalCheckpointPreserved:true,
      candidateWordCount:audit.wordCount,
      commit,
      databaseUnchanged:!commit,
    },null,2));
    if(!commit)return;

    const archived=await prisma.$transaction(async tx=>{
      const [tArticle,tSnapshot]=await Promise.all([
        tx.contentArticle.findUnique({where:{id:articleId}}),
        tx.contentEvidenceSnapshot.findUnique({where:{briefId}}),
      ]);
      guard(tArticle&&tSnapshot&&tArticle.briefId===briefId &&
        tArticle.status==="REJECTED"&&
        tArticle.publishedAt===null&&tArticle.publishedUrl===null &&
        tArticle.updatedAt.getTime()===current.updatedAt.getTime() &&
        hash(JSON.stringify(tSnapshot.plan))===v2.originalPlanSha256,
        "SERIALIZABLE_STATE_CHANGED_BEFORE_COMMIT");

      const promoted=await tx.contentArticle.updateMany({
        where:{
          id:articleId,briefId,status:"REJECTED",
          updatedAt:current.updatedAt,
        },
        data:{
          title:candidate.title,
          metaDescription:candidate.metaDescription,
          h1:candidate.h1,
          bodyMarkdown:candidate.bodyMarkdown,
          status:"IN_REVIEW",
          publishError:null,
        },
      });
      guard(promoted.count===1,"ARTICLE_COMPARE_AND_SWAP_FAILED");

      await tx.contentEvidenceSnapshot.update({
        where:{briefId},
        data:{plan:json(sourceSnapshot)},
      });
      const stored=await tx.serpReplayArtifact.create({
        data:{
          contentArticleId:articleId,
          artifactVersion:"SERP_REPLAY_ARTIFACT_V1",
          replayVersion:"SERP_REPLAY_V1",
          executionStatus:"SUCCEEDED",
          replayStatus:replay.status,
          articleFingerprint:serpFingerprint,
          articleFingerprintAlgo:"SHA256_V1",
          keyword:typeof replay.keyword==="string"?replay.keyword:null,
          serpSnapshotFingerprint:
            typeof replay.serpSnapshotFingerprint==="string"?
              replay.serpSnapshotFingerprint:null,
          serpCapturedAt:replayDate,
          comparisons:json(replay.comparisons),
          blockers:json(replay.blockers),
          warnings:json(replay.warnings),
          provenance:json({...obj(replay.provenance), recovery}),
          errorMessage:null,
        },
      });
      return {articleId:promoted.count,replayArtifactId:stored.id};
    },{
      isolationLevel:Prisma.TransactionIsolationLevel.Serializable,
      maxWait:10000,
      timeout:30000,
    });
    const [latest,replayArtifact,latestPlan]=await Promise.all([
      prisma.contentArticle.findUnique({where:{id:articleId},
        select:{status:true,title:true,metaDescription:true,h1:true,bodyMarkdown:true}}),
      prisma.serpReplayArtifact.findUnique({where:{id:archived.replayArtifactId},
        select:{executionStatus:true,replayStatus:true,articleFingerprint:true}}),
      prisma.contentEvidenceSnapshot.findUnique({where:{briefId},select:{plan:true}}),
    ]);
    guard(latest?.status==="IN_REVIEW"&&
      hash(JSON.stringify({
        title:latest.title,
        metaDescription:latest.metaDescription,
        h1:latest.h1,
        bodyMarkdown:latest.bodyMarkdown,
      }))===candidateHash&&
      replayArtifact?.executionStatus==="SUCCEEDED" &&
      replayArtifact.articleFingerprint===serpFingerprint &&
      replayArtifact.replayStatus===replay.status &&
      hash(JSON.stringify(latestPlan?.plan))===hash(JSON.stringify(sourceSnapshot)),
      "POST_COMMIT_VERIFICATION_FAILED");
    console.log(JSON.stringify({
      result:"ARTICLE_V3_IN_REVIEW",
      articleId,briefId,
      status:"IN_REVIEW",
      replayArtifactId:archived.replayArtifactId,
      priorArticleAndEvidenceArchived:true,
      exactCandidateFingerprint:serpFingerprint,
      noPublication:true,
      reviewWarnings:readiness.warnings??[],
    },null,2));
  }finally{await prisma.$disconnect();}
}
main().catch(e=>{
  console.error("CONTROLLED_PERSISTENCE_FAILED:",failMessage(e));
  process.exitCode=1;
});
