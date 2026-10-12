/**
 * FINAL CLOSURE — read-only DB/checkpoints; source-verified local preview.
 * No model calls, paid search, DB writes or changes to existing checkpoints.
 *
 * NODE_OPTIONS=--conditions=react-server npx tsx scripts/content-article-final-closure-preview.ts BRIEF_ID ARTICLE_ID
 */
import { loadEnvConfig } from "@next/env";
import { createHash } from "node:crypto";
import { mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";

loadEnvConfig(process.cwd());

const sourceUrl =
  "https://www.experian.com/blogs/ask-experian/does-credit-monitoring-hurt-credit-score/";

function sha(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

async function atomicSave(path: string, data: string): Promise<void> {
  const temp = path + "." + process.pid + ".tmp";
  const h = await open(temp, "wx", 0o600);
  try {
    await h.writeFile(data, "utf8");
    await h.sync();
  } finally {
    await h.close();
  }
  try {
    await rename(temp, path);
  } catch (error) {
    await unlink(temp).catch(() => undefined);
    throw error;
  }
}

async function main(): Promise<void> {
  const briefId = process.argv[2];
  const articleId = process.argv[3];
  if (![briefId, articleId].every(value =>
    /^[a-zA-Z0-9_-]{1,100}$/.test(value ?? ""))) {
    throw new Error("USAGE: tsx scripts/content-article-final-closure-preview.ts BRIEF_ID ARTICLE_ID");
  }

  const cpDir = resolve(process.env.GROWTH_OS_ARTICLE_CHECKPOINT_DIR ??
    ".growth-os-tmp/article-checkpoints");
  const cpFile = join(cpDir, articleId! + "-POST_WRITER.json");
  const raw = JSON.parse(await readFile(cpFile, "utf8")) as {
    sha256: string;
    checkpoint: {
      version: string;
      stage: string;
      articleId: string;
      briefId: string;
      writerRun: {
        shell: { h1: string; title: string; metaDescription: string };
        sections: Array<{ heading: string; bodyMarkdown: string }>;
      };
    };
  };
  const cp = raw.checkpoint;
  if (raw.sha256 !== sha(JSON.stringify(cp)) ||
      cp.version !== "ARTICLE_RECOVERY_CHECKPOINT_V1" ||
      cp.stage !== "POST_WRITER" ||
      cp.articleId !== articleId ||
      cp.briefId !== briefId) {
    throw new Error("FINAL_CLOSURE_CHECKPOINT_INTEGRITY_FAILED");
  }

  // Source fetch uses the existing SSRF-safe crawler.
  const { fetchSinglePage } = await import("../src/lib/crawler/crawler");
  const {
    SCORE_IMPACT_DIRECT_CLAIM_V1,
    composeScoreImpactClosurePreviewV1,
  } = await import("../src/lib/content/score-impact-closure-preview-v1");
  const { findExactSourceSentenceV1 } = await import("../src/lib/content/exact-source-sentence-v1");
  const { findVerifiedExcerptCandidateV1 } = await import("../src/lib/content/live-evidence-verification");

  const source = await fetchSinglePage(sourceUrl, {
    timeoutMs: 15000,
    maxResponseSize: 2 * 1024 * 1024,
  });
  if (source.error || source.statusCode < 200 || source.statusCode >= 300 ||
      !source.parsed || source.parsed.bodyText.length < 200) {
    throw new Error("FINAL_CLOSURE_OFFICIAL_SOURCE_FETCH_FAILED:" +
      (source.error ?? source.statusCode));
  }
  const quote = findExactSourceSentenceV1({
    claimText: SCORE_IMPACT_DIRECT_CLAIM_V1,
    bodyText: source.parsed.bodyText,
  });
  const proof = quote ? findVerifiedExcerptCandidateV1({
    claimText: SCORE_IMPACT_DIRECT_CLAIM_V1,
    bodyText: quote,
  }) : null;
  if (!quote || !proof || proof.excerpt !== quote) {
    throw new Error("FINAL_CLOSURE_EXACT_SOURCE_SENTENCE_UNVERIFIED");
  }

  const preview = composeScoreImpactClosurePreviewV1({
    h1: cp.writerRun.shell.h1,
    sections: cp.writerRun.sections,
    verifiedDirectQuote: quote,
  });

  const output = resolve(".growth-os-tmp/final-article-closure");
  await mkdir(output, { recursive: true, mode: 0o700 });
  const markdownPath = join(output, articleId! + "-REVIEW-CANDIDATE.md");
  const manifestPath = join(output, articleId! + "-REVIEW-CANDIDATE.json");

  const manifest = {
    version: "SCORE_IMPACT_CLOSURE_PREVIEW_V1",
    status: "REVIEW_ONLY_NOT_PERSISTED",
    briefId,
    articleId,
    sourceCheckpointSha256: raw.sha256,
    source: {
      url: sourceUrl,
      verifiedClaimId: preview.newClaimId,
      verifiedQuote: quote,
      verifiedExcerpt: proof.excerpt,
      sourceStatus: source.statusCode,
    },
    changedSectionIndexes: preview.changedSectionIndexes,
    sectionHashesBefore: preview.sectionHashesBefore,
    sectionHashesAfter: preview.sectionHashesAfter,
    words: preview.wordCount,
    h1Count: (preview.markdown.match(/^# /gm) ?? []).length,
    h2Count: (preview.markdown.match(/^## /gm) ?? []).length,
    h3Count: (preview.markdown.match(/^### /gm) ?? []).length,
    originalClaimUnmodified: true,
    databaseChanged: false,
    checkpointChanged: false,
    approvedForPublication: false,
    note: "Standalone review draft. New claim/evidence must be versioned and reviewed before it can become an official IN_REVIEW article.",
  };

  // Check both outputs before creating either, so an existing manual
  // edit cannot produce a partially updated candidate pair.
  const outputs = [
    [markdownPath, preview.markdown],
    [manifestPath, JSON.stringify(manifest, null, 2) + "\n"],
  ] as const;
  for (const [target] of outputs) {
    try {
      await readFile(target, "utf8");
      throw new Error("FINAL_CLOSURE_CANDIDATE_ALREADY_EXISTS:" + target);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  for (const [target, data] of outputs) {
    await atomicSave(target, data);
  }

  console.log("=== FINAL ARTICLE CLOSURE REVIEW CANDIDATE ===");
  console.log("EXACT_SOURCE_QUOTE_VERIFIED:", true);
  console.log("PRESERVED_SECTION_INDICES:", "0,1,2,4");
  console.log("CHANGED_SECTION_INDICES:", preview.changedSectionIndexes.join(","));
  console.log("H1:", manifest.h1Count, "H2:", manifest.h2Count, "H3:", manifest.h3Count);
  console.log("WORDS:", manifest.words);
  console.log("REVIEW_MARKDOWN:", markdownPath);
  console.log("EVIDENCE_MANIFEST:", manifestPath);
  console.log("STATUS: REVIEW_ONLY_NOT_PERSISTED");
  console.log("NO_AI_CALLS; NO_DATAFORSEO; DATABASE_UNCHANGED; ORIGINAL_CHECKPOINT_UNCHANGED");
}

main().catch(error => {
  console.error("FINAL_ARTICLE_CLOSURE_FAILED:",
    error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
