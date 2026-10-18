import { AsyncLocalStorage } from "node:async_hooks";
import { createHash, randomUUID } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
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
}

const context = new AsyncLocalStorage<TraceContextV1>();
const MAX_TEXT = 1600;
const MAX_OPT_IN_TEXT = 2_000_000;

export function hashTraceTextV1(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function sanitize(value: unknown, depth = 0, keyHint = ""): unknown {
  if (depth >= 5) return "[depth limit]";
  if (typeof value === "string") {
    const max = (keyHint === "promptText" || keyHint === "outputText") &&
      process.env.GROWTH_OS_WRITER_TRACE_INCLUDE_TEXT === "1" ? MAX_OPT_IN_TEXT : MAX_TEXT;
    return value.length > max ? value.slice(0, max) + "…[truncated]" : value;
  }
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean" || value === null) return value;
  if (Array.isArray(value)) return value.slice(0, 50).map(v => sanitize(v, depth + 1));
  if (!value || typeof value !== "object") return undefined;

  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value).slice(0, 60)) {
    if (/api[_-]?key|secret|authorization|cookie|password|credential|email|private[_-]?key|(?:access|refresh|session|bearer|auth|id)[_-]?token/i.test(key)) {
      output[key] = "[redacted]";
    } else {
      output[key] = sanitize(item, depth + 1, key);
    }
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
    await mkdir(resolve(run.filePath, ".."), { recursive: true, mode: 0o700 });
    await appendFile(run.filePath, line, { encoding: "utf8", mode: 0o600 });
  }).catch(() => {
    // Telemetry must never change generation results or expose private data.
  });
}

export function recordWriterModelExchangeV1(input: {
  stage: string;
  model: string;
  prompt: string;
  output: string;
}): void {
  if (!context.getStore()) return;
  const includeText = process.env.GROWTH_OS_WRITER_TRACE_INCLUDE_TEXT === "1";
  recordWriterTraceV1("model.exchange", {
    stage: input.stage,
    model: input.model,
    promptChars: input.prompt.length,
    outputChars: input.output.length,
    promptSha256: hashTraceTextV1(input.prompt),
    outputSha256: hashTraceTextV1(input.output),
    ...(includeText ? { promptText: input.prompt, outputText: input.output } : {}),
    textMode: includeText ? "OPT_IN_TEXT_UP_TO_2MB" : "HASHES_ONLY",
  });
}

export async function withWriterTraceV1<T>(
  input: { scope: string; correlationId?: string },
  action: () => Promise<T>
): Promise<T> {
  const directory = process.env.GROWTH_OS_WRITER_TRACE_DIR?.trim();
  if (!directory) return action();
  const runId = `${Date.now()}-${randomUUID()}`;
  const filePath = join(resolve(directory), `${runId}.jsonl`);
  const trace: TraceContextV1 = { runId, filePath, sequence: 0, pending: Promise.resolve() };
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
    }
  });
}


/**
 * Maximum OBSERVABLE (not private chain-of-thought) artifact snapshots.
 * Completely optional. This emits to the same local per-run JSONL file.
 * Never changes model inputs, selection rules, or generation outcomes.
 *
 * Opt-in: GROWTH_OS_WRITER_TRACE_INCLUDE_ARTIFACTS=1
 * Maximum event: 16 MiB. Oversized artifacts are hashed, not silently cut.
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
    const sizeBytes = Buffer.byteLength(serialized, "utf8");
    const truncated = sizeBytes > FORENSIC_ARTIFACT_BYTES_MAX_V1;
    const event = {
      version: "GROWTH_OS_WRITER_TRACE_V1",
      eventId: ++run.sequence,
      timestamp: new Date().toISOString(),
      runId: run.runId,
      stage: `forensic.${stage}`,
      fields: {
        fullArtifact: !truncated,
        artifactBytes: sizeBytes,
        artifactSha256: hashTraceTextV1(serialized),
        ...(truncated ? { omittedReason: "ARTIFACT_EXCEEDS_16_MIB" } : { artifact: JSON.parse(serialized) }),
      },
    };
    const line = JSON.stringify(event) + "\n";
    run.pending = run.pending.then(async () => {
      await mkdir(resolve(run.filePath, ".."), { recursive: true, mode: 0o700 });
      await appendFile(run.filePath, line, { encoding: "utf8", mode: 0o600 });
    }).catch(() => {
      // Forensic logging must never mutate or fail production.
    });
  } catch {
    recordWriterTraceV1(`forensic.${stage}.capture_failed`, { reason: "SNAPSHOT_SERIALIZATION_FAILED" });
  }
}
