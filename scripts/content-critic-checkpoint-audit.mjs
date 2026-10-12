#!/usr/bin/env node
/**
 * Read-only local audit of the canonical article checkpoints.
 *
 * Usage:
 *   node scripts/content-critic-checkpoint-audit.mjs ARTICLE_ID [SECTION_INDEX]
 *
 * No model calls, DB updates, outbound requests, or checkpoint mutations.
 * Prints the problematic section before/after Master Critic and the exact
 * final critic findings. Does not print process.env or credentials.
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const articleId = process.argv[2];
const sectionIndex = Number(process.argv[3] ?? "3");
if (!/^[A-Za-z0-9_-]{1,100}$/.test(articleId ?? "") ||
    !Number.isSafeInteger(sectionIndex) || sectionIndex < 0) {
  console.error("Usage: node scripts/content-critic-checkpoint-audit.mjs ARTICLE_ID [SECTION_INDEX]");
  process.exitCode = 2;
} else {
  const directory = resolve(
    process.env.GROWTH_OS_ARTICLE_CHECKPOINT_DIR ??
    ".growth-os-tmp/article-checkpoints"
  );
  const hash = value => createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");

  async function readCheckpoint(stage) {
    const file = join(directory, `${articleId}-${stage}.json`);
    const envelope = JSON.parse(await readFile(file, "utf8"));
    if (!envelope?.checkpoint || envelope.sha256 !== hash(envelope.checkpoint)) {
      throw new Error(`CHECKPOINT_HASH_INVALID:${stage}`);
    }
    const checkpoint = envelope.checkpoint;
    if (checkpoint.articleId !== articleId || checkpoint.stage !== stage ||
        checkpoint.writerRun?.version !== "MASTER_WRITER_RUN_V1") {
      throw new Error(`CHECKPOINT_IDENTITY_INVALID:${stage}`);
    }
    return checkpoint;
  }

  try {
    const [before, after] = await Promise.all([
      readCheckpoint("POST_WRITER"),
      readCheckpoint("POST_MASTER_CRITIC"),
    ]);
    if (before.briefId !== after.briefId) {
      throw new Error("CHECKPOINT_BRIEF_MISMATCH");
    }
    const original = before.writerRun.sections[sectionIndex];
    const revised = after.writerRun.sections[sectionIndex];
    if (!original || !revised) {
      throw new Error("SECTION_NOT_PRESENT");
    }
    const words = value => (value.match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu) ?? []).length;
    const findings = after.finalCritics?.suite?.findings ?? [];
    const localFindings = findings.filter(f =>
      f.location?.scope === "SECTION" && f.location.sectionIndex === sectionIndex
    );
    const writerVerification = before.writerRun.semanticVerifications?.[sectionIndex];
    const afterVerification = after.writerRun.semanticVerifications?.[sectionIndex];

    console.log("=== CRITIC CHECKPOINT AUDIT — READ ONLY ===");
    console.log("ARTICLE:", articleId, "BRIEF:", before.briefId);
    console.log("SECTION:", sectionIndex, "HEADING:", original.heading);
    console.log("POST_WRITER_WORDS:", words(original.bodyMarkdown));
    console.log("POST_CRITIC_WORDS:", words(revised.bodyMarkdown));
    console.log("POST_WRITER_SEMANTIC:", writerVerification?.status ?? "UNKNOWN");
    console.log("POST_CRITIC_SEMANTIC:", afterVerification?.status ?? "UNKNOWN");
    console.log("POST_CRITIC_FINDINGS:", localFindings.length);
    console.log("\n=== WRITER VERSION ===\n" + original.bodyMarkdown);
    console.log("\n=== POST-CRITIC VERSION ===\n" + revised.bodyMarkdown);
    console.log("\n=== EXACT FINAL FINDINGS ===");
    for (const f of localFindings) {
      console.log(JSON.stringify({
        critic: f.criticId,
        severity: f.severity,
        code: f.code,
        message: f.message,
        recommendation: f.recommendation,
        evidence: f.evidence,
      }, null, 2));
    }
    console.log("\nREAD_ONLY; NO_MODEL_CALLS; DATABASE_UNCHANGED");
  } catch (error) {
    console.error("CHECKPOINT_AUDIT_FAILED:", error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
