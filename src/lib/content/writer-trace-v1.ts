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

export function hashTraceTextV1(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function sanitize(value: unknown, depth = 0): unknown {
  if (depth >= 5) return "[depth limit]";
  if (typeof value === "string") {
    return value.length > MAX_TEXT ? value.slice(0, MAX_TEXT) + "…[truncated]" : value;
  }
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean" || value === null) return value;
  if (Array.isArray(value)) return value.slice(0, 50).map(v => sanitize(v, depth + 1));
  if (!value || typeof value !== "object") return undefined;

  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value).slice(0, 60)) {
    if (/key|secret|token|authorization|cookie|password|credential|email|private/i.test(key)) {
      output[key] = "[redacted]";
    } else {
      output[key] = sanitize(item, depth + 1);
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
    textMode: includeText ? "OPT_IN_FULL_TEXT_TRUNCATED" : "HASHES_ONLY",
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
      recordWriterTraceV1("run.succeeded", { scope: input.scope });
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
