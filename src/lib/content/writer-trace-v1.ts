import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, randomUUID } from "node:crypto";
import { appendFile, chmod, lstat, mkdir, open, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

/**
 * Execution evidence, NOT model chain-of-thought.
 * Disabled unless GROWTH_OS_WRITER_TRACE_DIR is explicitly set.
 * This is local diagnostics: never write traces to public/ or Git.
 */
interface TraceContextV1 {
  readonly runId: string;
  readonly filePath: string;
  sequence: number;
  pending: Promise<void>;
  writeFailures: number;
  readonly artifactDirectory: string;
}

const context = new AsyncLocalStorage<TraceContextV1>();
const SAFE_METADATA_STRING_KEYS = new Set([
  "stage", "scope", "phase", "model", "status", "articleStatus",
  "errorName", "version", "route", "reasonCode", "severity",
  "source", "textMode", "owner", "generationMode", "readiness",
  "failureClass", "code", "responseStatus", "omittedReason",
  "promptSha256", "outputSha256", "artifactSha256",
  "correlationSha256", "briefIdSha256", "websiteIdSha256",
  "requestId", "responseId", "articleIdHash",
]);
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
        value.length <= 160 && /^[A-Za-z0-9_.:\/-]+$/.test(value)) {
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

export function recordWriterTraceV1(
  stage: string,
  fields: Readonly<Record<string, unknown>> = {}
): void {
  const run = context.getStore();
  if (!run) return;
  const event = {
    version: "GROWTH_OS_WRITER_TRACE_V1",
    eventId: ++run.sequence,
    timestamp: new Date().toISOString(),
    runId: run.runId,
    stage,
    fields: sanitize(fields),
  };
  const line = JSON.stringify(event) + "\n";
  run.pending = run.pending.then(async () => {
    await appendFile(run.filePath, line, { encoding: "utf8", mode: 0o600 });
  }).catch((error: unknown) => {
    run.writeFailures++;
    // Do not print the exception's message: it can include confidential paths/data.
    const code = error && typeof error === "object" && "code" in error
      ? String(error.code).slice(0, 32) : "UNKNOWN";
    console.error("[writer trace] event write failed:", code);
  });
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
  const directory = process.env.GROWTH_OS_WRITER_TRACE_DIR?.trim();
  if (!directory) return action();
  if (context.getStore()) return action(); // nested calls share one run
  const traceDirectory = resolve(directory);
  if (traceDirectory.split(/[\\/]/).includes("public")) {
    throw new Error("WRITER_TRACE_DIRECTORY_MUST_NOT_BE_PUBLIC");
  }
  // Fail before a paid run if diagnostics cannot create a private log file.
  await mkdir(traceDirectory, { recursive: true, mode: 0o700 });
  const directoryInfo = await lstat(traceDirectory);
  if (directoryInfo.isSymbolicLink() || !directoryInfo.isDirectory()) {
    throw new Error("WRITER_TRACE_DIRECTORY_INVALID");
  }
  await chmod(traceDirectory, 0o700);
  const runId = `${Date.now()}-${randomUUID()}`;
  const filePath = join(traceDirectory, `${runId}.jsonl`);
  const artifactDirectory = join(traceDirectory, `${runId}.artifacts`);
  const handle = await open(filePath, "wx", 0o600);
  await handle.close();
  const trace: TraceContextV1 = {
    runId, filePath, artifactDirectory, sequence: 0,
    pending: Promise.resolve(), writeFailures: 0,
  };
  return context.run(trace, async () => {
    recordWriterTraceV1("run.started", {
      scope: input.scope,
      correlationSha256: input.correlationId ? hashTraceTextV1(input.correlationId) : null,
    });
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
      recordWriterTraceV1("run.failed", {
        scope: input.scope,
        errorName: error instanceof Error ? error.name : "unknown",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      await trace.pending;
      if (trace.writeFailures > 0) {
        console.error("[writer trace] incomplete log, failed writes:", trace.writeFailures);
      }
    }
  });
}


/**
 * Maximum OBSERVABLE (not private chain-of-thought) artifact snapshots.
 * Completely optional. Sensitive artifacts use separate private files.
 * JSONL contains only artifact filenames, hashes, and status metadata.
 * Never changes model inputs, selection rules, or generation outcomes.
 *
 * Opt-in: GROWTH_OS_WRITER_TRACE_INCLUDE_ARTIFACTS=1
 * Maximum artifact: 16 MiB. Oversized artifacts are hashed, not silently cut.
 * Local traces may contain sensitive drafts/research: never upload them.
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
  // Tracing must remain a non-blocking, non-fatal observer.
  try {
    const serialized = JSON.stringify(sanitizeForensicArtifactV1(artifact));
    if (typeof serialized !== "string") {
      recordWriterTraceV1(`forensic.${stage}.capture_failed`, { reason: "ARTIFACT_NOT_SERIALIZABLE" });
      return;
    }
    const sizeBytes = Buffer.byteLength(serialized, "utf8");
    const tooLarge = sizeBytes > FORENSIC_ARTIFACT_BYTES_MAX_V1;
    const eventId = ++run.sequence;
    const timestamp = new Date().toISOString();
    const name = `${String(eventId).padStart(6, "0")}-${randomUUID()}.json`;
    const targetFile = join(run.artifactDirectory, name);
    run.pending = run.pending.then(async () => {
      let stored = false;
      let omittedReason: string | null = tooLarge ? "ARTIFACT_EXCEEDS_16_MIB" : null;
      if (!tooLarge) {
        try {
          await mkdir(run.artifactDirectory, { recursive: true, mode: 0o700 });
          const artifactDirInfo = await lstat(run.artifactDirectory);
          if (!artifactDirInfo.isDirectory() || artifactDirInfo.isSymbolicLink()) {
            throw new Error("ARTIFACT_DIRECTORY_INVALID");
          }
          await chmod(run.artifactDirectory, 0o700);
          await writeFile(targetFile, serialized, { encoding: "utf8", mode: 0o600, flag: "wx" });
          stored = true;
        } catch (error) {
          omittedReason = "ARTIFACT_WRITE_FAILED";
          run.writeFailures++;
          const code = error && typeof error === "object" && "code" in error
            ? String(error.code).slice(0, 32) : "UNKNOWN";
          console.error("[writer trace] private artifact write failed:", code);
        }
      }
      const event = {
        version: "GROWTH_OS_WRITER_TRACE_V1",
        eventId,
        timestamp,
        runId: run.runId,
        stage: `forensic.${stage}`,
        fields: {
          fullArtifact: stored,
          artifactBytes: sizeBytes,
          artifactSha256: hashTraceTextV1(serialized),
          ...(stored ? { artifactFile: name } : { omittedReason }),
        },
      };
      await appendFile(run.filePath, JSON.stringify(event) + "\n", {
        encoding: "utf8", mode: 0o600,
      });
    }).catch((error: unknown) => {
      run.writeFailures++;
      const code = error && typeof error === "object" && "code" in error
        ? String(error.code).slice(0, 32) : "UNKNOWN";
      console.error("[writer trace] forensic event write failed:", code);
    });
  } catch {
    recordWriterTraceV1(`forensic.${stage}.capture_failed`, { reason: "SNAPSHOT_SERIALIZATION_FAILED" });
  }
}
