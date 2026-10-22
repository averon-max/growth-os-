import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { chmod, lstat, mkdir, open, realpath } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import { join, resolve } from "node:path";
import { diagnoseWriterFailureV1 } from "./writer-failure-diagnosis-v1";

/**
 * Append-only execution evidence, NOT model chain-of-thought.
 * One local JSONL file holds every run: .growth-os-traces/writer-runs.jsonl.
 * Private prompt/output snapshots are inline only when explicitly opted in.
 * Never write traces to public/ or commit the log.
 */
interface TraceContextV1 {
  readonly runId: string;
  readonly filePath: string;
  readonly handle: FileHandle;
  sequence: number;
  pending: Promise<void>;
  writeFailures: number;
}

const context = new AsyncLocalStorage<TraceContextV1>();
// Serialize appends from concurrent runs in this process. Every event is synced
// before its write task resolves; per-run event IDs still allow reconstruction.
let sharedTraceWriteQueue: Promise<void> = Promise.resolve();
const SAFE_METADATA_STRING_KEYS = new Set([
  "stage", "scope", "phase", "model", "status", "articleStatus",
  "errorName", "version", "route", "reasonCode", "severity",
  "source", "textMode", "owner", "generationMode", "readiness",
  "failureClass", "code", "responseStatus", "omittedReason",
  "promptSha256", "outputSha256", "artifactSha256",
  "correlationSha256", "briefIdSha256", "websiteIdSha256",
  "requestId", "responseId", "articleIdHash", "templateId",
  "recommendedAction", "pageType", "searchIntent", "templatePolicyId",
  "articleClass", "keywordLimitStatus",
]);
// Stage labels must be constants, never untrusted model or provider prose.
// Reject unexpected labels rather than leaking their raw values in JSONL.
const TRACE_STAGE_LABEL_PATTERN_V1 = /^[A-Za-z][A-Za-z0-9._-]{0,119}$/;

const SECRET_KEY_PATTERN =
  /api[_-]?key|secret|authorization|cookie|password|credential|email|private[_-]?key|(?:access|refresh|session|bearer|auth|id)[_-]?token/i;

export function hashTraceTextV1(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/**
 * SAFE JSONL stores non-sensitive classifications and hashes, not arbitrary prose.
 * Exact keyword strings, model prompts, article text, and evidence live ONLY
 * in explicitly opted-in private forensic artifacts.
 */
function sanitize(value: unknown, depth = 0, keyHint = ""): unknown {
  if (depth >= 12) return "[depth limit]";
  if (typeof value === "string") {
    if (SAFE_METADATA_STRING_KEYS.has(keyHint) &&
        value.length <= 120 && /^[A-Za-z0-9_.-]+$/.test(value)) {
      return value;
    }
    return { sha256: hashTraceTextV1(value), chars: value.length };
  }
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean" || value === null) return value;
  if (Array.isArray(value)) return value.slice(0, 100).map(item => sanitize(item, depth + 1));
  if (value instanceof Date) return value.toISOString();
  if (!value || typeof value !== "object") return null;
  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value).slice(0, 100)) {
    output[key] = SECRET_KEY_PATTERN.test(key) ? "[redacted]" : sanitize(item, depth + 1, key);
  }
  return output;
}

function queueTraceLineV1(run: TraceContextV1, line: string): void {
  const task = sharedTraceWriteQueue.then(async () => {
    await run.handle.writeFile(line, { encoding: "utf8" });
    await run.handle.sync();
  });
  sharedTraceWriteQueue = task.catch(() => undefined);
  run.pending = run.pending.then(() => task).catch((error: unknown) => {
    run.writeFailures++;
    const code = error && typeof error === "object" && "code" in error
      ? String(error.code).slice(0, 32) : "UNKNOWN";
    // Do not print exception messages: they can contain private paths/data.
    console.error("[writer trace] event write failed:", code);
  });
}

export function recordWriterTraceV1(
  stage: string,
  fields: Readonly<Record<string, unknown>> = {}
): void {
  const run = context.getStore();
  if (!run) return;
  try {
    const validStage = TRACE_STAGE_LABEL_PATTERN_V1.test(stage);
    const event = {
      version: "GROWTH_OS_WRITER_TRACE_V1",
      eventId: ++run.sequence,
      timestamp: new Date().toISOString(),
      runId: run.runId,
      stage: validStage ? stage : "trace.invalid_stage",
      fields: {
        ...(sanitize(fields) as Record<string, unknown>),
        ...(validStage ? {} : { invalidStageSha256: hashTraceTextV1(stage) }),
      },
    };
    queueTraceLineV1(run, JSON.stringify(event) + "\n");
  } catch {
    run.writeFailures++;
    console.error("[writer trace] failed to encode metadata event");
  }
}

export function recordWriterModelExchangeV1(input: {
  stage: string;
  model: string;
  prompt: string;
  output: string;
}): void {
  if (!context.getStore()) return;
  const includePrivateText =
    process.env.GROWTH_OS_WRITER_TRACE_INCLUDE_ARTIFACTS === "1" &&
    process.env.GROWTH_OS_WRITER_TRACE_INCLUDE_TEXT === "1";
  recordWriterTraceV1("model.exchange", {
    stage: input.stage,
    model: input.model,
    promptChars: input.prompt.length,
    outputChars: input.output.length,
    promptSha256: hashTraceTextV1(input.prompt),
    outputSha256: hashTraceTextV1(input.output),
    textMode: includePrivateText ? "PRIVATE_ARTIFACT" : "HASHES_ONLY",
  });
  if (includePrivateText) {
    recordWriterForensicArtifactV1("model.exchange_text", {
      stage: input.stage, model: input.model,
      promptText: input.prompt, outputText: input.output,
    });
  }
}

export async function withWriterTraceV1<T>(
  input: { scope: string; correlationId?: string },
  action: () => Promise<T>
): Promise<T> {
  // Local CLI and development runs log automatically. Tests and production
  // stay opt-in unless the operator explicitly configures a trace directory.
  const directory = process.env.GROWTH_OS_WRITER_TRACE_DIR?.trim() ||
    (process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test"
      ? "" : ".growth-os-traces");
  if (!directory) return action();
  if (context.getStore()) return action(); // nested calls share one run

  const traceDirectory = resolve(directory);
  if (traceDirectory.split(/[\\/]/).includes("public")) {
    throw new Error("WRITER_TRACE_DIRECTORY_MUST_NOT_BE_PUBLIC");
  }
  await mkdir(traceDirectory, { recursive: true, mode: 0o700 });
  const directoryInfo = await lstat(traceDirectory);
  if (directoryInfo.isSymbolicLink() || !directoryInfo.isDirectory()) {
    throw new Error("WRITER_TRACE_DIRECTORY_INVALID");
  }
  const actualDirectory = await realpath(traceDirectory);
  if (actualDirectory.split(/[\\/]/).includes("public")) {
    throw new Error("WRITER_TRACE_DIRECTORY_RESOLVES_TO_PUBLIC");
  }
  await chmod(traceDirectory, 0o700);

  const runId = `${Date.now()}-${randomUUID()}`;
  const filePath = join(traceDirectory, "writer-runs.jsonl");
  // O_NOFOLLOW prevents an existing symlink from redirecting the trace.
  const flags = constants.O_APPEND | constants.O_CREAT | constants.O_WRONLY |
    (constants.O_NOFOLLOW ?? 0);
  const handle = await open(filePath, flags, 0o600);
  const fileInfo = await handle.stat();
  if (!fileInfo.isFile()) {
    await handle.close();
    throw new Error("WRITER_TRACE_FILE_INVALID");
  }
  await handle.chmod(0o600);

  const trace: TraceContextV1 = {
    runId, filePath, handle, sequence: 0,
    pending: Promise.resolve(), writeFailures: 0,
  };
  return context.run(trace, async () => {
    recordWriterTraceV1("run.started", {
      scope: input.scope,
      correlationSha256: input.correlationId ? hashTraceTextV1(input.correlationId) : null,
      logFormat: "APPEND_ONLY_SINGLE_JSONL_V1",
    });
    // Prove the initial record reached disk before allowing any paid work.
    await trace.pending;
    if (trace.writeFailures > 0) {
      await handle.close().catch(() => undefined);
      throw new Error("WRITER_TRACE_INITIAL_WRITE_FAILED");
    }
    try {
      const result = await action();
      const httpStatus = result && typeof result === "object" &&
        "status" in result && typeof result.status === "number"
        ? result.status : null;
      const articleStatus = result && typeof result === "object" &&
        "status" in result && typeof result.status === "string"
        ? result.status : null;
      recordWriterTraceV1(
        httpStatus !== null && httpStatus >= 400 ? "run.http_error"
          : articleStatus === "REJECTED" || articleStatus === "BLOCKED_EXTERNAL"
            ? "run.article_rejected" : "run.succeeded",
        { scope: input.scope, httpStatus, articleStatus }
      );
      return result;
    } catch (error) {
      const diagnostic = diagnoseWriterFailureV1(error);
      recordWriterTraceV1("run.failed", {
        scope: input.scope,
        errorName: error instanceof Error ? error.name : "unknown",
        reasonCode: diagnostic.reasonCode,
        failureClass: diagnostic.failureClass,
        owner: diagnostic.failureClass,
        recommendedAction: diagnostic.recommendedAction,
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      await trace.pending;
      await handle.close().catch(() => undefined);
      if (trace.writeFailures > 0) {
        console.error("[writer trace] incomplete single-file log, failed writes:", trace.writeFailures);
      }
    }
  });
}

/**
 * Optional private artifacts are embedded in the SAME JSONL file, not detached
 * into per-run files. JSONL stores hashes by default. Enabling
 * GROWTH_OS_WRITER_TRACE_INCLUDE_ARTIFACTS=1 may write full prompts, research,
 * keywords and drafts locally; never share or commit that file.
 */
const FORENSIC_ARTIFACT_BYTES_MAX_V1 = 16 * 1024 * 1024;
const FORENSIC_REDACT_KEYS_V1 =
  /api[_-]?key|secret|authorization|cookie|password|credential|email|private[_-]?key|(?:access|refresh|session|bearer|auth|id)[_-]?token/i;

function sanitizeForensicArtifactV1(
  value: unknown,
  seen: WeakSet<object> = new WeakSet<object>(),
  depth = 0
): unknown {
  if (depth > 32) return "[max depth]";
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "bigint") return value.toString();
  if (typeof value !== "object") return "[non-serializable]";
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (seen.has(value)) return "[circular reference]";
  seen.add(value);
  let output: unknown;
  if (Array.isArray(value)) {
    output = value.map(item => sanitizeForensicArtifactV1(item, seen, depth + 1));
  } else if (value instanceof Error) {
    output = { name: value.name, message: value.message };
  } else {
    const result: Record<string, unknown> = Object.create(null);
    for (const [key, item] of Object.entries(value)) {
      result[key] = FORENSIC_REDACT_KEYS_V1.test(key)
        ? "[redacted]"
        : sanitizeForensicArtifactV1(item, seen, depth + 1);
    }
    output = result;
  }
  seen.delete(value);
  return output;
}

export function recordWriterForensicArtifactV1(stage: string, artifact: unknown): void {
  const run = context.getStore();
  if (!run) return;
  if (process.env.GROWTH_OS_WRITER_TRACE_INCLUDE_ARTIFACTS !== "1") {
    recordWriterTraceV1(`forensic.${stage}`, { fullArtifact: false, reason: "NOT_OPTED_IN" });
    return;
  }
  try {
    const serialized = JSON.stringify(sanitizeForensicArtifactV1(artifact));
    if (typeof serialized !== "string") {
      recordWriterTraceV1(`forensic.${stage}.capture_failed`, { reason: "ARTIFACT_NOT_SERIALIZABLE" });
      return;
    }
    const sizeBytes = Buffer.byteLength(serialized, "utf8");
    const safeStage = TRACE_STAGE_LABEL_PATTERN_V1.test(stage) ? stage : "invalid_stage";
    const tooLarge = sizeBytes > FORENSIC_ARTIFACT_BYTES_MAX_V1;
    const event = {
      version: "GROWTH_OS_WRITER_TRACE_V1",
      eventId: ++run.sequence,
      timestamp: new Date().toISOString(),
      runId: run.runId,
      stage: `forensic.${safeStage}`,
      fields: {
        fullArtifact: !tooLarge,
        artifactBytes: sizeBytes,
        artifactSha256: hashTraceTextV1(serialized),
        ...(tooLarge
          ? { omittedReason: "ARTIFACT_EXCEEDS_16_MIB" }
          : { artifact: JSON.parse(serialized) as unknown }),
      },
    };
    queueTraceLineV1(run, JSON.stringify(event) + "\n");
  } catch {
    recordWriterTraceV1(`forensic.${stage}.capture_failed`, { reason: "SNAPSHOT_SERIALIZATION_FAILED" });
  }
}
