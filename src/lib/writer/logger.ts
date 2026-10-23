import fs from "fs";
import path from "path";

export type LogStep =
  | "keyword-picker"
  | "serp-analyzer"
  | "article-writer"
  | "orchestrator";

export interface LogEntry {
  ts: string;
  step: LogStep;
  event: string;
  data: Record<string, unknown>;
}

let logFile: string | null = null;

export function initLogger(keyword: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const slug = keyword.replace(/\s+/g, "-").toLowerCase().slice(0, 40);
  const dir = path.join(process.cwd(), "writer-logs");
  fs.mkdirSync(dir, { recursive: true });
  logFile = path.join(dir, `${date}-${slug}.jsonl`);
  log("orchestrator", "INIT", { keyword, logFile });
  return logFile;
}

export function log(
  step: LogStep,
  event: string,
  data: Record<string, unknown> = {}
): void {
  if (!logFile) return;
  const entry: LogEntry = {
    ts: new Date().toISOString(),
    step,
    event,
    data,
  };
  fs.appendFileSync(logFile, JSON.stringify(entry) + "\n");
  // также в консоль чтобы видеть в реальном времени
  console.log(`[${step}] ${event}`, JSON.stringify(data, null, 2));
}

export function logError(
  step: LogStep,
  event: string,
  error: unknown,
  data: Record<string, unknown> = {}
): void {
  log(step, `ERROR:${event}`, {
    ...data,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
}
