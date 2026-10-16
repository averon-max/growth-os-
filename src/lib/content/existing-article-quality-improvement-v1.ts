/**
 * EXISTING_ARTICLE_EDITORIAL_RECOVERY_V1
 *
 * Explicit user-triggered repair of one saved IN_REVIEW article, not a
 * fresh brief/research/Writer. Reuses genuine saved Evidence, the exact
 * post-final-replay checkpoint, and the existing production section repair.
 *
 * Logical model calls are bounded by ContentRunBudgetV1; section edits
 * are individually saved in SHA256-scoped local progress after verification.
 * The persistent Article and SERP Replay change only after all gates pass.
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
import {detectHighConfidenceEditorialRepetitionV1}
  from "./editorial-repetition-guard-v1";
import {selectQualityEditorialRepairSectionsV1,
  isQualityEditorialFindingResolvedV1}
  from "./quality-improvement-editorial-recovery-v1";
import {planPostEditorialDepthRecoveryV1}
  from "./quality-improvement-post-editorial-depth-v1";
import {inspectQualityKeywordRegressionV1,
  selectQualityKeywordRepairSectionV1}
  from "./quality-improvement-keyword-recovery-v1";
import {proposeOriginalSectionKeywordSentenceV1}
  from "./quality-improvement-keyword-original-sentence-v1";
import { countWords } from "./article-analyzer";
import { resolveArticleLengthContractV1 } from "./article-length-contract-v1";
import { planSameArticleQualityImprovementV1, evaluateWholeArticleQualityWordRangeV1 } from "./same-article-quality-improvement-v1";
import { countSectionWordsV1,verifyGeneratedSectionOnlyV1,
  supportsMasterSectionRepairGenerator } from "./master-section-repair";
import { supportsMasterSectionSemanticVerifier }
  from "./master-section-semantic-verifier";
import { rebuildWriterRunV1 } from "./master-article-critic-repair-execution";
import { createMasterArticleCriticFindingV1 } from "./master-article-critic";
import {countQualityArticleH3V1,eligibleForEvidenceBackedH3V1}
  from "./quality-improvement-h3-v1";
import {inspectArchivedWriterProgressV1}
  from "./writer-recovery-archived-progress-v1";
import {rebindSignedArchivedWriterRunV1}
  from "./verified-archived-writer-run-v1";
import {
  readMasterWriterSectionProgressV1,
  writeMasterWriterSectionProgressV1,
  fingerprintMasterWriterContractV1,
} from "./master-writer-section-progress-v1";
import {executeMasterWriterV1}
  from "./master-writer-orchestrator";
import {splitPersistedArticleByCanonicalH2V1}
  from "./existing-article-section-rebind-v1";
import {draftExistingArticleSignedCitationsV1}
  from "./existing-article-source-citation-repair-v1";
import {verifyExistingArticleCitationScopeV1}
  from "./existing-article-citation-authority-v1";
import {
  qualityImprovementProgressDirectoryV1,
  classifyVerifiedQualitySectionsV1,
} from "./quality-improvement-progress-scope-v1";
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
  expectedUpdatedAt:string,
  repairMode:"DEPTH"|"EXACT_SIGNED_CITATIONS"="DEPTH"){
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
    if(repairMode==="DEPTH")
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
    // Citation-only repair is not a word-count expansion and cannot
    // claim new evidence authority. Preflight exact claim anchors BEFORE
    // spending on any verifier or reading/writing section progress.
    const signedCitationDraft=repairMode==="EXACT_SIGNED_CITATIONS"
      ?draftExistingArticleSignedCitationsV1({
        bodyMarkdown:original.bodyMarkdown,plan,runtime})
      :null;
    if(repairMode==="EXACT_SIGNED_CITATIONS"){
      check(signedCitationDraft &&
        signedCitationDraft.totalAddedCitations>0,
        "SAVED_SIGNED_CITATION_REPAIR_NO_EXACT_CLAIM_ANCHORS");
      const scoped=verifyExistingArticleCitationScopeV1({
        candidateBodyMarkdown:signedCitationDraft.proposedBodyMarkdown,
        plan,runtime,
      });
      check(scoped.status==="REVIEW_SEMANTIC_PROOF_REQUIRED",
        "SAVED_SIGNED_CITATION_REPAIR_SCOPE_INVALID");
    }
    const contract=bindArticleExecutionPlanToGenerationContractV1({
      plan,contract:buildArticleGenerationContractV1(runtime),
    });

    const budget=createContentRunBudgetV1({
      maxModelCalls:36,maxEstimatedInputTokens:200000,maxRepairCalls:8,
    });
    const generator=withContentRunBudgetV1({generator:geminiGenerator,budget});
    check(supportsMasterSectionRepairGenerator(generator)&&
      supportsMasterSectionSemanticVerifier(generator),
      "SAVED_QUALITY_REPAIR_GENERATOR_UNAVAILABLE");
    const initial=articleShape(original);
    let run:MasterWriterRunV1|null=null;
    let checkpointSha256:string|null=null;
    const writerContractHash=fingerprintMasterWriterContractV1(
      contract,generator.modelName);
    const qualityProgressDirectory=qualityImprovementProgressDirectoryV1({
      root:checkpointDir(),articleId,briefId:original.briefId,
      updatedAt:original.updatedAt.toISOString(),
      article:initial,snapshot:snap.plan,contract,
      modelName:generator.modelName,
    });
    const qualityProgress=await readMasterWriterSectionProgressV1({
      directory:qualityProgressDirectory,articleId,
      briefId:original.briefId,contractHash:writerContractHash,
      modelName:generator.modelName,
    });
    if(qualityProgress &&
      qualityProgress.accepted.length===contract.sectionContracts.length){
      // This checkpoint's directory is bound to EXACT saved article bytes,
      // version, current source snapshot and contract. The canonical Reader
      // verifies the SHA256 envelope, provenance and model. The Writer
      // replays claim reconciliation and semantic classifications against
      // the current immutable source graph without another paid model call.
      const resumed=await executeMasterWriterV1({
        contract,generator,resumeProgress:qualityProgress,
      });
      check(resumed.shell.title===initial.title &&
        resumed.shell.h1===initial.h1 &&
        resumed.shell.metaDescription===initial.metaDescription,
        "SAVED_QUALITY_RESUMED_SHELL_DRIFT");
      run=resumed;
      checkpointSha256=sha(JSON.stringify(qualityProgress));
      console.info("[content quality verified progress reused]",{
        articleId,sections:qualityProgress.accepted.length,
        paidBaselineVerificationsAvoided:6,
      });
    }

    // Old article-generation checkpoint (if it still matches the exact
    // currently persisted article and the current Research snapshot).
    const dir=checkpointDir();
    const path=join(dir,articleId+"-POST_FINAL_REPLAY.json");
    let raw:string|null=null;
    try{raw=await readFile(path,"utf8");}
    catch(error){
      if((error as NodeJS.ErrnoException).code!=="ENOENT")throw error;
    }
    if(raw && !run){
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
      const archiveBases=[...new Set([
        resolve(process.env.GROWTH_OS_ARTICLE_CHECKPOINT_DIR?.trim()||
          ".growth-os-tmp/article-checkpoints"),
        ...(process.env.GROWTH_OS_ENV_DIR?.trim()
          ?[resolve(process.env.GROWTH_OS_ENV_DIR,
            ".growth-os-tmp/article-checkpoints")]:[]),
      ])];
      const roots=archiveBases.flatMap(base=>[
        join(base,"research-recovery-editorial"),
        join(base,"research-recovery"),
      ]);
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
    const originalBodies=splitPersistedArticleByCanonicalH2V1(
      original.bodyMarkdown,contract.sectionContracts.map(s=>s.blueprint.heading));
    const ordinaryPlan=planSameArticleQualityImprovementV1({
      wordCount:countWords(original.bodyMarkdown),
      minimumWords,
      sections:originalBodies.map((body,index)=>({
        index,words:countSectionWordsV1(body),
        maxWords:sectionPlan[index]?.targetWords?.max??0,
        claimCount:sectionPlan[index]?.requiredClaimIds?.length??0,
        evidenceCount:sectionPlan[index]?.evidenceIds?.length??0,
        h3Count:(body.match(/^###\s+/gm)??[]).length,
      })),
    });
    // A 2078-word article may lack all visible verified citations.
    // Never treat reaching an editorial word floor as citation clearance.
    const citationBodies=signedCitationDraft?
      splitPersistedArticleByCanonicalH2V1(
        signedCitationDraft.proposedBodyMarkdown,
        contract.sectionContracts.map(s=>s.blueprint.heading)):[];
    const citationSteps=signedCitationDraft?
      signedCitationDraft.sections.filter(x=>x.proposedCitationCount>0)
        .map(x=>({
          index:x.sectionIndex,
          currentWords:countSectionWordsV1(originalBodies[x.sectionIndex]!),
          minWords:countSectionWordsV1(originalBodies[x.sectionIndex]!),
          preferredWords:countSectionWordsV1(originalBodies[x.sectionIndex]!),
          maxWords:sectionPlan[x.sectionIndex]?.targetWords?.max??0,
          suggestUsefulH3:false,
        })):[];
    const improvePlan=repairMode==="EXACT_SIGNED_CITATIONS"
      ?{...ordinaryPlan,eligible:citationSteps.length>0,
        reason:"ENOUGH_VERIFIED_CAPACITY" as const,
        neededWords:0,steps:citationSteps}
      :ordinaryPlan;
    check(improvePlan.eligible,"SAVED_QUALITY_"+improvePlan.reason);
    const alreadyChanged=classifyVerifiedQualitySectionsV1({
      originalBodies,
      currentBodies:run.sections.map(s=>s.bodyMarkdown),
      plannedIndices:improvePlan.steps.map(s=>s.index),
    });
    const alreadyChangedSet=new Set(alreadyChanged);
    const sections=[...run.sections],reconciliations=[...run.reconciliations],
      semanticVerifications=[...run.semanticVerifications];
    const repairedSectionIds:number[]=[...alreadyChanged];
    const saveQualityProgress=async()=>{
      await writeMasterWriterSectionProgressV1({
        directory:qualityProgressDirectory,
        articleId,briefId:original.briefId,
        contractHash:writerContractHash,modelName:generator.modelName,
        shell:run.shell,
        accepted:sections.map((section,index)=>({
          section,
          reconciliation:reconciliations[index],
          semanticVerification:semanticVerifications[index],
          repair:run.repairs[index],
        })),
      });
    };
    if(!qualityProgress){
      // From this point a paid verified baseline may exist. Persist it
      // before any section rewrite so retries do not repay six verifiers.
      await saveQualityProgress();
    }
    for(const step of improvePlan.steps){
      if(repairMode==="EXACT_SIGNED_CITATIONS"){
        const originalBody=originalBodies[step.index];
        const intendedBody=citationBodies[step.index];
        const current=sections[step.index],scope=contract.sectionContracts[step.index];
        check(current&&scope&&originalBody!==undefined&&
          intendedBody!==undefined,
          "SAVED_SIGNED_CITATION_REPAIR_SECTION_NOT_BOUND");
        // No "nearby" or newly researched citation can be inserted by
        // inference. Only exactly matching signed claim text in the
        // persisted H2 is eligible; note that existing progress can differ.
        if(alreadyChangedSet.has(step.index)){
          check(current.bodyMarkdown.trim()===intendedBody.trim(),
            "SAVED_SIGNED_CITATION_RESUMED_BODY_MISMATCH");
          if(!repairedSectionIds.includes(step.index))
            repairedSectionIds.push(step.index);
          continue;
        }
        check(current.bodyMarkdown.trim()===originalBody.trim(),
          "SAVED_SIGNED_CITATION_BASELINE_ARTICLE_DRIFT");
        check(intendedBody.trim()!==originalBody.trim(),
          "SAVED_SIGNED_CITATION_NO_ACTUAL_SECTION_CHANGE");
        const proposal={...current,bodyMarkdown:intendedBody};
        // The persisted SectionContract remains the sole source of facts;
        // reuse the paid current-source semantic verifier. Reject any
        // rewritten text or stripped source links after verification.
        const verified=await verifyGeneratedSectionOnlyV1({
          contract:scope,section:proposal,generator,
        });
        check(verified.section.bodyMarkdown.trim()===intendedBody.trim(),
          "SAVED_SIGNED_CITATION_SEMANTIC_VERIFIER_CHANGED_TEXT");
        const candidateBodies=sections.map((x,index)=>
          index===step.index?verified.section.bodyMarkdown:x.bodyMarkdown);
        const fullBody=candidateBodies.map((text,index)=>
          "## "+contract.sectionContracts[index]!.blueprint.heading+
          "\n\n"+text).join("\n\n");
        const scoped=verifyExistingArticleCitationScopeV1({
          candidateBodyMarkdown:fullBody,plan,runtime,
        });
        check(scoped.status==="REVIEW_SEMANTIC_PROOF_REQUIRED",
          "SAVED_SIGNED_CITATION_URL_SCOPE_NOT_VERIFIED");
        sections[step.index]=verified.section;
        reconciliations[step.index]=verified.reconciliation;
        semanticVerifications[step.index]=verified.semanticVerification;
        repairedSectionIds.push(step.index);
        await saveQualityProgress();
        console.info("[same article citation section verified]",{
          articleId,sectionIndex:step.index,
          citationCount:signedCitationDraft!.sections[step.index]!
            .proposedCitationCount,
        });
        continue;
      }
      if(alreadyChangedSet.has(step.index)){
        console.info("[content quality section resume]",{
          sectionIndex:step.index,reason:"ALREADY_VERIFIED_SAME_SOURCE",
        });
        continue;
      }
      const partialArticle=rebuildWriterRunV1({
        contract,run,sections,reconciliations,semanticVerifications,
      }).article;
      if(countWords(partialArticle.bodyMarkdown)>=minimumWords &&
        countQualityArticleH3V1(partialArticle.bodyMarkdown)>=2){
        console.info("[content quality target reached]",{
          words:countWords(partialArticle.bodyMarkdown),
          repairedSections:repairedSectionIds.length,
        });
        break;
      }
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
      // Individual section word allocations are planning guides, not
      // independent publication gates. A safe, verified 352-word section
      // may be 9 words short of its 361-word target while the other
      // sections can still satisfy the ARTICLE's actual 2000-word gate.
      // Preserve original evidence/semantic checks, while applying the
      // bounded global ARTICLE min/max before the expensive critic pass.
      const actualSectionWords=countSectionWordsV1(
        verified.section.bodyMarkdown);
      // This is an editorial allocation, NOT an individual hard quota.
      // A verifier-approved section can legitimately provide 330 words
      // when its old local maximum was 301. The final document still has
      // a strict product MAX plus all section integrity and evidence gates.
      if(actualSectionWords>step.maxWords){
        console.info("[content quality revision depth allocation]",{
          sectionIndex:step.index,actualWords:actualSectionWords,
          plannedMaxWords:step.maxWords,
          excess:actualSectionWords-step.maxWords,
          finalArticleMaximumStillEnforced:true,
        });
      }
      if(actualSectionWords<step.minWords){
        console.info("[content quality revision depth allocation]",{
          sectionIndex:step.index,actualWords:actualSectionWords,
          plannedMinWords:step.minWords,
          shortfall:step.minWords-actualSectionWords,
          overallDepthMustPass:true,
        });
      }
      sections[step.index]=verified.section;
      reconciliations[step.index]=verified.reconciliation;
      semanticVerifications[step.index]=verified.semanticVerification;
      repairedSectionIds.push(step.index);
      // Save only an already verified section. The DB remains completely
      // unchanged; on retries the SHA256-scoped progress is deterministically
      // reconciled to the same original article and source snapshot.
      await saveQualityProgress();
    }
    // H3 is a quality release requirement for evidence-rich guides, but
    // SectionRepair historically treated H3 as optional. The initial
    // five section rewrites are already SHA256-saved; use an isolated,
    // bounded structure rescue rather than discarding them or restarting
    // the full Writer. Never invent a new H2, claim, or evidence source.
    const countH3=countQualityArticleH3V1;
    let verifiedH3Total=sections.reduce(
      (n,s)=>n+countH3(s.bodyMarkdown),0);
    if(improvePlan.headingOpportunityCount>=2 && verifiedH3Total<2){
      const eligible=improvePlan.steps
        .map(step=>step.index)
        .filter(index=>{
          const owned=sectionPlan[index];
          const prose=sections[index]?.bodyMarkdown??"";
          return eligibleForEvidenceBackedH3V1({
            bodyMarkdown:prose,
            approvedClaimCount:owned?.requiredClaimIds.length??0,
            verifiedEvidenceCount:owned?.evidenceIds.length??0,
          });
        });
      const maxStructureAttempts=Math.min(3,eligible.length);
      let structureAttempts=0;
      for(const index of eligible){
        if(verifiedH3Total>=2 || structureAttempts>=maxStructureAttempts)
          break;
        const scope=contract.sectionContracts[index];
        const current=sections[index];
        if(!scope||!current)continue;
        structureAttempts++;
        const originalH3=countH3(current.bodyMarkdown);
        const finding=createMasterArticleCriticFindingV1({
          criticId:"EDITORIAL",
          code:"SOURCE_BACKED_H3_STRUCTURE_REPAIR",
          severity:"BLOCK",
          location:{scope:"SECTION",sectionIndex:index,
            sectionNumber:scope.sectionNumber,
            heading:scope.blueprint.heading},
          repairScope:"SECTION",
          message:"The article is already substantive and source-verified, "+
            "but needs descriptive H3 subtopics to help readers navigate "+
            "distinct answers within this H2.",
          recommendation:"Return the COMPLETE original section with at "+
            "least "+Math.max(1,2-verifiedH3Total)+" new Markdown ### "+
            "headings that accurately label distinct existing evidence-"+
            "supported paragraphs. Preserve ALL factual prose, required "+
            "claims, source qualifications and keyword language. "+
            "No new facts or generic filler. Do NOT insert H1 or H2.",
          evidence:{claimIds:scope.blueprint.requiredClaims,
            evidenceIds:scope.blueprint.evidenceIds,
            queryNodeIds:scope.blueprint.queryNodeIds,sourceIds:[]},
        });
        const revised=await generator.repairSection({
          contract:scope,section:current,
          reconciliation:reconciliations[index],
          semanticVerification:semanticVerifications[index],
          attempt:1,
          criticFindings:[finding],
        });
        if(countH3(revised.bodyMarkdown)<=originalH3){
          console.info("[content quality H3 structure attempt declined]",{
            sectionIndex:index,reason:"NO_ADDITIONAL_H3",
          });
          continue;
        }
        // Existing normal current-source semantic and deterministic claim
        // gates must accept every changed character, including headings.
        const verified=await verifyGeneratedSectionOnlyV1({
          contract:scope,section:revised,generator,
        });
        const nextH3=countH3(verified.section.bodyMarkdown);
        if(nextH3<=originalH3)
          continue;
        sections[index]=verified.section;
        reconciliations[index]=verified.reconciliation;
        semanticVerifications[index]=verified.semanticVerification;
        if(!repairedSectionIds.includes(index))
          repairedSectionIds.push(index);
        verifiedH3Total+=nextH3-originalH3;
        await saveQualityProgress();
        console.info("[content quality H3 structure verified]",{
          sectionIndex:index,h3Before:originalH3,h3After:nextH3,
          totalVerifiedH3:verifiedH3Total,
        });
      }
    }
    // Last quality gate before the expensive nine-critic pass:
    // a section may be individually factual but repeat boilerplate from
    // another section. Repair ONLY the duplicated passage, keeping all
    // currently signed verified sections. No new research or article.
    const detectVerifiedRepetition=()=>{
      return detectHighConfidenceEditorialRepetitionV1(
        sections.map(section=>({
          heading:section.heading,
          bodyMarkdown:section.bodyMarkdown,
        }))
      );
    };
    let repetitionFindings=detectVerifiedRepetition();
    const initialRepetitionCount=repetitionFindings.length;
    if(repetitionFindings.length){
      console.info("[content quality repetition before critics]",{
        count:repetitionFindings.length,
        codes:repetitionFindings.map(f=>f.code),
        affectedSections:repetitionFindings.map(f=>f.affectedSections),
        repeatedPhrases:repetitionFindings.map(f=>f.repeatedPhrases),
      });
      const attempted:number[]=[];
      const maxEditorialAttempts=3;
      for(let attempt=0;attempt<maxEditorialAttempts&&
        repetitionFindings.length;attempt++){
        const finding=repetitionFindings[0];
        const candidates=selectQualityEditorialRepairSectionsV1({
          finding,plannedIndices:improvePlan.steps.map(s=>s.index),
          alreadyAttempted:attempted,
        });
        const index=candidates[0];
        if(index===undefined)break;
        attempted.push(index);
        const current=sections[index];
        const scope=contract.sectionContracts[index];
        check(current&&scope,"SAVED_QUALITY_EDITORIAL_SCOPE_MISSING");
        const criticFinding=createMasterArticleCriticFindingV1({
          criticId:"EDITORIAL",code:finding.code,severity:"BLOCK",
          location:{scope:"SECTION",sectionIndex:index,
            sectionNumber:scope.sectionNumber,
            heading:scope.blueprint.heading},
          repairScope:"SECTION",
          message:"High-confidence cross-section repetition after "+
            "source-verified quality improvement. Resolve duplicated "+
            "paragraphs or recycled advice without losing this "+
            "section's own direct answer, unique content, required facts "+
            "or evidence-supported qualifications.",
          recommendation:"Remove repetitive stock prose or replace it "+
            "with a useful, evidence-supported explanation of THIS "+
            "section's already assigned reader question. Preserve all "+
            "mandatory verified claims, source limitations and H3 "+
            "subheadings where their paragraphs remain. Do NOT change "+
            "H1/H2, invent new facts, add new keywords or produce filler. "+
            "Duplicated fragments: "+finding.repeatedPhrases.join(" | "),
          evidence:{claimIds:scope.blueprint.requiredClaims,
            evidenceIds:scope.blueprint.evidenceIds,
            queryNodeIds:scope.blueprint.queryNodeIds,sourceIds:[]},
        });
        const revised=await generator.repairSection({
          contract:scope,section:current,
          reconciliation:reconciliations[index],
          semanticVerification:semanticVerifications[index],
          attempt:1,criticFindings:[criticFinding],
          crossSectionEditorialContext:sections.flatMap((neighbor,i)=>
            i===index?[]:[{sectionIndex:i,heading:neighbor.heading,
              prosePreview:neighbor.bodyMarkdown.slice(0,1800)}]),
        });
        if(revised.bodyMarkdown===current.bodyMarkdown){
          console.info("[content quality repetition repair no change]",{
            sectionIndex:index,
          });
          continue;
        }
        const prospectiveSections=[...sections];
        prospectiveSections[index]=revised;
        const prospective=detectHighConfidenceEditorialRepetitionV1(
          prospectiveSections.map(section=>({
            heading:section.heading,bodyMarkdown:section.bodyMarkdown,
          }))
        );
        if(!isQualityEditorialFindingResolvedV1({
          before:repetitionFindings,after:prospective,
        })){
          console.info("[content quality repetition repair declined]",{
            sectionIndex:index,
            originalCodes:repetitionFindings.map(x=>x.code),
            proposedCodes:prospective.map(x=>x.code),
          });
          continue;
        }
        // A deterministic editorial pass is NOT sufficient authority.
        // Reconcile claims and run current-source semantic verification
        // before accepting any changed section into the signed progress.
        const verified=await verifyGeneratedSectionOnlyV1({
          contract:scope,section:revised,generator,
        });
        const after=detectHighConfidenceEditorialRepetitionV1(
          sections.map((section,i)=>({
            heading:section.heading,
            bodyMarkdown:i===index?
              verified.section.bodyMarkdown:section.bodyMarkdown,
          }))
        );
        if(!isQualityEditorialFindingResolvedV1({
          before:repetitionFindings,after,
        }))continue;
        sections[index]=verified.section;
        reconciliations[index]=verified.reconciliation;
        semanticVerifications[index]=verified.semanticVerification;
        if(!repairedSectionIds.includes(index))
          repairedSectionIds.push(index);
        repetitionFindings=after;
        await saveQualityProgress();
        console.info("[content quality repetition verified fix]",{
          sectionIndex:index,
          remainingFindings:repetitionFindings.length,
          retainedH3:sections.reduce((n,x)=>
            n+countQualityArticleH3V1(x.bodyMarkdown),0),
        });
      }
    }
    check(repetitionFindings.length===0,
      "SAVED_QUALITY_EDITORIAL_REPETITION_UNRESOLVED:"+
      JSON.stringify({
        initial:initialRepetitionCount,
        remaining:repetitionFindings.map(x=>({
          code:x.code,sectionIndex:x.sectionIndex,
          affectedSections:x.affectedSections,
          repeatedPhrases:x.repeatedPhrases,
        })),
      }));
    // A verified removal of repeated boilerplate may shorten the draft
    // below the comprehensive ARTICLE minimum (real run: 2044 section
    // words → 1952 final article words). Do not restore duplication,
    // bypass the word gate, or throw away the signed clean checkpoint.
    // Instead add only new useful detail authorized by existing claims.
    const fullRange=resolveArticleLengthContractV1(plan).targetWords;
    check(fullRange,"SAVED_QUALITY_ARTICLE_RANGE_MISSING");
    const currentDraft=()=>rebuildWriterRunV1({
      contract,run,sections,reconciliations,semanticVerifications,
    }).article;
    const afterEditorialWords=countWords(currentDraft().bodyMarkdown);
    if(afterEditorialWords<fullRange.min){
      const depthCandidates=planPostEditorialDepthRecoveryV1({
        articleWords:afterEditorialWords,
        minArticleWords:fullRange.min,
        maxArticleWords:fullRange.max,
        sections:sections.map((section,index)=>({
          index,sectionWords:countSectionWordsV1(section.bodyMarkdown),
          verifiedClaims:sectionPlan[index]?.requiredClaimIds.length??0,
          assignedEvidence:sectionPlan[index]?.evidenceIds.length??0,
        })).filter(section=>improvePlan.steps.some(s=>s.index===section.index)),
      });
      check(depthCandidates.length>0,
        "SAVED_QUALITY_POST_EDITORIAL_EVIDENCE_CAPACITY_MISSING");
      for(const target of depthCandidates){
        const beforeDraft=currentDraft();
        const beforeWords=countWords(beforeDraft.bodyMarkdown);
        if(beforeWords>=fullRange.min)break;
        const index=target.index;
        const scope=contract.sectionContracts[index];
        const current=sections[index];
        if(!scope||!current)continue;
        const sectionWords=countSectionWordsV1(current.bodyMarkdown);
        const remaining=fullRange.min-beforeWords;
        const desiredGain=Math.max(60,remaining+24);
        const goal=sectionWords+desiredGain;
        const finding=createMasterArticleCriticFindingV1({
          criticId:"COVERAGE",
          code:"SOURCE_BACKED_POST_EDITORIAL_DEPTH_RECOVERY",
          severity:"BLOCK",
          location:{scope:"SECTION",sectionIndex:index,
            sectionNumber:scope.sectionNumber,
            heading:scope.blueprint.heading},
          repairScope:"SECTION",
          message:"The verified article is now nonrepetitive but missing "+
            remaining+" useful words to meet the comprehensive editorial "+
            "floor. Improve THIS already-evidenced section; never "+
            "reintroduce repeated introductory definitions or alert advice.",
          recommendation:"Provide about "+desiredGain+
            " additional words of genuinely distinct reader value "+
            "within THIS section's assigned claims and evidence. Deepen "+
            "its specific mechanism, scope, limitations or practical "+
            "implications only when supported. Keep ALL existing "+
            "required facts, citations, qualifications, descriptive H3s, "+
            "and SEO query coverage. Avoid recycled explanations from "+
            "other sections. Do not invent numbers, services, data or "+
            "new H2 topics. Do not pad words merely to reach a target.",
          evidence:{claimIds:scope.blueprint.requiredClaims,
            evidenceIds:scope.blueprint.evidenceIds,
            queryNodeIds:scope.blueprint.queryNodeIds,sourceIds:[]},
        });
        const revised=await generator.repairSection({
          contract:scope,section:current,
          reconciliation:reconciliations[index],
          semanticVerification:semanticVerifications[index],
          attempt:1,
          depthRepair:{
            currentWords:sectionWords,
            minWords:sectionWords+Math.max(25,remaining),
            preferredWords:goal,
            maxWords:goal+80,
          },
          criticFindings:[finding],
          crossSectionEditorialContext:sections.flatMap((neighbor,i)=>
            i===index?[]:[{
              sectionIndex:i,heading:neighbor.heading,
              prosePreview:neighbor.bodyMarkdown.slice(0,1800),
            }]),
        });
        const trial=sections.map((section,i)=>({
          heading:section.heading,
          bodyMarkdown:i===index?revised.bodyMarkdown:
            section.bodyMarkdown,
        }));
        if(detectHighConfidenceEditorialRepetitionV1(trial).length){
          console.info("[content quality depth top-up declined]",{
            sectionIndex:index,reason:"REINTRODUCED_REPETITION",
          });
          continue;
        }
        if(countQualityArticleH3V1(revised.bodyMarkdown)<
          countQualityArticleH3V1(current.bodyMarkdown)){
          console.info("[content quality depth top-up declined]",{
            sectionIndex:index,reason:"LOST_H3_STRUCTURE",
          });
          continue;
        }
        const proposedRun=rebuildWriterRunV1({
          contract,run,
          sections:sections.map((section,i)=>i===index?revised:section),
          reconciliations,semanticVerifications,
        });
        const proposedWords=countWords(proposedRun.article.bodyMarkdown);
        if(proposedWords<=beforeWords+18||
          proposedWords>fullRange.max){
          console.info("[content quality depth top-up declined]",{
            sectionIndex:index,reason:"NO_SUBSTANTIVE_SAFE_NET_GAIN",
            beforeWords,proposedWords,
          });
          continue;
        }
        // Only verify a candidate that passed free global quality gates.
        // A pass then updates signed local progress, never the DB.
        const verified=await verifyGeneratedSectionOnlyV1({
          contract:scope,section:revised,generator,
        });
        const afterTrial=sections.map((section,i)=>({
          heading:section.heading,
          bodyMarkdown:i===index?verified.section.bodyMarkdown:
            section.bodyMarkdown,
        }));
        if(detectHighConfidenceEditorialRepetitionV1(afterTrial).length)
          continue;
        if(countQualityArticleH3V1(verified.section.bodyMarkdown)<
          countQualityArticleH3V1(current.bodyMarkdown))
          continue;
        sections[index]=verified.section;
        reconciliations[index]=verified.reconciliation;
        semanticVerifications[index]=verified.semanticVerification;
        if(!repairedSectionIds.includes(index))
          repairedSectionIds.push(index);
        await saveQualityProgress();
        console.info("[content quality post-editorial depth verified]",{
          sectionIndex:index,
          wordsBefore:beforeWords,
          wordsAfter:countWords(currentDraft().bodyMarkdown),
          remainingWords:Math.max(0,
            fullRange.min-countWords(currentDraft().bodyMarkdown)),
          sourceVerified:true,editorialClean:true,
        });
      }
    }
    // A source-verified local rewrite may replace an EXACT planned query
    // with a grammatical synonym and lose the last mention. Restore it
    // BEFORE expensive nine-critic review, not after. The original saved
    // article had this exact phrase in a specific verified H2; NEVER
    // force it into an unrelated H2, invent a claim or keyword-stuff.
    const inspectKeywords=()=>inspectQualityKeywordRegressionV1({
      original:initial,current:currentDraft(),
      primaryKeyword:original.brief.primaryKeyword,
      secondaryKeywords:original.brief.secondaryKeywords,
      originalSectionBodies:originalBodies,
      editableSectionIndices:improvePlan.steps.map(step=>step.index),
    });
    let keywords=inspectKeywords();
    if(!keywords.restored){
      console.info("[content quality planned keyword regression]",{
        originalUsed:keywords.originalUsed,currentUsed:keywords.currentUsed,
        lost:keywords.losses,
      });
      const attempted:number[]=[];
      const maxKeywordEdits=3;
      for(let attempt=0;attempt<maxKeywordEdits&&!keywords.restored;
        attempt++){
        const index=selectQualityKeywordRepairSectionV1(
          keywords.losses,attempted);
        if(index===null)break;
        attempted.push(index);
        const section=sections[index],scope=contract.sectionContracts[index];
        if(!section||!scope)continue;
        const targetKeywords=keywords.losses.filter(loss=>
          loss.repairableOwningSections.includes(index))
          .map(loss=>loss.keyword);
        if(!targetKeywords.length)continue;
        const finding=createMasterArticleCriticFindingV1({
          criticId:"COVERAGE",
          code:"SOURCE_BACKED_PLANNED_KEYWORD_RESTORATION",
          severity:"BLOCK",
          location:{scope:"SECTION",sectionIndex:index,
            sectionNumber:scope.sectionNumber,
            heading:scope.blueprint.heading},
          repairScope:"SECTION",
          message:"Earlier source-verified text in this H2 contained "+
            "one or more of the exact planned topic terms that the "+
            "subsequent rewrite accidentally removed. Recover only "+
            "the lost phrases, without changing the reader intent.",
          recommendation:"Return this FULL section with each applicable "+
            "phrase used ONCE naturally, in a directly relevant "+
            "explanatory sentence or existing H3. Missing: "+
            JSON.stringify(targetKeywords)+". Do not place keywords "+
            "in unrelated passages or add duplicate wording. "+
            "Preserve all approved facts, citations, qualifiers, "+
            "unique reader value, heading structure and length. "+
            "These exact phrases existed in the original verified "+
            "section; the current SectionContract and its assigned "+
            "verified evidence, not historical prose, remain the "+
            "sole factual authority.",
          evidence:{claimIds:scope.blueprint.requiredClaims,
            evidenceIds:scope.blueprint.evidenceIds,
            queryNodeIds:scope.blueprint.queryNodeIds,sourceIds:[]},
        });
        // First recover the ORIGINAL complete sentence from the SAME
        // source-reviewed H2. Do not ask an LLM to invent an exact
        // keyword insertion or paraphrase already correct prose.
        // This is only a proposal: the identical factual/keyword/
        // editorial gates and PAID current-source semantic verifier
        // below still apply before any new checkpoint is signed.
        const historical=targetKeywords.length===1?
          proposeOriginalSectionKeywordSentenceV1({
            originalBody:originalBodies[index],
            currentBody:section.bodyMarkdown,
            missingKeyword:targetKeywords[0],
          }):null;
        const revised=historical?
          {...section,bodyMarkdown:historical.bodyMarkdown}:
          await generator.repairSection({
            contract:scope,section,
            reconciliation:reconciliations[index],
            semanticVerification:semanticVerifications[index],
            attempt:1,criticFindings:[finding],
            crossSectionEditorialContext:sections.flatMap((neighbor,i)=>
              i===index?[]:[{
                sectionIndex:i,heading:neighbor.heading,
                prosePreview:neighbor.bodyMarkdown.slice(0,1600),
              }]),
          });
        console.info("[content quality keyword proposal]",{
          sectionIndex:index,
          method:historical?"ORIGINAL_SOURCE_REVIEWED_SENTENCE":
            "BOUNDED_SECTION_REPAIR",
          expectedPhrase:targetKeywords,
          exactPhraseInProposedText:targetKeywords.every(phrase=>
            revised.bodyMarkdown.toLocaleLowerCase("en-US").includes(
              phrase.toLocaleLowerCase("en-US"))),
        });
        const draftSectionBodies=sections.map((x,i)=>i===index?
          revised.bodyMarkdown:x.bodyMarkdown);
        const sourceScopedProposal=rebuildWriterRunV1({
          contract,run,
          sections:sections.map((x,i)=>i===index?revised:x),
          reconciliations,semanticVerifications,
        }).article;
        const proposalKeywords=inspectQualityKeywordRegressionV1({
          original:initial,current:sourceScopedProposal,
          primaryKeyword:original.brief.primaryKeyword,
          secondaryKeywords:original.brief.secondaryKeywords,
          originalSectionBodies:originalBodies,
          editableSectionIndices:improvePlan.steps.map(step=>step.index),
        });
        const draftWords=countWords(sourceScopedProposal.bodyMarkdown);
        const draftEditorialFindings=detectHighConfidenceEditorialRepetitionV1(
          sections.map((x,i)=>({
            heading:x.heading,bodyMarkdown:draftSectionBodies[i],
          }))
        );
        const h3Existing=sections.reduce(
          (n,x)=>n+countQualityArticleH3V1(x.bodyMarkdown),0);
        const h3Proposed=draftSectionBodies.reduce(
          (n,body)=>n+countQualityArticleH3V1(body),0);
        // Do not pay to verify a failed candidate. A proposed repair
        // must restore at least one lost exact keyword and preserve
        // every already-present keyword, facts/structure and word range.
        if(proposalKeywords.losses.length>=keywords.losses.length ||
          proposalKeywords.currentUsed<keywords.currentUsed ||
          draftWords<fullRange.min||draftWords>fullRange.max ||
          draftEditorialFindings.length>0||h3Proposed<h3Existing ||
          revised.bodyMarkdown===section.bodyMarkdown){
          console.info("[content quality keyword repair declined]",{
            sectionIndex:index,reason:"NOT_A_SAFE_COVERAGE_IMPROVEMENT",
            missingBefore:keywords.losses.map(x=>x.keyword),
            missingAfter:proposalKeywords.losses.map(x=>x.keyword),
            words:draftWords,remainingRepetition:draftEditorialFindings.length,
          });
          continue;
        }
        const verified=await verifyGeneratedSectionOnlyV1({
          contract:scope,section:revised,generator,
        });
        const verifiedTrial=rebuildWriterRunV1({
          contract,run,
          sections:sections.map((x,i)=>i===index?verified.section:x),
          reconciliations,semanticVerifications,
        }).article;
        const after=inspectQualityKeywordRegressionV1({
          original:initial,current:verifiedTrial,
          primaryKeyword:original.brief.primaryKeyword,
          secondaryKeywords:original.brief.secondaryKeywords,
          originalSectionBodies:originalBodies,
          editableSectionIndices:improvePlan.steps.map(step=>step.index),
        });
        const afterWords=countWords(verifiedTrial.bodyMarkdown);
        if(after.losses.length>=keywords.losses.length ||
          afterWords<fullRange.min||afterWords>fullRange.max ||
          countQualityArticleH3V1(verifiedTrial.bodyMarkdown)<h3Existing ||
          detectPersistedArticleEditorialRepetitionV1(
            verifiedTrial.bodyMarkdown).length>0){
          console.warn("[content quality keyword verified candidate declined]",{
            sectionIndex:index,
            source:historical?"ORIGINAL_SENTENCE":"MODEL_SECTION_REPAIR",
            keywordPresentBeforeVerifier:
              proposalKeywords.losses.length<keywords.losses.length,
            keywordPresentAfterVerifier:
              after.losses.length<keywords.losses.length,
            beforeWordCount:draftWords,afterWordCount:afterWords,
            h3Before:h3Existing,
            h3After:countQualityArticleH3V1(verifiedTrial.bodyMarkdown),
            editorialFindings:detectPersistedArticleEditorialRepetitionV1(
              verifiedTrial.bodyMarkdown).map(f=>f.code),
          });
          continue;
        }
        sections[index]=verified.section;
        reconciliations[index]=verified.reconciliation;
        semanticVerifications[index]=verified.semanticVerification;
        if(!repairedSectionIds.includes(index))
          repairedSectionIds.push(index);
        keywords=after;
        await saveQualityProgress();
        console.info("[content quality keyword restored and verified]",{
          sectionIndex:index,remainingMissing:keywords.losses.map(x=>x.keyword),
          wordCount:afterWords,editorialClean:true,
        });
      }
    }
    check(keywords.restored,
      "SAVED_QUALITY_PLANNED_KEYWORD_RESTORATION_UNRESOLVED:"+
      JSON.stringify(keywords.losses.map(loss=>({
        keyword:loss.keyword,
        originalOwners:loss.originalOwningSections,
        eligibleOwners:loss.repairableOwningSections,
      }))));
    const improvedRun=rebuildWriterRunV1({
      contract,run,sections,reconciliations,semanticVerifications,
    });
    const expectedRange=resolveArticleLengthContractV1(plan).targetWords;
    check(expectedRange,"SAVED_QUALITY_ARTICLE_RANGE_MISSING");
    const candidateWords=countWords(improvedRun.article.bodyMarkdown);
    const globalDepth=evaluateWholeArticleQualityWordRangeV1({
      actualWords:candidateWords,
      minWords:expectedRange.min,maxWords:expectedRange.max,
    });
    check(globalDepth.pass,
      "SAVED_QUALITY_FINAL_ARTICLE_WORD_RANGE:"+
        globalDepth.reason+":"+candidateWords);
    // The meaningful H3 release rule is not a per-section quota.
    // Evaluate it before spending the nine-critic pass.
    check(improvePlan.headingOpportunityCount<2 ||
      countQualityArticleH3V1(improvedRun.article.bodyMarkdown)>=2,
      "SAVED_QUALITY_FINAL_H3_STRUCTURE_MISSING");
    check(detectPersistedArticleEditorialRepetitionV1(
      improvedRun.article.bodyMarkdown).length===0,
      "SAVED_QUALITY_PRECRITIC_EDITORIAL_REPETITION");
    if(repairMode==="EXACT_SIGNED_CITATIONS"){
      const citationScope=verifyExistingArticleCitationScopeV1({
        candidateBodyMarkdown:improvedRun.article.bodyMarkdown,plan,runtime,
      });
      check(citationScope.status==="REVIEW_SEMANTIC_PROOF_REQUIRED" &&
        citationScope.totalLinks>=signedCitationDraft!.totalAddedCitations &&
        signedCitationDraft!.sections.every(section=>
          section.proposed.every(link=>
            !citationScope.sections[section.sectionIndex]!.rejectedLinks
              .includes(link.url) &&
            improvedRun.article.bodyMarkdown.includes("]("+link.url+")"))),
        "SAVED_SIGNED_CITATION_FINAL_SOURCE_SCOPE_REGRESSION");
    }
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
              version:repairMode==="EXACT_SIGNED_CITATIONS"
                ?"SAVED_ARTICLE_SIGNED_CITATION_REPAIR_V1":
                "SAVED_ARTICLE_QUALITY_IMPROVEMENT_V1",
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
      result:repairMode==="EXACT_SIGNED_CITATIONS"
        ?"SAME_ARTICLE_SIGNED_CITATION_REPAIR_COMMITTED" as const:
        "SAME_ARTICLE_QUALITY_IMPROVEMENT_COMMITTED" as const,
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
