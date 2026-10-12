/**
 * Existing article review candidate — READ ONLY. No model, search or DB writes.
 *
 * NODE_OPTIONS=--conditions=react-server \
 * GROWTH_OS_ARTICLE_CHECKPOINT_DIR="$PWD/.growth-os-tmp/article-checkpoints" \
 * npx tsx scripts/content-review-candidate-audit.ts BRIEF_ID ARTICLE_ID
 *
 * This does NOT authorize IN_REVIEW. It reports actual missing gates.
 */
import { loadEnvConfig } from "@next/env";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";

loadEnvConfig(process.cwd());

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const rec = (x: unknown): Record<string, unknown> | null =>
  x !== null && typeof x === "object" && !Array.isArray(x) ?
    x as Record<string, unknown> : null;
const entries = (x: unknown): unknown[] => Array.isArray(x) ? x : [];
const check = (fn: () => void): string => {
  try { fn(); return "PASS"; }
  catch (e) { return e instanceof Error ? e.message : String(e); }
};
const unique = (x: string[]) => [...new Set(x)];

async function main() {
  const [briefId, articleId] = process.argv.slice(2);
  if (![briefId, articleId].every(id => /^[a-zA-Z0-9_-]{1,100}$/.test(id ?? ""))) {
    throw new Error("USAGE: tsx scripts/content-review-candidate-audit.ts BRIEF_ID ARTICLE_ID");
  }
  const directory = resolve(".growth-os-tmp/final-article-closure");
  const cpDirectory = resolve(process.env.GROWTH_OS_ARTICLE_CHECKPOINT_DIR ??
    ".growth-os-tmp/article-checkpoints");
  const fileBase = join(directory, articleId + "-REVIEW-CANDIDATE");
  const [md, manifestRaw, cpRaw] = await Promise.all([
    readFile(fileBase + ".md", "utf8"),
    readFile(fileBase + ".json", "utf8"),
    readFile(join(cpDirectory, articleId + "-POST_WRITER.json"), "utf8"),
  ]);
  const manifest = JSON.parse(manifestRaw);
  const saved = JSON.parse(cpRaw);
  const cp = saved.checkpoint;
  const savedSections = cp?.writerRun?.sections;
  if (!Array.isArray(savedSections) || !cp?.writerRun?.shell) {
    throw new Error("CHECKPOINT_WRITER_RUN_MISSING");
  }

  // The preview is a standalone Markdown document with '# H1'. The production
  // article stores H1 separately and rejects H1 inside bodyMarkdown.
  const h1Match = /^# ([^\r\n]+)\r?\n(?:\r?\n)*/.exec(md);
  if (!h1Match) throw new Error("CANDIDATE_H1_NOT_FOUND");
  const bodyMarkdown = md.slice(h1Match[0].length).trimEnd();
  const article = {
    title: cp.writerRun.shell.title as string,
    metaDescription: cp.writerRun.shell.metaDescription as string,
    h1: cp.writerRun.shell.h1 as string,
    bodyMarkdown,
  };
  const beforeHashes = savedSections.map((s: {bodyMarkdown: string}) =>
    sha256(s.bodyMarkdown));
  const candidateChecks = {
    identity: manifest.briefId === briefId && manifest.articleId === articleId &&
      cp.briefId === briefId && cp.articleId === articleId,
    checkpointSha256: saved.sha256 === sha256(JSON.stringify(cp)) &&
      manifest.sourceCheckpointSha256 === saved.sha256,
    checkpointStage: cp.version === "ARTICLE_RECOVERY_CHECKPOINT_V1" &&
      cp.stage === "POST_WRITER",
    originalSectionHashes: JSON.stringify(beforeHashes) ===
      JSON.stringify(manifest.sectionHashesBefore),
    fourSectionsPreserved: beforeHashes.every((hash: string, i: number) =>
      i === 3 || hash === manifest.sectionHashesAfter?.[i]),
    onlySectionFourChanged: JSON.stringify(manifest.changedSectionIndexes) === "[3]",
    articleH1Matched: h1Match[1].trim() === article.h1.trim(),
    noH1InProductionBody: !/^#\s+/m.test(bodyMarkdown),
    sectionHeadingsIntact: savedSections.every((s: {heading: string}) =>
      bodyMarkdown.includes("## " + s.heading + "\n")),
    reviewOnly: manifest.status === "REVIEW_ONLY_NOT_PERSISTED",
    sourceQuoteOnManifest: Boolean(manifest.source?.verifiedQuote &&
      manifest.source?.url && manifest.source?.verifiedClaimId),
  };

  const { prisma } = await import("../src/lib/prisma");
  try {
    const [brief, existing, latestReplay] = await Promise.all([
      prisma.contentBrief.findUnique({
        where: { id: briefId },
        include: { evidenceSnapshot: true },
      }),
      prisma.contentArticle.findUnique({
        where: { id: articleId },
        select: {
          id: true, briefId: true, status: true, title: true,
          h1: true, bodyMarkdown: true, publishError: true,
        },
      }),
      prisma.serpReplayArtifact.findFirst({
        where: { contentArticleId: articleId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
          articleFingerprint: true,
          executionStatus: true,
          replayStatus: true,
        },
      }),
    ]);
    if (!brief || !existing) throw new Error("EXISTING_BRIEF_OR_ARTICLE_NOT_FOUND");
    const persisted = brief.evidenceSnapshot?.plan ?? null;
    const { auditArticle } = await import("../src/lib/content/content-quality");
    const { analyzeArticleAgainstPlan } =
      await import("../src/lib/content/content-plan-analysis");
    const { evaluateContentGate } = await import("../src/lib/content/content-gate");
    const { evaluateArticlePublicationPolicy } =
      await import("../src/lib/content/article-publication-policy");
    const { getBusinessFactRegistryForBrief } =
      await import("../src/lib/content/evidence-snapshot");
    const { assertStoredPublicationEvidenceV1 } =
      await import("../src/lib/content/stored-publication-evidence-gate-v1");
    const { parsePersistedArticleExecutionPlanV1 } =
      await import("../src/lib/content/article-execution-plan-binding-v1");
    const {
      assertArticlePreWriterEvidenceReadyV1,
      assertArticlePreWriterRequiredCoverageV1,
      assertArticlePreWriterAnswerSupportV2,
    } = await import("../src/lib/content/article-prewriter-evidence-gate-v1");
    const { buildSerpReplayArticleFingerprintV1 } =
      await import("../src/lib/content/serp-replay-fingerprint");
    const audit = auditArticle({ article, primaryKeyword: brief.primaryKeyword });
    const intelligence = analyzeArticleAgainstPlan({
      ...article,
      primaryKeyword: brief.primaryKeyword,
      secondaryKeywords: brief.secondaryKeywords,
      plan: persisted,
    });
    const registry = await getBusinessFactRegistryForBrief({
      briefId, websiteId: brief.websiteId,
    });
    const gate = evaluateContentGate({
      article, primaryKeyword: brief.primaryKeyword, audit, registry,
    });
    const policy = evaluateArticlePublicationPolicy({ article, intelligence });
    const publicationEvidence = check(() => assertStoredPublicationEvidenceV1(persisted));
    const preWriterPlan = check(() => {
      const plan = parsePersistedArticleExecutionPlanV1(rec(persisted)?.articleExecutionPlan);
      assertArticlePreWriterEvidenceReadyV1(plan);
      assertArticlePreWriterRequiredCoverageV1(plan);
      assertArticlePreWriterAnswerSupportV2(plan);
    });
    const ledger = rec(rec(persisted)?.masterRuntime);
    const claims = entries(rec(ledger?.claimLedger)?.claims).map(rec);
    const newClaimId = manifest.source?.verifiedClaimId;
    const newClaimInStoredLedger = claims.some(c =>
      c?.id === newClaimId && c?.status === "VERIFIED");
    const fingerprint = buildSerpReplayArticleFingerprintV1(article);
    const replayMatchesCandidate = latestReplay?.articleFingerprint === fingerprint;
    const blockerCodes = [
      ...Object.entries(candidateChecks).filter(([,ok]) => !ok).map(([key]) =>
        "CANDIDATE_CHECK_FAILED:" + key),
      ...(!existing || existing.briefId !== briefId ? ["EXISTING_ARTICLE_IDENTITY_MISMATCH"] : []),
      ...(!["REJECTED","BLOCKED_EXTERNAL"].includes(existing.status) ?
        ["EXISTING_ARTICLE_STATUS_NOT_SAFE_FOR_RECOVERY:" + existing.status] : []),
      ...(!gate.pass ? gate.blockingIssues.map(s => "CONTENT_GATE:" + s) : []),
      ...(!policy.pass ? policy.blockingIssues.map(s => "PUBLICATION_POLICY:" + s) : []),
      ...(publicationEvidence !== "PASS" ? [publicationEvidence] : []),
      ...(preWriterPlan !== "PASS" ? [preWriterPlan] : []),
      ...(!newClaimInStoredLedger ? ["NEW_DIRECT_ANSWER_CLAIM_NOT_VERSIONED_IN_STORED_LEDGER"] : []),
      ...(!replayMatchesCandidate ? ["NO_SERP_REPLAY_FOR_EXACT_CANDIDATE_VERSION"] : []),
      "MASTER_CRITIC_REPLAY_FOR_EXACT_CANDIDATE_NOT_PERFORMED",
    ];
    console.log(JSON.stringify({
      mode: "READ_ONLY_CANDIDATE_PRODUCTION_PREFLIGHT",
      briefId, articleId,
      existingArticleStatus: existing.status,
      candidateChecks,
      structure: {
        words: audit.wordCount,
        h2: audit.h2Count,
        h3: audit.h3Count,
        candidateContainsH1: Boolean(h1Match),
        productionBodyContainsH1: /^#\s+/m.test(bodyMarkdown),
        auditScore: audit.score,
        qualityIssues: audit.issues,
      },
      gates: {
        preWriterPlan,
        storedPublicationEvidence: publicationEvidence,
        contentGate: { pass: gate.pass, blockers: gate.blockingIssues,
          warnings: gate.warnings },
        publicationPolicy: { pass: policy.pass, blockers: policy.blockingIssues,
          warnings: policy.planWarnings },
        newClaimInStoredLedger,
        matchingSerpReplay: replayMatchesCandidate,
        latestSerpReplayStatus: latestReplay?.replayStatus ?? null,
        semanticCriticReplay: "NOT_EXECUTED",
      },
      blockers: unique(blockerCodes),
      readyForIN_REVIEW: false,
      databaseUnchanged: true,
      filesUnchanged: true,
      aiCalls: 0,
      paidSearchCalls: 0,
    }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}
main().catch(error => {
  console.error("CANDIDATE_PREFLIGHT_FAILED:",
    error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
