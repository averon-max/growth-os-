/** JSONB-stable checkpoint codec. No database access or side effects. */
import { createHash } from "node:crypto";
import type { MasterWriterSectionProgressV1 } from "./master-writer-section-progress-v1";

type ProgressData = Omit<MasterWriterSectionProgressV1, "version">;
type Identity = Pick<ProgressData, "articleId" | "briefId" | "contractHash" | "modelName">;

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// PostgreSQL JSONB sorts/reorders object keys. Hash MUST be key-order independent.
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (record(value)) {
    return `{${Object.keys(value).sort().map(key =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`
    ).join(",")}}`;
  }
  const encoded = JSON.stringify(value);
  if (encoded === undefined) throw new Error("MASTER_WRITER_DB_PROGRESS_NON_JSON_VALUE");
  return encoded;
}

function sha256(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

function validate(value: unknown): asserts value is MasterWriterSectionProgressV1 {
  if (!record(value) || value.version !== "MASTER_WRITER_SECTION_PROGRESS_V1" ||
      typeof value.articleId !== "string" || typeof value.briefId !== "string" ||
      !/^[a-f0-9]{64}$/.test(String(value.contractHash)) ||
      typeof value.modelName !== "string" || !value.modelName.trim() ||
      !record(value.shell) || value.shell.version !== "ARTICLE_SHELL_V1" ||
      !Array.isArray(value.accepted) || value.accepted.some((part: unknown) =>
        !record(part) || !record(part.section) ||
        part.section.version !== "GENERATED_SECTION_V1" ||
        !record(part.semanticVerification) ||
        !["PASS", "WARN"].includes(String(part.semanticVerification.status)) ||
        !record(part.reconciliation) || part.reconciliation.status === "BLOCK" ||
        !record(part.repair)
      )) {
    throw new Error("MASTER_WRITER_DB_PROGRESS_INVALID");
  }
}

export function encodeMasterWriterDatabaseProgressV1(value: ProgressData): Readonly<{
  sha256: string;
  checkpoint: MasterWriterSectionProgressV1;
}> {
  // Round-trip makes Date instances and undefined fields JSON-compatible.
  const normalized: unknown = JSON.parse(JSON.stringify({
    version: "MASTER_WRITER_SECTION_PROGRESS_V1", ...value,
  }));
  validate(normalized);
  return { sha256: sha256(canonicalJson(normalized)), checkpoint: normalized };
}

export function decodeMasterWriterDatabaseProgressV1(
  envelope: unknown, expected: Identity
): MasterWriterSectionProgressV1 | null {
  if (envelope == null) return null;
  if (!record(envelope) || typeof envelope.sha256 !== "string" ||
      !Object.hasOwn(envelope, "checkpoint")) {
    throw new Error("MASTER_WRITER_DB_PROGRESS_CORRUPTED");
  }
  if (sha256(canonicalJson(envelope.checkpoint)) !== envelope.sha256) {
    throw new Error("MASTER_WRITER_DB_PROGRESS_CORRUPTED");
  }
  validate(envelope.checkpoint);
  const saved = envelope.checkpoint;
  if (saved.articleId !== expected.articleId || saved.briefId !== expected.briefId ||
      saved.contractHash !== expected.contractHash || saved.modelName !== expected.modelName) {
    throw new Error("MASTER_WRITER_DB_PROGRESS_CONTRACT_MISMATCH");
  }
  return saved;
}
