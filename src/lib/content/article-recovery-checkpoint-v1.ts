import {
  createHash,
} from "node:crypto";
import {
  mkdir,
  open,
  rename,
  unlink,
} from "node:fs/promises";
import {
  isAbsolute,
  join,
} from "node:path";
import type {
  MasterWriterRunV1,
} from "./master-writer-orchestrator";

export type ArticleRecoveryCheckpointStageV1 =
  | "POST_WRITER"
  | "POST_MASTER_CRITIC"
  | "POST_FINAL_REPLAY";

export interface ArticleRecoveryCheckpointV1 {
  version: "ARTICLE_RECOVERY_CHECKPOINT_V1";
  stage: ArticleRecoveryCheckpointStageV1;
  articleId: string;
  briefId: string;
  savedAt: string;
  writerRun: Readonly<MasterWriterRunV1>;
  finalCritics: unknown | null;
}

function validId(value: string): boolean {
  return /^[a-zA-Z0-9_-]{1,100}$/.test(value);
}

/**
 * Explicit opt-in for a single-machine recovery checkpoint.
 * Do not treat local disk as durable SaaS storage.
 */
export async function writeArticleRecoveryCheckpointV1({
  articleId,
  briefId,
  stage,
  writerRun,
  finalCritics = null,
  directory = process.env.GROWTH_OS_ARTICLE_CHECKPOINT_DIR,
}: {
  articleId: string;
  briefId: string;
  stage: ArticleRecoveryCheckpointStageV1;
  writerRun: Readonly<MasterWriterRunV1>;
  finalCritics?: unknown | null;
  directory?: string;
}): Promise<string | null> {
  if (!directory) {
    return null;
  }

  if (
    !isAbsolute(directory) ||
    !validId(articleId) ||
    !validId(briefId) ||
    (stage !== "POST_WRITER" &&
      stage !== "POST_MASTER_CRITIC" &&
      stage !== "POST_FINAL_REPLAY")
  ) {
    throw new Error("ARTICLE_CHECKPOINT_INPUT_INVALID");
  }

  if (
    writerRun.version !== "MASTER_WRITER_RUN_V1" ||
    typeof writerRun.article?.bodyMarkdown !== "string"
  ) {
    throw new Error("ARTICLE_CHECKPOINT_WRITER_RUN_INVALID");
  }

  const checkpoint: ArticleRecoveryCheckpointV1 = {
    version: "ARTICLE_RECOVERY_CHECKPOINT_V1",
    stage,
    articleId,
    briefId,
    savedAt: new Date().toISOString(),
    writerRun,
    finalCritics,
  };

  const json = JSON.stringify(checkpoint);
  const digest = createHash("sha256")
    .update(json)
    .digest("hex");

  const payload = JSON.stringify({
    sha256: digest,
    checkpoint,
  });

  await mkdir(directory, {
    recursive: true,
    mode: 0o700,
  });

  const target = join(
    directory,
    `${articleId}-${stage}.json`
  );

  const temporary = join(
    directory,
    `${articleId}-${stage}-${process.pid}-${Date.now()}.tmp`
  );

  const handle = await open(temporary, "wx", 0o600);

  try {
    await handle.writeFile(payload, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }

  try {
    await rename(temporary, target);
  } catch (error) {
    await unlink(temporary).catch(() => {});
    throw error;
  }

  return target;
}
