/**
 * Prepare a NON-PERSISTED, source-verified evidence revision for the existing
 * score-impact review candidate. Strictly no DB writes, no AI or paid search.
 * Does not authorize IN_REVIEW.
 *
 * NODE_OPTIONS=--conditions=react-server npx tsx scripts/content-stage-score-evidence-revision.ts BRIEF_ID ARTICLE_ID
 */
import { loadEnvConfig } from "@next/env";
import { createHash } from "node:crypto";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

loadEnvConfig(process.cwd());
const hash = (value: string) =>
  createHash("sha256").update(value, "utf8").digest("hex");
const plain = (value: unknown): Record<string, any> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("EVIDENCE_REVISION_EXPECTED_RECORD");
  }
  return value as Record<string, any>;
};
const assert = (ok: unknown, code: string): asserts ok => {
  if (!ok) throw new Error(code);
};

const SOURCE_URL =
  "https://www.experian.com/blogs/ask-experian/does-credit-monitoring-hurt-credit-score/";
const TARGET_HEADING = "Does Credit Monitoring Affect Your Credit Score?";
const OLD_CLAIM_ID = "claim-score-inquiry";
const SOURCE_ID = "source-score-impact-experian-reviewed-v1";
const EVIDENCE_ID = "evidence-score-impact-experian-reviewed-v1";

async function main() {
  const [briefId, articleId] = process.argv.slice(2);
  if (![briefId, articleId].every(v => /^[a-zA-Z0-9_-]{1,100}$/.test(v ?? ""))) {
    throw new Error("USAGE: tsx scripts/content-stage-score-evidence-revision.ts BRIEF_ID ARTICLE_ID");
  }
  const base = resolve(".growth-os-tmp/final-article-closure");
  const cpDir = resolve(process.env.GROWTH_OS_ARTICLE_CHECKPOINT_DIR ??
    ".growth-os-tmp/article-checkpoints");
  const [markdown, manifestRaw, cpRaw] = await Promise.all([
    readFile(join(base, articleId + "-REVIEW-CANDIDATE.md"), "utf8"),
    readFile(join(base, articleId + "-REVIEW-CANDIDATE.json"), "utf8"),
    readFile(join(cpDir, articleId + "-POST_WRITER.json"), "utf8"),
  ]);
  const manifest = plain(JSON.parse(manifestRaw));
  const saved = plain(JSON.parse(cpRaw));
  const cp = plain(saved.checkpoint);
  const writer = plain(cp.writerRun);
  const originalSections = writer.sections as Array<{ heading: string; bodyMarkdown: string }>;
  assert(saved.sha256 === hash(JSON.stringify(cp)), "CHECKPOINT_INTEGRITY_FAILED");
  assert(manifest.sourceCheckpointSha256 === saved.sha256, "CANDIDATE_CHECKPOINT_VERSION_MISMATCH");
  assert(cp.version === "ARTICLE_RECOVERY_CHECKPOINT_V1" && cp.stage === "POST_WRITER",
    "WRITER_CHECKPOINT_STAGE_INVALID");
  assert(cp.articleId === articleId && cp.briefId === briefId &&
    manifest.articleId === articleId && manifest.briefId === briefId, "IDENTITY_MISMATCH");
  assert(Array.isArray(originalSections) && originalSections.length === 5 &&
    originalSections[3].heading === TARGET_HEADING, "ORIGINAL_SECTION_SCOPE_MISMATCH");
  const before = originalSections.map(s => hash(s.bodyMarkdown));
  assert(JSON.stringify(before) === JSON.stringify(manifest.sectionHashesBefore),
    "ORIGINAL_SECTION_DIGEST_MISMATCH");
  assert(JSON.stringify(manifest.changedSectionIndexes) === "[3]", "CANDIDATE_CHANGED_WRONG_SCOPE");
  assert(before.every((h, i) => i === 3 || h === manifest.sectionHashesAfter[i]),
    "ORIGINAL_SECTION_NOT_PRESERVED");
  assert(manifest.status === "REVIEW_ONLY_NOT_PERSISTED" &&
    manifest.source?.url === SOURCE_URL &&
    manifest.source?.verifiedClaimId === "claim-monitoring-score-direct-answer-v1",
    "CANDIDATE_SOURCE_PROVENANCE_MISMATCH");
  const headingMatch = /^# ([^\r\n]+)\r?\n(?:\r?\n)*/.exec(markdown);
  assert(headingMatch && headingMatch[1].trim() === writer.shell.h1.trim(),
    "CANDIDATE_H1_INVALID");
  const body = markdown.slice(headingMatch[0].length).trimEnd();
  assert(!/^#\s+/m.test(body), "PRODUCTION_BODY_H1_PRESENT");
  for (const section of originalSections) {
    assert(body.includes("## " + section.heading + "\n"), "CANDIDATE_HEADING_MISSING");
  }

  const { prisma } = await import("../src/lib/prisma");
  try {
    const [snapshot, article] = await Promise.all([
      prisma.contentEvidenceSnapshot.findUnique({
        where: { briefId },
        select: { plan: true },
      }),
      prisma.contentArticle.findUnique({
        where: { id: articleId },
        select: { briefId: true, status: true },
      }),
    ]);
    assert(snapshot && article && article.briefId === briefId &&
      article.status === "REJECTED", "EXISTING_REJECTED_ARTICLE_NOT_FOUND");
    const baseline = plain(snapshot.plan);
    const staged = plain(JSON.parse(JSON.stringify(baseline)));
    const runtime = plain(staged.masterRuntime);
    const ledger = plain(runtime.claimLedger);
    const graph = plain(runtime.evidenceGraph);
    const blueprint = plain(runtime.sectionBlueprints);
    const plan = plain(staged.articleExecutionPlan);
    assert(Array.isArray(ledger.claims) && Array.isArray(graph.sources) &&
      Array.isArray(graph.claimEvidence) && Array.isArray(blueprint.sections) &&
      Array.isArray(plan.sections), "SNAPSHOT_COMPONENTS_MISSING");
    const ownerIndex = plan.sections.findIndex((section: any) =>
      section.heading === TARGET_HEADING);
    assert(ownerIndex === 3 && blueprint.sections[ownerIndex]?.heading === TARGET_HEADING,
      "SCORE_SECTION_OWNER_MISMATCH");
    const sectionPlan = plan.sections[ownerIndex];
    const sectionBlueprint = blueprint.sections[ownerIndex];
    assert(sectionPlan.state === "WRITABLE", "TARGET_SECTION_NOT_WRITABLE");
    assert(sectionPlan.requiredClaimIds.includes(OLD_CLAIM_ID) &&
      sectionBlueprint.requiredClaims.includes(OLD_CLAIM_ID),
      "OLD_REQUIRED_CLAIM_NOT_PRESENT_IN_OWNER");
    assert(!plan.sections.some((s: any, i: number) =>
      i !== ownerIndex && s.requiredClaimIds.includes(OLD_CLAIM_ID)),
      "OLD_CLAIM_HAS_MULTIPLE_OWNERS");
    const newClaimId = manifest.source.verifiedClaimId;
    assert(!ledger.claims.some((c: any) => c.id === newClaimId),
      "NEW_CLAIM_ALREADY_IN_STORED_LEDGER");
    assert(!graph.sources.some((s: any) => s.id === SOURCE_ID) &&
      !graph.claimEvidence.some((e: any) => e.id === EVIDENCE_ID),
      "REVISION_EVIDENCE_ID_COLLISION");

    // Real crawler and exact-source-sentence verifier, NOT a manifest assertion.
    const { fetchSinglePage } = await import("../src/lib/crawler/crawler");
    const { findExactSourceSentenceV1 } =
      await import("../src/lib/content/exact-source-sentence-v1");
    const { findVerifiedExcerptCandidateV1 } =
      await import("../src/lib/content/live-evidence-verification");
    const { buildClaimLedger } = await import("../src/lib/content/claim-ledger");
    const { assertStoredPublicationEvidenceV1 } =
      await import("../src/lib/content/stored-publication-evidence-gate-v1");
    const { inspectMasterRuntimeSnapshot } =
      await import("../src/lib/content/master-runtime-adapter");
    const { parsePersistedArticleExecutionPlanV1 } =
      await import("../src/lib/content/article-execution-plan-binding-v1");
    const {
      assertArticlePreWriterEvidenceReadyV1,
      assertArticlePreWriterRequiredCoverageV1,
      assertArticlePreWriterAnswerSupportV2,
    } = await import("../src/lib/content/article-prewriter-evidence-gate-v1");
    const { assertPreWriterMissionAuthorityV1 } =
      await import("../src/lib/content/article-prewriter-mission-authority-gate-v1");

    const claimText = String(manifest.source.verifiedQuote ?? "");
    assert(claimText === "Credit monitoring has no impact on your credit scores.",
      "APPROVED_DIRECT_ANSWER_TEXT_MISMATCH");
    const page = await fetchSinglePage(SOURCE_URL, {
      timeoutMs: 15000, maxResponseSize: 2 * 1024 * 1024,
    });
    assert(!page.error && page.statusCode >= 200 && page.statusCode < 300 &&
      typeof page.parsed?.bodyText === "string", "OFFICIAL_SOURCE_FETCH_FAILED");
    const quote = findExactSourceSentenceV1({
      claimText, bodyText: page.parsed!.bodyText,
    });
    const verified = quote ? findVerifiedExcerptCandidateV1({
      claimText, bodyText: quote,
    }) : null;
    assert(quote === claimText && verified?.excerpt === quote,
      "NEW_CLAIM_NOT_VERIFIED_BY_LIVE_SOURCE");

    graph.sources.push({
      id: SOURCE_ID, url: SOURCE_URL, publisher: "Experian",
      sourceType: "REPUTABLE_SECONDARY", authorityTier: "C",
      jurisdiction: "United States", retrievedAt: new Date().toISOString(),
    });
    graph.claimEvidence.push({
      id: EVIDENCE_ID, claimId: newClaimId, sourceId: SOURCE_ID,
      relation: "SUPPORTS", kind: "VERIFIED_EXCERPT", excerpt: quote,
    });
    const inputs = ledger.claims.map((c: any) => ({
      id: c.id, text: c.text, category: c.category, risk: c.risk,
      ...(c.jurisdiction ? { jurisdiction: c.jurisdiction } : {}),
    }));
    inputs.push({
      id: newClaimId, text: claimText, category: "FACT",
      risk: "HIGH", jurisdiction: "United States",
    });
    const rebuilt = buildClaimLedger({
      claims: inputs, graph, asOf: new Date(),
    });
    for (const old of ledger.claims) {
      const now = rebuilt.claims.find(c => c.id === old.id);
      assert(now?.status === old.status, "OLD_CLAIM_STATUS_DRIFT:" + old.id);
    }
    const added = rebuilt.claims.find(c => c.id === newClaimId);
    assert(added?.status === "VERIFIED" && added.evidenceIds.includes(EVIDENCE_ID),
      "NEW_CLAIM_LEDGER_DID_NOT_VERIFY");
    runtime.claimLedger = rebuilt;

    const replaceClaim = (ids: string[]) =>
      [...new Set(ids.map(id => id === OLD_CLAIM_ID ? newClaimId : id))];
    const oldClaimEvidence = new Set(graph.claimEvidence.filter((e: any) =>
      e.claimId === OLD_CLAIM_ID).map((e: any) => e.id));
    const reviseEvidence = (ids: string[]) =>
      [...new Set([...ids.filter(id => !oldClaimEvidence.has(id)), EVIDENCE_ID])];

    sectionPlan.requiredClaimIds = replaceClaim(sectionPlan.requiredClaimIds);
    sectionPlan.evidenceIds = reviseEvidence(sectionPlan.evidenceIds);
    sectionBlueprint.requiredClaims = replaceClaim(sectionBlueprint.requiredClaims);
    sectionBlueprint.evidenceIds = reviseEvidence(sectionBlueprint.evidenceIds);
    plan.verifiedEvidenceIds = [...new Set([...(plan.verifiedEvidenceIds ?? []), EVIDENCE_ID])];

    const inspected = inspectMasterRuntimeSnapshot(staged);
    assert(inspected.runtime !== null, "STAGED_MASTER_RUNTIME_INVALID:" +
      inspected.blockers.join(","));
    assertStoredPublicationEvidenceV1(staged);
    const parsed = parsePersistedArticleExecutionPlanV1(plan);
    assertArticlePreWriterEvidenceReadyV1(parsed);
    assertArticlePreWriterRequiredCoverageV1(parsed);
    assertArticlePreWriterAnswerSupportV2(parsed);
    assertPreWriterMissionAuthorityV1({
      sections: parsed.sections,
      blueprints: inspected.runtime.sectionBlueprints.sections,
    });

    // Output is a LOCAL, UNCOMMITTED artifact and never modifies DB.
    const revision = {
      version: "STAGED_SCORE_EVIDENCE_REVISION_V1",
      status: "NOT_PERSISTED_NOT_READY_FOR_REVIEW",
      articleId, briefId, sourceCheckpointSha256: saved.sha256,
      originalPlanSha256: hash(JSON.stringify(baseline)),
      candidateArticleSha256: hash(JSON.stringify({
        title: writer.shell.title, metaDescription: writer.shell.metaDescription,
        h1: writer.shell.h1, bodyMarkdown: body,
      })),
      changedSectionIndex: ownerIndex,
      verifiedClaimId: newClaimId,
      verifiedEvidenceId: EVIDENCE_ID,
      stagedSnapshot: staged,
    };
    await mkdir(base, { recursive: true });
    const output = join(base, articleId + "-STAGED-EVIDENCE-REVISION.json");
    await writeFile(output, JSON.stringify(revision, null, 2) + "\n", {
      flag: "wx", mode: 0o600,
    });
    console.log(JSON.stringify({
      result: "STAGED_EVIDENCE_VALID",
      articleId, briefId, newClaim: newClaimId, verifiedQuote: quote,
      existingClaimStatusesPreserved: true,
      stagedPublicationEvidenceGate: "PASS",
      stagedPreWriterGates: "PASS",
      candidateArticleBodyUnmodified: true,
      output,
      nextBlockers: [
        "MASTER_CRITIC_REPLAY_FOR_EXACT_CANDIDATE_NOT_PERFORMED",
        "NO_SERP_REPLAY_FOR_EXACT_CANDIDATE_VERSION",
        "STAGED_EVIDENCE_NOT_PERSISTED",
      ],
      databaseUnchanged: true,
      originalCheckpointUnchanged: true,
      aiCalls: 0, paidSearchCalls: 0,
    }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}
main().catch(error => {
  console.error("STAGE_SCORE_EVIDENCE_FAILED:",
    error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
