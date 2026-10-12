/**
 * Evidence rescue diagnosis for the EXISTING credit-monitoring test article.
 * Does not modify the brief, DB, checkpoints or provider configuration.
 * It performs only two ordinary public website fetches, NO AI/DataForSEO calls.
 *
 * NODE_OPTIONS=--conditions=react-server npx tsx scripts/content-existing-article-evidence-rescue-audit.ts BRIEF_ID ARTICLE_ID
 */
import { loadEnvConfig } from "@next/env";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";

loadEnvConfig(process.cwd());

const urls = [
  "https://www.experian.com/blogs/ask-experian/does-credit-monitoring-hurt-credit-score/",
  "https://www.consumerfinance.gov/ask-cfpb/what-is-a-credit-inquiry-en-1317/",
] as const;
const proposedDirectAnswer = "Credit monitoring has no impact on your credit scores.";
const targetHeading = "Does Credit Monitoring Affect Your Credit Score?";
const requiredClaimId = "claim-score-inquiry";

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

async function main(): Promise<void> {
  const briefId = process.argv[2];
  const articleId = process.argv[3];
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(briefId ?? "") ||
      !/^[a-zA-Z0-9_-]{1,100}$/.test(articleId ?? "")) {
    throw new Error("USAGE: tsx scripts/content-existing-article-evidence-rescue-audit.ts BRIEF_ID ARTICLE_ID");
  }

  const { prisma } = await import("../src/lib/prisma");
  try {
    const snapshot = await prisma.contentEvidenceSnapshot.findUnique({
      where: { briefId },
      select: { plan: true },
    });
    if (!snapshot) throw new Error("BRIEF_EVIDENCE_SNAPSHOT_NOT_FOUND");

    const { inspectMasterRuntimeSnapshot } = await import("../src/lib/content/master-runtime-adapter");
    const inspection = inspectMasterRuntimeSnapshot(snapshot.plan);
    if (!inspection.runtime) {
      throw new Error("PERSISTED_MASTER_RUNTIME_INVALID:" + inspection.blockers.join(","));
    }
    const runtime = inspection.runtime;
    const section = runtime.sectionBlueprints.sections.find(item => item.heading === targetHeading);
    const oldClaim = runtime.claimLedger.claims.find(item => item.id === requiredClaimId);
    if (!section || !section.requiredClaims.includes(requiredClaimId) || !oldClaim) {
      throw new Error("EXPECTED_ORIGINAL_SECTION_CLAIM_NOT_FOUND");
    }

    const directory = resolve(process.env.GROWTH_OS_ARTICLE_CHECKPOINT_DIR ??
      ".growth-os-tmp/article-checkpoints");
    const checkpointPath = join(directory, articleId + "-POST_WRITER.json");
    const envelope = JSON.parse(await readFile(checkpointPath, "utf8")) as {
      sha256: string;
      checkpoint: {
        articleId: string;
        briefId: string;
        stage: string;
        writerRun: {
          sections: Array<{ bodyMarkdown: string; heading: string }>;
        };
      };
    };
    if (envelope.sha256 !== sha256(JSON.stringify(envelope.checkpoint)) ||
        envelope.checkpoint.articleId !== articleId ||
        envelope.checkpoint.briefId !== briefId ||
        envelope.checkpoint.stage !== "POST_WRITER") {
      throw new Error("POST_WRITER_CHECKPOINT_INTEGRITY_FAILED");
    }
    const savedSections = envelope.checkpoint.writerRun.sections;

    console.log("=== EXISTING ARTICLE EVIDENCE RESCUE — READ ONLY ===");
    console.log("BRIEF:", briefId);
    console.log("ARTICLE:", articleId);
    console.log("OLD_CLAIM_ID:", oldClaim.id);
    console.log("OLD_CLAIM_STATUS:", oldClaim.status);
    console.log("OLD_CLAIM_TEXT:", oldClaim.text);
    console.log("ASSIGNED_EVIDENCE_IDS:", section.evidenceIds.length);
    console.log("CHECKPOINT_SECTIONS:", savedSections.length);
    for (const [index, savedSection] of savedSections.entries()) {
      console.log("SAVED_SECTION:", JSON.stringify({
        index,
        heading: savedSection.heading,
        sha256: sha256(savedSection.bodyMarkdown),
      }));
    }

    const { fetchSinglePage } = await import("../src/lib/crawler/crawler");
    const { findVerifiedExcerptCandidateV1 } = await import("../src/lib/content/live-evidence-verification");
    const { isSafeMissionPreservingClaimReplanCandidateV1 } = await import("../src/lib/content/claim-replan-safety-v1");

    console.log("PROPOSED_NEW_DIRECT_ANSWER:", proposedDirectAnswer);
    const isSafeSameClaimRewrite = isSafeMissionPreservingClaimReplanCandidateV1({
      originalText: oldClaim.text,
      candidateText: proposedDirectAnswer,
      primaryQuery: "what is credit monitoring",
      sectionHeading: section.heading,
      sectionMission: section.mission,
      sectionQuestions: [section.heading],
    });
    console.log("SAME_CLAIM_REPLAN_SAFETY_CHECK:", isSafeSameClaimRewrite);
    console.log("DIRECT_ANSWER_NEEDS_REPLANNING:", true);

    let directAnswerVerified = false;
    for (const url of urls) {
      const page = await fetchSinglePage(url, {
        timeoutMs: 12000,
        maxResponseSize: 2 * 1024 * 1024,
      });
      const usable = !page.error && page.statusCode >= 200 &&
        page.statusCode < 300 && Boolean(page.parsed?.bodyText);
      const text = usable ? page.parsed!.bodyText : "";
      const originalMatch = text ? findVerifiedExcerptCandidateV1({
        claimText: oldClaim.text,
        bodyText: text,
      }) : null;
      const directMatch = text ? findVerifiedExcerptCandidateV1({
        claimText: proposedDirectAnswer,
        bodyText: text,
      }) : null;

      directAnswerVerified ||= directMatch !== null;
      console.log("SOURCE_CHECK:", JSON.stringify({
        url,
        statusCode: page.statusCode,
        fetched: usable,
        fetchError: page.error ?? null,
        oldClaimLexicalMatch: Boolean(originalMatch),
        newDirectAnswerLexicalMatch: Boolean(directMatch),
        directExcerpt: directMatch?.excerpt.slice(0, 350) ?? null,
      }));
    }
    console.log("SOURCE_LEVEL_DIRECT_ANSWER_CANDIDATE:", directAnswerVerified ? "FOUND" : "NOT_FOUND");
    console.log("PERSISTED_EVIDENCE_CHANGED:", false);
    console.log("WRITER_CHECKPOINT_CHANGED:", false);
    console.log("DO_NOT_AUTO_PROMOTE_TO_VERIFIED_CLAIM:", true);
    console.log("NO_MODEL_CALLS; NO_DATAFORSEO_CALLS; DATABASE_UNCHANGED; CHECKPOINT_UNCHANGED");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(error => {
  console.error("EXISTING_ARTICLE_EVIDENCE_RESCUE_FAILED:",
    error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
