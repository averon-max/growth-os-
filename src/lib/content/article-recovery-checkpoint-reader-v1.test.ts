import { describe, expect, it } from "vitest";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import {
  writeArticleRecoveryCheckpointV1,
} from "./article-recovery-checkpoint-v1";
import {
  readArticleRecoveryCheckpointV1,
} from "./article-recovery-checkpoint-reader-v1";
import type { MasterWriterRunV1 } from "./master-writer-orchestrator";

const run = {
  version: "MASTER_WRITER_RUN_V1",
  article: {
    title: "Test",
    h1: "Test",
    metaDescription: "Test",
    bodyMarkdown: "## Test\n\nValid text.",
  },
  sections: [{ heading: "Test", bodyMarkdown: "Valid text." }],
  reconciliations: [{ status: "PASS" }],
  semanticVerifications: [{ status: "PASS" }],
} as unknown as MasterWriterRunV1;

describe("Article Recovery Checkpoint Reader", () => {
  it("restores a checkpoint without a Writer call", async () => {
    const dir = await mkdtemp(join(tmpdir(), "growth-reader-"));
    try {
      await writeArticleRecoveryCheckpointV1({
        articleId: "article-1",
        briefId: "brief-1",
        stage: "POST_WRITER",
        writerRun: run,
        directory: dir,
      });

      const restored = await readArticleRecoveryCheckpointV1({
        articleId: "article-1",
        briefId: "brief-1",
        stage: "POST_WRITER",
        directory: dir,
      });

      expect(restored.writerRun.article.bodyMarkdown)
        .toBe(run.article.bodyMarkdown);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects wrong Brief ID", async () => {
    const dir = await mkdtemp(join(tmpdir(), "growth-reader-"));
    try {
      await writeArticleRecoveryCheckpointV1({
        articleId: "article-2",
        briefId: "brief-2",
        stage: "POST_WRITER",
        writerRun: run,
        directory: dir,
      });

      await expect(readArticleRecoveryCheckpointV1({
        articleId: "article-2",
        briefId: "other-brief",
        stage: "POST_WRITER",
        directory: dir,
      })).rejects.toThrow("ARTICLE_CHECKPOINT_IDENTITY_INVALID");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects tampered content", async () => {
    const dir = await mkdtemp(join(tmpdir(), "growth-reader-"));
    try {
      const file = await writeArticleRecoveryCheckpointV1({
        articleId: "article-3",
        briefId: "brief-3",
        stage: "POST_WRITER",
        writerRun: run,
        directory: dir,
      });

      const saved = JSON.parse(await readFile(file!, "utf8"));
      saved.checkpoint.writerRun.article.bodyMarkdown = "TAMPERED";
      await writeFile(file!, JSON.stringify(saved));

      await expect(readArticleRecoveryCheckpointV1({
        articleId: "article-3",
        briefId: "brief-3",
        stage: "POST_WRITER",
        directory: dir,
      })).rejects.toThrow("ARTICLE_CHECKPOINT_INTEGRITY_FAILED");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects invalid stage", async () => {
    await expect(readArticleRecoveryCheckpointV1({
      articleId: "article-1",
      briefId: "brief-1",
      stage: "UNKNOWN" as "POST_WRITER",
      directory: "/tmp",
    })).rejects.toThrow("ARTICLE_CHECKPOINT_READ_INPUT_INVALID");
  });
});
