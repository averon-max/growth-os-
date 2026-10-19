#!/usr/bin/env node
/**
 * One human-readable, SAFE summary for the latest real Master Writer run.
 * No DB, network, AI, retries, publication or sensitive artifact reads.
 *
 * node scripts/writer-status.mjs
 * node scripts/writer-status.mjs --json
 * node scripts/writer-status.mjs .growth-os-traces --run RUN_ID
 *
 * Old logs may lack newly recorded stages: NOT_RECORDED is not FAILED.
 */
import { lstat, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const args = process.argv.slice(2);
const json = args.includes("--json");
const runArg = args.indexOf("--run");
const runId = runArg >= 0 ? args[runArg + 1] : null;
const positional = args.filter((arg, i) => arg !== "--json" &&
  arg !== "--run" && (runArg < 0 || i !== runArg + 1));
const directory = positional[0] ?? ".growth-os-traces";
if (positional.length > 1 || (runArg >= 0 && (!runId || !/^[\w-]{1,120}$/.test(runId)))) {
  console.error("USAGE: node scripts/writer-status.mjs [TRACE_DIRECTORY] [--run ID] [--json]");
  process.exit(2);
}

const safe = value => typeof value === "string" &&
  /^[A-Za-z0-9_.-]{1,120}$/.test(value) ? value : null;
const num = value => Number.isFinite(value) && value >= 0 ? value : null;
const findLast = (events, stage) => [...events].reverse().find(e => e.stage === stage);
const seen = (events, stage) => events.some(e => e.stage === stage);
const marker = (events, stage, key = "status") =>
  safe(findLast(events, stage)?.fields?.[key]) ?? (seen(events, stage) ? "RECORDED" : "NOT_RECORDED");

let files;
try {
  const stats = await lstat(directory);
  if (!stats.isDirectory() || stats.isSymbolicLink()) throw Error("NOT_A_DIRECTORY");
  files = (await readdir(directory)).filter(name => /^[0-9]+-[0-9a-f-]+\.jsonl$/i.test(name)).sort().reverse();
} catch {
  console.error("NO_LOCAL_WRITER_TRACES: run with GROWTH_OS_WRITER_TRACE_DIR=.growth-os-traces");
  process.exit(2);
}
if (runId) files = files.filter(name => name === runId + ".jsonl");
if (!files.length) {
  console.error("NO_MATCHING_WRITER_RUNS");
  process.exit(2);
}

let selected = null;
for (const name of files) {
  const stats = await lstat(join(directory, name));
  if (!stats.isFile() || stats.isSymbolicLink()) continue;
  const source = await readFile(join(directory, name), "utf8");
  const parsed = [];
  let badLines = 0;
  for (const line of source.split("\n")) {
    if (!line.trim()) continue;
    try {
      const value = JSON.parse(line);
      if (value && Number.isInteger(value.eventId) && typeof value.stage === "string") {
        parsed.push(value);
      } else badLines++;
    } catch { badLines++; }
  }
  const start = parsed.find(e => e.stage === "run.started");
  if (!start) continue;
  if (!runId && start.fields?.scope !== "content.article") continue;
  selected = { name, events: parsed, badLines };
  break;
}
if (!selected) {
  console.error("NO_ARTICLE_TRACE_FOUND: old runs may not have tracing enabled");
  process.exit(2);
}

const { name, events, badLines } = selected;
const last = events.at(-1);
const terminalStages = new Set(["run.succeeded", "run.failed", "run.article_rejected", "run.http_error"]);
const terminal = [...events].reverse().find(e => terminalStages.has(e.stage));
const failure = [...events].reverse().find(e => e.stage === "run.failed" || e.stage === "writer.preflight.blocked");
const draft = findLast(events, "writer.draft_generated");
const finalCritic = findLast(events, "critic.final.completed");
const readiness = findLast(events, "audit.final_readiness.completed");
const modelCalls = events.filter(e => e.stage === "model.exchange").length;
const report = {
  version: "GROWTH_OS_WRITER_QUICK_STATUS_V1",
  runId: safe(events[0]?.runId) ?? name.slice(0, -6),
  startedAt: events[0]?.timestamp ?? null,
  result: terminal?.stage === "run.succeeded" ? safe(terminal.fields?.articleStatus) ?? "SUCCEEDED" :
    terminal?.stage === "run.article_rejected" ? "REJECTED" :
    terminal?.stage === "run.failed" ? "FAILED" :
    terminal?.stage === "run.http_error" ? "HTTP_ERROR" : "INCOMPLETE_OR_RUNNING",
  stages: {
    research: seen(events, "article.locked_evidence_scope") ? "SIGNED_SCOPE_RECORDED" : "NOT_RECORDED",
    preflight: seen(events, "writer.preflight.blocked") ? "BLOCKED" :
      seen(events, "writer.preflight.passed") ? "PASSED" : "NOT_RECORDED",
    draft: draft ? "CREATED" : "NOT_RECORDED",
    critics: marker(events, "critic.final.completed"),
    replay: seen(events, "serp.replay.failed") ? "FAILED" :
      seen(events, "serp.replay.skipped") ? "SKIPPED" : marker(events, "serp.replay.completed"),
    readiness: marker(events, "audit.final_readiness.completed"),
  },
  details: {
    draftWords: num(draft?.fields?.approxWordCount),
    draftH2: num(draft?.fields?.h2Count),
    draftH3: num(draft?.fields?.h3Count),
    finalCriticCount: num(finalCritic?.fields?.criticCount),
    repairedSections: num(finalCritic?.fields?.repairedSectionCount),
    readinessBlockers: num(readiness?.fields?.blockerCount),
    readinessWarnings: num(readiness?.fields?.warningCount),
    observedModelExchanges: modelCalls,
    failureClass: safe(failure?.fields?.failureClass),
    reasonCode: safe(failure?.fields?.reasonCode),
    recommendedAction: safe(failure?.fields?.recommendedAction),
  },
  diagnostics: [
    ...(badLines ? ["MALFORMED_JSONL_LINES:" + badLines] : []),
    ...(!terminal ? ["NO_TERMINAL_EVENT_YET"] : []),
    ...(terminal && terminal !== last ? ["TERMINAL_NOT_LAST_EVENT"] : []),
  ],
  privateTextIncluded: false,
  databaseUnchangedByThisCommand: true,
  noPaidCallsByThisCommand: true,
};
if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log("WRITER RUN " + report.runId);
  console.log("RESULT     " + report.result);
  for (const [stage, status] of Object.entries(report.stages)) {
    console.log(stage.toUpperCase().padEnd(11) + status);
  }
  console.log("DRAFT      " + (report.details.draftWords ?? "?") +
    " words | H2=" + (report.details.draftH2 ?? "?") +
    " | H3=" + (report.details.draftH3 ?? "?"));
  console.log("REPAIRS    " + (report.details.repairedSections ?? "?") +
    " sections | model exchanges=" + report.details.observedModelExchanges);
  if (report.details.reasonCode) {
    console.log("ERROR      " + report.details.reasonCode);
    console.log("OWNER      " + (report.details.failureClass ?? "UNKNOWN"));
    console.log("NEXT       " + (report.details.recommendedAction ?? "INSPECT_TRACE"));
  }
  if (report.diagnostics.length) console.log("WARNINGS   " + report.diagnostics.join(", "));
}
