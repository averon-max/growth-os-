/** Section-level checkpoint for local CLI writer retries only. */
import { createHash } from "node:crypto";
import { mkdir, open, readFile, rename, unlink } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import type { ArticleGenerationContractV1 } from "./article-generation-contract";
import type { GeneratedArticleShellV1 } from "./master-article-shell-generator";
import type { VerifiedMasterSectionV1 } from "./master-section-repair";

export interface MasterWriterSectionProgressV1 {
  version: "MASTER_WRITER_SECTION_PROGRESS_V1";
  articleId: string;
  briefId: string;
  contractHash: string;
  modelName: string;
  shell: Readonly<GeneratedArticleShellV1>;
  accepted: readonly Readonly<VerifiedMasterSectionV1>[];
}

type ProgressInput = Omit<MasterWriterSectionProgressV1, "version">;

function hash(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

export function fingerprintMasterWriterContractV1(
  contract: Readonly<ArticleGenerationContractV1>,
  modelName: string
): string {
  // Includes section ordering, claims, evidence, execution-plan bindings, etc.
  return hash(JSON.stringify({ contract, modelName }));
}

function targetFile(directory: string, articleId: string): string {
  if (!isAbsolute(directory) || !/^[a-zA-Z0-9_-]{1,100}$/.test(articleId)) {
    throw new Error("MASTER_WRITER_PROGRESS_PATH_INVALID");
  }
  return join(directory, `${articleId}-SECTION_PROGRESS.json`);
}

function assertInput(progress: ProgressInput): void {
  if (
    !/^[a-zA-Z0-9_-]{1,100}$/.test(progress.briefId) ||
    !/^[a-f0-9]{64}$/.test(progress.contractHash) ||
    !progress.modelName ||
    progress.shell?.version !== "ARTICLE_SHELL_V1" ||
    !Array.isArray(progress.accepted) ||
    progress.accepted.some((entry) =>
      !entry || entry.section?.version !== "GENERATED_SECTION_V1" ||
      entry.reconciliation?.status === "BLOCK" ||
      (entry.semanticVerification?.status !== "PASS" &&
       entry.semanticVerification?.status !== "WARN") ||
      !entry.repair
    )
  ) {
    throw new Error("MASTER_WRITER_PROGRESS_INVALID");
  }
}

/** Atomic write, owner-only permissions. The prior complete checkpoint survives failures. */
export async function writeMasterWriterSectionProgressV1({
  directory,
  ...value
}: ProgressInput & { directory: string }): Promise<string> {
  const target = targetFile(directory, value.articleId);
  assertInput(value);
  const checkpoint: MasterWriterSectionProgressV1 = {
    version: "MASTER_WRITER_SECTION_PROGRESS_V1",
    ...value,
  };
  const body = JSON.stringify(checkpoint);
  const envelope = JSON.stringify({ sha256: hash(body), checkpoint });
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const temporary = join(directory, `${value.articleId}-SECTION_PROGRESS-${process.pid}-${Date.now()}.tmp`);
  const handle = await open(temporary, "wx", 0o600);
  try {
    await handle.writeFile(envelope, "utf8");
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

/** Never accept stale or corrupted data silently: resume fail-closed. */
export async function readMasterWriterSectionProgressV1({
  directory, articleId, briefId, contractHash, modelName,
}: {
  directory: string;
  articleId: string;
  briefId: string;
  contractHash: string;
  modelName: string;
}): Promise<MasterWriterSectionProgressV1 | null> {
  const target = targetFile(directory, articleId);
  let raw: string;
  try {
    raw = await readFile(target, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  let envelope: { sha256: string; checkpoint: MasterWriterSectionProgressV1 };
  try {
    envelope = JSON.parse(raw);
  } catch {
    throw new Error("MASTER_WRITER_PROGRESS_CORRUPTED");
  }
  if (!envelope || !envelope.checkpoint ||
      envelope.sha256 !== hash(JSON.stringify(envelope.checkpoint))) {
    throw new Error("MASTER_WRITER_PROGRESS_CORRUPTED");
  }
  const saved = envelope.checkpoint;
  if (saved.version !== "MASTER_WRITER_SECTION_PROGRESS_V1" ||
      saved.articleId !== articleId || saved.briefId !== briefId ||
      saved.contractHash !== contractHash || saved.modelName !== modelName) {
    throw new Error("MASTER_WRITER_PROGRESS_CONTRACT_MISMATCH");
  }
  assertInput(saved);
  return saved;
}
