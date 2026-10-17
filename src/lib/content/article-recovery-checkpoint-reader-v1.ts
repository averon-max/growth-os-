import { createHash, timingSafeEqual } from "node:crypto";
import { readFile, lstat } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import type { MasterWriterRunV1 } from "./master-writer-orchestrator";
import type {
  ArticleRecoveryCheckpointStageV1,
} from "./article-recovery-checkpoint-v1";

const validId = (value: string): boolean =>
  /^[a-zA-Z0-9_-]{1,100}$/.test(value);

export interface RestoredArticleRecoveryCheckpointV1 {
  version: "ARTICLE_RECOVERY_CHECKPOINT_V1";
  stage: ArticleRecoveryCheckpointStageV1;
  articleId: string;
  briefId: string;
  savedAt: string;
  writerRun: Readonly<MasterWriterRunV1>;
  finalCritics: unknown | null;
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" &&
    value !== null && !Array.isArray(value);
}

export async function readArticleRecoveryCheckpointV1({
  articleId,
  briefId,
  stage,
  directory,
}: {
  articleId: string;
  briefId: string;
  stage: ArticleRecoveryCheckpointStageV1;
  directory: string;
}): Promise<Readonly<RestoredArticleRecoveryCheckpointV1>> {
  if (
    !isAbsolute(directory) ||
    !validId(articleId) ||
    !validId(briefId) ||
    !["POST_WRITER", "POST_MASTER_CRITIC", "POST_FINAL_REPLAY"].includes(stage)
  ) {
    throw new Error("ARTICLE_CHECKPOINT_READ_INPUT_INVALID");
  }

  const filename = join(directory, `${articleId}-${stage}.json`);

  const metadata = await lstat(filename);

  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    throw new Error("ARTICLE_CHECKPOINT_UNSAFE_FILE");
  }

  if (metadata.size > 10 * 1024 * 1024) {
    throw new Error("ARTICLE_CHECKPOINT_TOO_LARGE");
  }

  const raw = await readFile(filename, "utf8");
  const parsed: unknown = JSON.parse(raw);

  if (!object(parsed) ||
      !object(parsed.checkpoint) ||
      typeof parsed.sha256 !== "string") {
    throw new Error("ARTICLE_CHECKPOINT_FORMAT_INVALID");
  }

  const checkpoint = parsed.checkpoint;

  const expectedHash = createHash("sha256")
    .update(JSON.stringify(checkpoint))
    .digest("hex");

  const actualHash = parsed.sha256;

  if (
    !/^[0-9a-f]{64}$/.test(actualHash) ||
    !timingSafeEqual(
      Buffer.from(expectedHash, "hex"),
      Buffer.from(actualHash, "hex")
    )
  ) {
    throw new Error("ARTICLE_CHECKPOINT_INTEGRITY_FAILED");
  }

  if (
    checkpoint.version !== "ARTICLE_RECOVERY_CHECKPOINT_V1" ||
    checkpoint.articleId !== articleId ||
    checkpoint.briefId !== briefId ||
    checkpoint.stage !== stage ||
    typeof checkpoint.savedAt !== "string" ||
    !object(checkpoint.writerRun)
  ) {
    throw new Error("ARTICLE_CHECKPOINT_IDENTITY_INVALID");
  }

  const run = checkpoint.writerRun;

  if (
    run.version !== "MASTER_WRITER_RUN_V1" ||
    !object(run.article) ||
    typeof run.article.bodyMarkdown !== "string" ||
    !Array.isArray(run.sections) ||
    !Array.isArray(run.reconciliations) ||
    !Array.isArray(run.semanticVerifications)
  ) {
    throw new Error("ARTICLE_CHECKPOINT_RUN_INVALID");
  }

  return checkpoint as unknown as Readonly<RestoredArticleRecoveryCheckpointV1>;
}
