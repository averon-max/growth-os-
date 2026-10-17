import {
  describe,
  expect,
  it,
} from "vitest";
import {
  mkdtemp,
  readFile,
  rm,
  stat,
} from "node:fs/promises";
import {
  createHash,
} from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  writeArticleRecoveryCheckpointV1,
} from "./article-recovery-checkpoint-v1";
import type {
  MasterWriterRunV1,
} from "./master-writer-orchestrator";

const run = {
  version: "MASTER_WRITER_RUN_V1",
  article: {
    title: "Test",
    h1: "Test",
    metaDescription: "Test",
    bodyMarkdown: "## Test\n\nReal generated text.",
  },
  sections: [],
} as unknown as MasterWriterRunV1;

describe("real writer recovery checkpoint", () => {
  it("is disabled without explicit directory", async () => {
    expect(await writeArticleRecoveryCheckpointV1({
      articleId: "article-1",
      briefId: "brief-1",
      stage: "POST_WRITER",
      writerRun: run,
      directory: "",
    })).toBeNull();
  });

  it("writes original writer run with integrity hash", async () => {
    const directory = await mkdtemp(
      join(tmpdir(), "growth-os-checkpoint-test-")
    );

    try {
      const file = await writeArticleRecoveryCheckpointV1({
        articleId: "article-1",
        briefId: "brief-1",
        stage: "POST_WRITER",
        writerRun: run,
        directory,
      });

      expect(file).not.toBeNull();
      const raw = await readFile(file!, "utf8");
      const stored = JSON.parse(raw);

      expect(stored.checkpoint.writerRun.article.bodyMarkdown)
        .toBe(run.article.bodyMarkdown);

      expect(stored.checkpoint.stage).toBe("POST_WRITER");

      expect(
        createHash("sha256")
          .update(JSON.stringify(stored.checkpoint))
          .digest("hex")
      ).toBe(stored.sha256);

      if (process.platform !== "win32") {
        expect((await stat(file!)).mode & 0o777)
          .toBe(0o600);
      }
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  });

  it("retains final critic output separately", async () => {
    const directory = await mkdtemp(
      join(tmpdir(), "growth-os-checkpoint-test-")
    );

    try {
      const file = await writeArticleRecoveryCheckpointV1({
        articleId: "article-2",
        briefId: "brief-2",
        stage: "POST_MASTER_CRITIC",
        writerRun: run,
        finalCritics: {
          suite: { status: "BLOCK" },
        },
        directory,
      });

      const stored = JSON.parse(await readFile(file!, "utf8"));

      expect(stored.checkpoint.finalCritics.suite.status)
        .toBe("BLOCK");
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  });

  it("rejects unsafe identifiers", async () => {
    await expect(
      writeArticleRecoveryCheckpointV1({
        articleId: "../unsafe",
        briefId: "brief-1",
        stage: "POST_WRITER",
        writerRun: run,
        directory: "/tmp",
      })
    ).rejects.toThrow("ARTICLE_CHECKPOINT_INPUT_INVALID");
  });
});
