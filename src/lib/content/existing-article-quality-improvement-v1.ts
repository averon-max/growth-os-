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
import { assertSectionEvidenceCapacityV1 } from "./section-evidence-capacity-v1";
import { assertStoredPublicationEvidenceV1 } from "./stored-publication-evidence-gate-v1";
import { inspectMasterRuntimeSnapshot } from "./master-runtime-adapter";
import { parsePersistedArticleExecutionPlanV1, bindArticleExecutionPlanToGenerationContractV1 } from "./article-execution-plan-binding-v1";
import { buildArticleGenerationContractV1 } from "./article-generation-contract";
import { buildMasterArticleSemanticCriticContextV1 } from "./master-article-semantic-critic-context";
import { buildCrawlCannibalizationCandidatesV1 } from "./crawl-cannibalization-context";
import { detectPersistedArticleEditorialRepetitionV1 } from "./editorial-repetition-guard-v1";
import { countWords } from "./article-analyzer";
import { resolveArticleLengthContractV1 } from "./article-length-contract-v1";
import { planSameArticleQualityImprovementV1 } from "./same-article-quality-improvement-v1";
import { countSectionWordsV1,verifyGeneratedSectionOnlyV1,
  supportsMasterSectionRepairGenerator } from "./master-section-repair";
import { supportsMasterSectionSemanticVerifier }
  from "./master-section-semantic-verifier";
import { rebuildWriterRunV1 } from "./master-article-critic-repair-execution";
import { createMasterArticleCriticFindingV1 } from "./master-article-critic";
import {inspectArchivedWriterProgressV1}
  from "./writer-recovery-archived-progress-v1";
import {rebindSignedArchivedWriterRunV1}
  from "./verified-archived-writer-run-v1";
import { normalizeMasterArticleProseSpacesV1 } from "./article-prose-whitespace-v1";
import { executeMasterArticleCriticsV1, assertMasterArticleCriticExecutionPassed } from "./master-article-critic-fusion";
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

export async function improveExistingArticleQualityV1(articleId:string,
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
    check(countWords(original.bodyMarkdown)<2000,
      "SAVED_QUALITY_ARTICLE_NOT_BELOW_DEPTH_TARGET");
    check(detectPersistedArticleEditorialRepetitionV1(
      original.bodyMarkdown).length===0,
      "SAVED_QUALITY_REPETITION_REQUIRES_SEPARATE_REPAIR");

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
    const minimumWords=resolveArticleLengthContractV1(plan).targetWords?.min;
    check(typeof minimumWords==="number",
      "SAVED_QUALITY_NOT_COMPREHENSIVE_GUIDE");
    // No extra provider call when stored research cannot support
    // the requested substantive answer. Evidence recovery belongs
    // upstream; a language-only edit must not impersonate it.
    assertSectionEvidenceCapacityV1(plan.sections);
    const contract=bindArticleExecutionPlanToGenerationContractV1({
      plan,contract:buildArticleGenerationContractV1(runtime),
    });

    const budget=createContentRunBudgetV1({
      maxModelCalls:30,maxEstimatedInputTokens:160000,maxRepairCalls:5,
    });
    const generator=withContentRunBudgetV1({generator:geminiGenerator,budget});
    check(supportsMasterSectionRepairGenerator(generator)&&
      supportsMasterSectionSemanticVerifier(generator),
      "SAVED_QUALITY_REPAIR_GENERATOR_UNAVAILABLE");
    const initial=articleShape(original);
    let run:MasterWriterRunV1|null=null;
    let checkpointSha256:string|null=null;

    // Old article-generation checkpoint (if it still matches the exact
    // currently persisted article and the current Research snapshot).
    const dir=checkpointDir();
    const path=join(dir,articleId+"-POST_FINAL_REPLAY.json");
    let raw:string|null=null;
    try{raw=await readFile(path,"utf8");}
    catch(error){
      if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;
    }
    if(raw){
      const payload=record(JSON.parse(raw)),cp=record(payload.checkpoint);
      check(payload.sha256===sha(JSON.stringify(cp)),
        "SAVED_QUALITY_FINAL_CHECKPOINT_CORRUPTED");
      if(cp.version==="ARTICLE_RECOVERY_CHECKPOINT_V1" &&
        cp.stage==="POST_FINAL_REPLAY"&&cp.articleId===articleId&&
        cp.briefId===original.briefId){
        const savedRun=record(cp.writerRun);
        if(savedRun.version==="MASTER_WRITER_RUN_V1"&&
          Array.isArray(savedRun.sections)&&
          savedRun.sections.length===contract.sectionContracts.length){
          const candidate=savedRun as unknown as MasterWriterRunV1;
          const checked=articleShape(candidate.article);
          if(checked.title===initial.title&&
            checked.metaDescription===initial.metaDescription&&
            checked.h1===initial.h1&&
            normalizeMasterArticleProseSpacesV1(checked.bodyMarkdown)===
              initial.bodyMarkdown){
            run=candidate;checkpointSha256=String(payload.sha256);
          }
        }
      }
    }

    // Research Recovery leaves SHA256-verified section progress under a
    // historical full-contract hash. The final Evidence Snapshot may
    // legitimately drift (URL metadata, research bridge) without losing
    // section claims or source relationships. Do NOT demand current
    // hash equality. Use the already-proven archive inspector, then
    // freshly verify the EXACT persisted prose of every archived section.
    if(!run){
      const base=resolve(
        process.env.GROWTH_OS_ARTICLE_CHECKPOINT_DIR?.trim()||
          ".growth-os-tmp/article-checkpoints"
      );
      const roots=[
        join(base,"research-recovery-editorial"),
        join(base,"research-recovery"),
      ];
      const rejectionReasons:string[]=[];
      for(const rootDirectory of roots){
        const inspection=await inspectArchivedWriterProgressV1({
          rootDirectory,articleId,briefId:original.briefId,
          modelName:generator.modelName,contract,
        });
        if(!inspection.compatible||!inspection.candidate){
          rejectionReasons.push(...inspection.rejectionReasons);
          continue;
        }
        const signed=inspection.candidate.checkpoint;
        run=await rebindSignedArchivedWriterRunV1({
          progress:signed,contract,generator,article:initial,
        });
        checkpointSha256=sha(JSON.stringify(signed));
        console.info("[content quality archived Writer rebind]",{
          articleId,archivedPrefix:inspection.archivedPrefix,
          verifiedSections:inspection.verifiedSections,
          currentSourceSemanticVerification:true,
          regeneratedWriter:false,
        });
        break;
      }
      if(!run)console.warn("[content quality archive unavailable]",{
        inspectedRoots:roots.length,
        rejectionReasons:[...new Set(rejectionReasons)].slice(0,8),
      });
    }
    check(run!==null&&checkpointSha256!==null,
      "SAVED_QUALITY_SIGNED_CURRENT_WRITER_CHECKPOINT_REQUIRED");
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

    const sectionPlan=plan.sections.filter(section=>section.state==="WRITABLE");
    const improvePlan=planSameArticleQualityImprovementV1({
      wordCount:countWords(original.bodyMarkdown),
      minimumWords,
      sections:run.sections.map((section,index)=>({
        index,words:countSectionWordsV1(section.bodyMarkdown),
        maxWords:sectionPlan[index]?.targetWords?.max??0,
        claimCount:sectionPlan[index]?.requiredClaimIds?.length??0,
        evidenceCount:sectionPlan[index]?.evidenceIds?.length??0,
        h3Count:(section.bodyMarkdown.match(/^###\s+/gm)??[]).length,
      })),
    });
    check(improvePlan.eligible,"SAVED_QUALITY_"+improvePlan.reason);
    const sections=[...run.sections],reconciliations=[...run.reconciliations],
      semanticVerifications=[...run.semanticVerifications];
    const repairedSectionIds:number[]=[];
    for(const step of improvePlan.steps){
      const current=sections[step.index];
      const scope=contract.sectionContracts[step.index];
      const rec=reconciliations[step.index];
      const semantic=semanticVerifications[step.index];
      check(current&&scope&&rec&&semantic,
        "SAVED_QUALITY_SECTION_AUTHORITY_MISSING");
      const finding=createMasterArticleCriticFindingV1({
        criticId:"COVERAGE",code:"SOURCE_BACKED_READER_DEPTH_REVISION",
        severity:"BLOCK",
        location:{scope:"SECTION",sectionIndex:step.index,
          sectionNumber:scope.sectionNumber,heading:scope.blueprint.heading},
        repairScope:"SECTION",
        message:"Expand this existing reader answer with substantially new "+
          "source-backed useful detail, within the existing section mission.",
        recommendation:"Give clearer source-supported mechanisms, distinctions "+
          "and practical implications. Use no invented facts and do not "+
          "repeat neighboring advice or overuse keywords. "+
          (step.suggestUsefulH3?
            "Use descriptive Markdown H3 only for distinct evidenced "+
            "reader subquestions, each with real paragraphs. ":"")+
          "Preserve every required verified claim and limitation.",
        evidence:{claimIds:scope.blueprint.requiredClaims,
          evidenceIds:scope.blueprint.evidenceIds,
          queryNodeIds:scope.blueprint.queryNodeIds,sourceIds:[]},
      });
      const revised=await generator.repairSection({
        contract:scope,section:current,reconciliation:rec,
        semanticVerification:semantic,attempt:1,
        depthRepair:{currentWords:step.currentWords,
          minWords:step.minWords,preferredWords:step.preferredWords,
          maxWords:step.maxWords},
        criticFindings:[finding],
        crossSectionEditorialContext:sections.flatMap((neighbor,index)=>
          index===step.index?[]:[{sectionIndex:index,
            heading:neighbor.heading,
            prosePreview:neighbor.bodyMarkdown.slice(0,1700)}]),
      });
      check(revised.bodyMarkdown!==current.bodyMarkdown,
        "SAVED_QUALITY_REPAIR_NO_CHANGE:"+step.index);
      const verified=await verifyGeneratedSectionOnlyV1({
        contract:scope,section:revised,generator,
      });
      check(countSectionWordsV1(verified.section.bodyMarkdown)>=step.minWords,
        "SAVED_QUALITY_REPAIR_DEPTH_NOT_MET:"+step.index);
      sections[step.index]=verified.section;
      reconciliations[step.index]=verified.reconciliation;
      semanticVerifications[step.index]=verified.semanticVerification;
      repairedSectionIds.push(step.index);
    }
    const improvedRun=rebuildWriterRunV1({
      contract,run,sections,reconciliations,semanticVerifications,
    });
    const finalCritics=await executeMasterArticleCriticsV1({
      contract,run:improvedRun,generator,context,
    });
    assertMasterArticleCriticExecutionPassed(finalCritics);
    check(finalCritics.suite.status!=="BLOCK",
      "SAVED_QUALITY_FINAL_CRITICS_BLOCKED");
    const repaired={
      run:improvedRun,finalCritics,
      repairs:repairedSectionIds.map(sectionIndex=>({sectionIndex})),
      provenance:{wholeArticleRewriteCount:0,
        repairedSectionCount:repairedSectionIds.length,
        repairAttemptCount:repairedSectionIds.length},
    };
    const candidate=articleShape(repaired.run.article);
    check(!sameArticle(initial,candidate)&&candidate.title===initial.title &&
      candidate.h1===initial.h1 &&
      normalizeMasterArticleProseSpacesV1(candidate.bodyMarkdown)===
        candidate.bodyMarkdown &&
      detectPersistedArticleEditorialRepetitionV1(
        candidate.bodyMarkdown).length===0 &&
      countWords(candidate.bodyMarkdown)>=minimumWords,
      "SAVED_QUALITY_CANDIDATE_INSUFFICIENT_OR_REPETITIVE");

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
      audit.h3Count>=initialAudit.h3Count,
      "SAVED_QUALITY_HEADING_STRUCTURE_REGRESSED");
    check(improvePlan.headingOpportunityCount<2 || audit.h3Count>=2,
      "SAVED_QUALITY_MEANINGFUL_H3_STILL_MISSING");

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
              version:"SAVED_ARTICLE_QUALITY_IMPROVEMENT_V1",
              previousArticle:initial,
              previousStatus:original.status,
              previousArticleUpdatedAt:original.updatedAt.toISOString(),
              previousFingerprint:oldFingerprint,
              previousReplayArtifactId:priorReplay?.id??null,
              evidenceSnapshotSha256:sha(JSON.stringify(snap.plan)),
              checkpointSha256,
              initialCriticStatus:"NOT_RUN_AVOID_PAID_BASELINE",
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
      result:"SAME_ARTICLE_QUALITY_IMPROVEMENT_COMMITTED" as const,
      newFingerprint:fingerprint,
      oldFingerprint,
      replayArtifactId:committed,
      repairedSections:repaired.repairs.map(x=>x.sectionIndex),
      readerWords:audit.wordCount,
      editorialFindings:0,
      revisedSections:improvePlan.steps.map(x=>x.index),
      editorialMinimumWords:minimumWords,
      qualityBeforeWords:countWords(initial.bodyMarkdown),
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
