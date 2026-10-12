/**
 * Resume review for ONE saved SEO article. Never reruns the Writer and never
 * mutates Postgres. Requires a cryptographically matching checkpoint, saved
 * Markdown, and verified-but-not-persisted staged evidence revision.
 *
 * READ-ONLY: npx tsx scripts/content-existing-candidate-final-review.ts BRIEF_ID ARTICLE_ID
 * PAID, BOUNDED: GROWTH_OS_LIVE_REVIEW=1 npx tsx scripts/content-existing-candidate-final-review.ts BRIEF_ID ARTICLE_ID --run
 *
 * --run verifies only the repaired section semantically, runs real nine
 * article critics, and real SERP Replay. Results are saved locally (wx);
 * approval, DB persistence, and publication are never performed here.
 */
import { loadEnvConfig } from "@next/env";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
loadEnvConfig(process.cwd());

const digest = (s: string): string =>
  createHash("sha256").update(s, "utf8").digest("hex");
function invariant(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}
function record(value: unknown): Record<string, any> {
  invariant(value !== null && typeof value === "object" &&
    !Array.isArray(value), "INVALID_ARTIFACT_RECORD");
  return value as Record<string, any>;
}
function safeError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
function unique<T>(items: readonly T[]): T[] { return [...new Set(items)]; }

function parseExactFiveSections(
  body: string,
  originals: readonly Readonly<{ heading: string; bodyMarkdown: string }>[],
): string[] {
  let cursor = 0;
  const sections: string[] = [];
  for (let i = 0; i < originals.length; i++) {
    const marker = "## " + originals[i].heading + "\n\n";
    invariant(body.startsWith(marker, cursor),
      "CANDIDATE_SECTION_HEADING_OR_ORDER_MISMATCH:" + i);
    cursor += marker.length;
    let content: string;
    if (i !== 3) {
      content = originals[i].bodyMarkdown;
      invariant(body.startsWith(content, cursor),
        "UNTOUCHED_SECTION_BYTES_DIFFER:" + i);
      cursor += content.length;
    } else {
      const next = originals[i + 1];
      invariant(next, "SCORE_SECTION_NEXT_HEADING_MISSING");
      const separator = "\n\n## " + next.heading + "\n\n";
      const end = body.indexOf(separator, cursor);
      invariant(end >= cursor, "CANDIDATE_SCORE_SECTION_BOUNDARY_MISSING");
      content = body.slice(cursor, end);
      cursor = end;
    }
    invariant(content.trim().length > 0, "CANDIDATE_SECTION_EMPTY:" + i);
    sections.push(content);
    if (i < originals.length - 1) {
      invariant(body.startsWith("\n\n", cursor),
        "CANDIDATE_SECTION_SEPARATOR_INVALID:" + i);
      cursor += 2;
    }
  }
  invariant(cursor === body.length, "CANDIDATE_EXTRA_CONTENT");
  invariant(sections.map((sec,i)=>
    "## " + originals[i].heading + "\n\n" + sec
  ).join("\n\n") === body, "CANDIDATE_EXACT_RECOMPOSITION_FAILED");
  return sections;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const [briefId, articleId] = args;
  const live = args.includes("--run");
  invariant([briefId, articleId].every(v=>/^[a-zA-Z0-9_-]{1,100}$/.test(v??"")),
    "USAGE: BRIEF_ID ARTICLE_ID [--run]");
  invariant(args.length === (live ? 3 : 2), "UNKNOWN_ARGUMENTS");
  invariant(!live || process.env.GROWTH_OS_LIVE_REVIEW === "1",
    "EXPLICIT_GROWTH_OS_LIVE_REVIEW_OPT_IN_REQUIRED");

  const root = resolve(".growth-os-tmp/final-article-closure");
  const checkpointDir = resolve(process.env.GROWTH_OS_ARTICLE_CHECKPOINT_DIR ??
    ".growth-os-tmp/article-checkpoints");
  const [candidateMd, candidateRaw, cpRaw, revisionRaw] = await Promise.all([
    readFile(join(root, articleId + "-REVIEW-CANDIDATE.md"), "utf8"),
    readFile(join(root, articleId + "-REVIEW-CANDIDATE.json"), "utf8"),
    readFile(join(checkpointDir, articleId + "-POST_WRITER.json"), "utf8"),
    readFile(join(root, articleId + "-STAGED-EVIDENCE-REVISION.json"), "utf8"),
  ]);
  const manifest = record(JSON.parse(candidateRaw));
  const saved = record(JSON.parse(cpRaw));
  const cp = record(saved.checkpoint);
  const revised = record(JSON.parse(revisionRaw));
  invariant(saved.sha256 === digest(JSON.stringify(cp)),
    "CHECKPOINT_DIGEST_INVALID");
  invariant(cp.version === "ARTICLE_RECOVERY_CHECKPOINT_V1" &&
    cp.stage === "POST_WRITER" && cp.articleId === articleId &&
    cp.briefId === briefId && revised.sourceCheckpointSha256 === saved.sha256 &&
    manifest.sourceCheckpointSha256 === saved.sha256 &&
    revised.articleId === articleId && revised.briefId === briefId,
    "CHECKPOINT_REVISION_IDENTITY_MISMATCH");
  invariant(revised.version === "STAGED_SCORE_EVIDENCE_REVISION_V1" &&
    revised.status === "NOT_PERSISTED_NOT_READY_FOR_REVIEW" &&
    revised.verifiedClaimId === manifest.source?.verifiedClaimId &&
    revised.verifiedEvidenceId === "evidence-score-impact-experian-reviewed-v1",
    "STAGED_EVIDENCE_REVISION_INVALID");
  invariant(JSON.stringify(manifest.changedSectionIndexes)==="[3]",
    "CANDIDATE_MODIFIED_UNEXPECTED_SECTION");
  const originalRun = record(cp.writerRun);
  const originalSections = originalRun.sections as Array<Record<string,any>>;
  invariant(Array.isArray(originalSections) && originalSections.length===5,
    "CHECKPOINT_SECTIONS_INVALID");
  const originalHashes = originalSections.map(s=>digest(s.bodyMarkdown));
  invariant(JSON.stringify(originalHashes)===JSON.stringify(manifest.sectionHashesBefore),
    "CHECKPOINT_SECTION_HASHES_INVALID");
  invariant(originalHashes.every((h,i)=>i===3||h===manifest.sectionHashesAfter[i]),
    "UNTOUCHED_SECTIONS_CHANGED");

  const h1Line=/^# ([^\r\n]+)\r?\n(?:\r?\n)*/.exec(candidateMd);
  invariant(h1Line && h1Line[1].trim()===originalRun.shell.h1.trim(),
    "CANDIDATE_H1_MISMATCH");
  const body = candidateMd.slice(h1Line[0].length).trimEnd();
  invariant(!/^#\s+/m.test(body), "BODY_CONTAINS_H1");
  const headings=originalSections.map(s=>s.heading as string);
  const sectionBodies=parseExactFiveSections(body,originalSections as any);
  invariant(sectionBodies.every((s,i)=>i===3||s===originalSections[i].bodyMarkdown),
    "UNTOUCHED_SECTION_BYTES_DIFFER");
  invariant(sectionBodies[3]!==originalSections[3].bodyMarkdown,
    "SCORE_SECTION_NOT_REPAIRED");

  const candidateArticle = {
    title: originalRun.shell.title,
    metaDescription: originalRun.shell.metaDescription,
    h1: originalRun.shell.h1,
    bodyMarkdown:body,
  };
  invariant(digest(JSON.stringify(candidateArticle))===revised.candidateArticleSha256,
    "CANDIDATE_ARTICLE_VERSION_MISMATCH");

  const { prisma }=await import("../src/lib/prisma");
  try {
    const [brief, article, snapshot] = await Promise.all([
      prisma.contentBrief.findUnique({
        where:{id:briefId},
        select:{websiteId:true,primaryKeyword:true,secondaryKeywords:true,
          website:{select:{url:true}}},
      }),
      prisma.contentArticle.findUnique({
        where:{id:articleId},
        select:{briefId:true,status:true,updatedAt:true},
      }),
      prisma.contentEvidenceSnapshot.findUnique({
        where:{briefId},select:{plan:true},
      }),
    ]);
    invariant(brief && article && snapshot && article.briefId===briefId &&
      article.status==="REJECTED", "ARTICLE_NOT_CURRENTLY_REJECTED");
    invariant(digest(JSON.stringify(snapshot.plan))===revised.originalPlanSha256,
      "SOURCE_EVIDENCE_CHANGED_SINCE_STAGING");

    const staged=record(revised.stagedSnapshot);
    const { assertStoredPublicationEvidenceV1 }=
      await import("../src/lib/content/stored-publication-evidence-gate-v1");
    const { inspectMasterRuntimeSnapshot }=
      await import("../src/lib/content/master-runtime-adapter");
    const { parsePersistedArticleExecutionPlanV1,
      bindArticleExecutionPlanToGenerationContractV1 }=
      await import("../src/lib/content/article-execution-plan-binding-v1");
    const { buildArticleGenerationContractV1 }=
      await import("../src/lib/content/article-generation-contract");
    const { assertArticlePreWriterRequiredCoverageV1,
      assertArticlePreWriterAnswerSupportV2,
      assertArticlePreWriterEvidenceReadyV1 }=
      await import("../src/lib/content/article-prewriter-evidence-gate-v1");
    const { assertPreWriterMissionAuthorityV1 }=
      await import("../src/lib/content/article-prewriter-mission-authority-gate-v1");
    const { reconcileGeneratedSectionClaimsV1,
      assertSectionClaimReconciliationPassed }=
      await import("../src/lib/content/section-claim-reconciliation");
    const { finalizeSectionSemanticVerificationV1,
      assertSectionSemanticVerificationPassed }=
      await import("../src/lib/content/master-section-semantic-verifier");
    const { runDeterministicMasterArticleCriticsV1 }=
      await import("../src/lib/content/master-article-deterministic-critics");
    const { buildMasterArticleSemanticCriticContextV1 }=
      await import("../src/lib/content/master-article-semantic-critic-context");
    const { buildProductionFinalArticleReadinessV1 }=
      await import("../src/lib/content/production-final-article-readiness-adapter-v1");
    const { auditArticle }=await import("../src/lib/content/content-quality");
    const { analyzeArticleAgainstPlan }=
      await import("../src/lib/content/content-plan-analysis");
    const { evaluateContentGate }=await import("../src/lib/content/content-gate");
    const { evaluateArticlePublicationPolicy }=
      await import("../src/lib/content/article-publication-policy");
    const { getBusinessFactRegistryForBrief }=
      await import("../src/lib/content/evidence-snapshot");

    assertStoredPublicationEvidenceV1(staged);
    const runtimeInspection=inspectMasterRuntimeSnapshot(staged);
    invariant(runtimeInspection.runtime,"STAGED_RUNTIME_INVALID");
    const runtime=runtimeInspection.runtime;
    const executionPlan=parsePersistedArticleExecutionPlanV1(staged.articleExecutionPlan);
    assertArticlePreWriterEvidenceReadyV1(executionPlan);
    assertArticlePreWriterRequiredCoverageV1(executionPlan);
    assertArticlePreWriterAnswerSupportV2(executionPlan);
    assertPreWriterMissionAuthorityV1({
      sections:executionPlan.sections,
      blueprints:runtime.sectionBlueprints.sections,
    });
    invariant(executionPlan.sections.length===originalSections.length &&
      executionPlan.sections.every((s,i)=>s.state==="WRITABLE" &&
        s.heading===headings[i]), "LOCKED_ARTICLE_SCOPE_MISMATCH");
    invariant(runtime.sectionBlueprints.sections.length===originalSections.length,
      "RUNTIME_SECTION_SCOPE_MISMATCH");

    // Only the staged, verified post-evidence authority is projected onto
    // the canonical production contract. Nothing is invented from prose.
    const projectedRuntime={...runtime, sectionBlueprints:{
      ...runtime.sectionBlueprints,
      sections:runtime.sectionBlueprints.sections.map((s,i)=>({
        ...s,
        requiredClaims:executionPlan.sections[i].requiredClaimIds,
        evidenceIds:executionPlan.sections[i].evidenceIds,
      })),
    }};
    const contract=bindArticleExecutionPlanToGenerationContractV1({
      plan:executionPlan,contract:buildArticleGenerationContractV1(projectedRuntime),
    });
    const target=contract.sectionContracts[3];
    invariant(target.blueprint.heading===headings[3],
      "CHANGED_SECTION_BINDING_WRONG_OWNER");
    const oldReferencedEvidence=new Set(
      (runtime.evidenceGraph.claimEvidence as Array<{id:string;claimId:string}>)
        .filter(e=>e.claimId==="claim-score-inquiry").map(e=>e.id)
    );
    const old=originalSections[3];
    const correctedSection={
      ...old,
      bodyMarkdown:sectionBodies[3],
      referencedClaimIds:unique([
        ...((old.referencedClaimIds??[]) as string[])
          .filter(id=>id!=="claim-score-inquiry"),
        ...target.blueprint.requiredClaims,
      ]),
      referencedEvidenceIds:unique([
        ...((old.referencedEvidenceIds??[]) as string[])
          .filter(id=>!oldReferencedEvidence.has(id) &&
            target.blueprint.evidenceIds.includes(id)),
        ...target.blueprint.evidenceIds,
      ]),
    };
    const sections=originalSections.map((section,i)=>
      i===3 ? correctedSection : section);
    const reconciliations=sections.map((section,i)=>{
      const result=reconcileGeneratedSectionClaimsV1({
        contract:contract.sectionContracts[i],section:section as any,
      });
      assertSectionClaimReconciliationPassed(result);
      return result;
    });

    // Old semantic verifications are allowed ONLY for the four sections
    // whose content bytes and original claim statuses did not change.
    const semantics=[...originalRun.semanticVerifications] as any[];
    invariant(semantics.length===sections.length,
      "SAVED_SEMANTIC_VERIFICATION_COUNT_MISMATCH");
    for(let i=0;i<sections.length;i++){
      if(i===3)continue;
      const previous=record(semantics[i]);
      const rebuilt=finalizeSectionSemanticVerificationV1({
        contract:contract.sectionContracts[i],
        section:sections[i] as any,
        modelName:previous.provenance.modelName as string,
        candidate:{units:previous.units.map((unit:any)=>({
          unitId:unit.unitId,classification:unit.classification,
          matchedClaimId:unit.matchedClaimId,evidenceIds:unit.evidenceIds,
          rationale:unit.rationale,
        }))},
      });
      assertSectionSemanticVerificationPassed(rebuilt);
      semantics[i]=rebuilt;
    }
    const run={
      ...originalRun,
      sections,
      reconciliations,
      semanticVerifications:semantics,
      article:{
        ...originalRun.article,...candidateArticle,
        sections,
      },
    };

    const rankReadyKeywords=unique([
      brief.primaryKeyword,...brief.secondaryKeywords,
    ]);
    const deterministic=runDeterministicMasterArticleCriticsV1({
      contract,run:run as any,rankReadyKeywords,
    });
    const deterministicBlockers=deterministic.flatMap(c=>
      c.findings.filter(f=>f.severity==="BLOCK").map(f=>c.criticId+":"+f.code));
    const audit=auditArticle({article:candidateArticle,primaryKeyword:brief.primaryKeyword});
    const intelligence=analyzeArticleAgainstPlan({
      ...candidateArticle,primaryKeyword:brief.primaryKeyword,
      secondaryKeywords:brief.secondaryKeywords,plan:staged,
    });
    const registry=await getBusinessFactRegistryForBrief({
      briefId,websiteId:brief.websiteId,
    });
    const contentGate=evaluateContentGate({
      article:candidateArticle,primaryKeyword:brief.primaryKeyword,audit,registry,
    });
    const publicationPolicy=evaluateArticlePublicationPolicy({
      article:candidateArticle,intelligence,
    });
    const preflight={
      candidateSha256:revised.candidateArticleSha256,
      articleStatus:article.status,unchangedSections:4,
      claimEvidence:"VERIFIED",
      sourceSnapshotStillMatches:true,
      deterministicCriticBlockers:deterministicBlockers,
      contentGate:{pass:contentGate.pass,blockers:contentGate.blockingIssues},
      publicationPolicy:{pass:publicationPolicy.pass,
        blockers:publicationPolicy.blockingIssues},
      currentEvidenceUnchanged:true,
    };
    console.log("=== EXACT SAVED ARTICLE FINAL REVIEW PREFLIGHT ===");
    console.log(JSON.stringify({preflight,runRequested:live,
      databaseUnchanged:true},null,2));
    invariant(deterministicBlockers.length===0,
      "DETERMINISTIC_CRITIC_BLOCKED:"+deterministicBlockers.join("|"));
    invariant(contentGate.pass&&publicationPolicy.pass,
      "CANDIDATE_CONTENT_OR_PUBLICATION_GATE_FAILED");
    if(!live){
      console.log("DRY_RUN_PASS; NO_MODEL_CALLS; NO_DATABASE_WRITES");
      return;
    }

    const { geminiGenerator }=await import("../src/lib/content/gemini-generator");
    const { createContentRunBudgetV1,withContentRunBudgetV1 }=
      await import("../src/lib/content/content-run-budget-v1");
    const { executeMasterArticleCriticsV1 }=
      await import("../src/lib/content/master-article-critic-fusion");
    const { executeSerpReplayV1 }=
      await import("../src/lib/content/serp-replay");
    const budget=createContentRunBudgetV1({
      maxModelCalls:4,maxEstimatedInputTokens:65000,maxRepairCalls:0,
    });
    const model=withContentRunBudgetV1({generator:geminiGenerator,budget});
    const output=join(root,articleId+"-EXACT-CANDIDATE-REVIEW.json");
    // Prevent spending model calls if an earlier run already exists.
    try { await readFile(output,"utf8");
      throw new Error("EXACT_CANDIDATE_REVIEW_ALREADY_EXISTS");
    } catch(e){
      if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e;
    }
    const result:Record<string,unknown>={
      version:"EXACT_SAVED_ARTICLE_FINAL_REVIEW_V1",
      status:"NOT_AUTHORIZED",
      briefId,articleId,
      candidateSha256:revised.candidateArticleSha256,
      originalPlanSha256:revised.originalPlanSha256,
      sourceCheckpointSha256:saved.sha256,
      stagedEvidenceSha256:digest(JSON.stringify(staged)),
      article:candidateArticle,
      semanticVerification:null,
      finalCritics:null,
      serpReplay:null,
      readiness:null,
      error:null,
      modelBudget:null,
    };
    try {
      const semantic=await model.verifySectionClaims({
        contract:target,section:correctedSection as any,
      });
      result.semanticVerification=semantic;
      assertSectionSemanticVerificationPassed(semantic);
      semantics[3]=semantic;
      run.semanticVerifications=semantics;

      const context={
        ...buildMasterArticleSemanticCriticContextV1(projectedRuntime),
        rankReadyKeywords,
      };
      const finalCritics=await executeMasterArticleCriticsV1({
        contract,run:run as any,generator:model,context,
      });
      result.finalCritics=finalCritics;
      invariant(finalCritics.suite.status!=="BLOCK",
        "FINAL_MASTER_CRITICS_BLOCKED:"+finalCritics.suite.findings
          .filter(f=>f.severity==="BLOCK").map(f=>f.code).join("|"));

      const siteDomain=new URL(brief.website.url).hostname;
      const replay=await executeSerpReplayV1({
        runtime:projectedRuntime,run:run as any,generator:model,siteDomain,
      });
      result.serpReplay=replay;
      const readiness=buildProductionFinalArticleReadinessV1({
        plan:executionPlan,
        writerRun:run,
        finalCritics,
        articleBodyMarkdown:body,
        contentGatePass:contentGate.pass,
        publicationPolicyPass:publicationPolicy.pass,
        serpReplay:replay,
        serpReplayWarning:null,
      });
      result.readiness=readiness;
      invariant(readiness.status==="PASS"||readiness.status==="WARN",
        "FINAL_READINESS_FAILED:"+readiness.blockers.join("|"));
      result.status="READY_FOR_CONTROLLED_PERSISTENCE";
    } catch(e) {
      result.error=safeError(e);
      result.status="REVIEW_FAILED";
    }
    result.modelBudget=budget.snapshot();
    await mkdir(root,{recursive:true,mode:0o700});
    await writeFile(output,JSON.stringify(result,null,2)+"\n",{
      flag:"wx",mode:0o600,
    });
    console.log(JSON.stringify({
      status:result.status,
      output,
      criticStatus:(result.finalCritics as any)?.suite?.status??null,
      replayStatus:(result.serpReplay as any)?.status??null,
      readinessStatus:(result.readiness as any)?.status??null,
      blockers:(result.readiness as any)?.blockers??[],
      error:result.error,
      budget:result.modelBudget,
      databaseUnchanged:true,
      published:false,
    },null,2));
    if(result.status!=="READY_FOR_CONTROLLED_PERSISTENCE"){
      process.exitCode=3;
    }
  } finally {
    await prisma.$disconnect();
  }
}
main().catch(e=>{
  console.error("EXACT_CANDIDATE_REVIEW_FAILED:"+safeError(e));
  process.exitCode=1;
});
