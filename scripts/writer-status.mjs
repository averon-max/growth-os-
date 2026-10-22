#!/usr/bin/env node
/**
 * Safe read-only summary of the latest real Writer run.
 * Default log: .growth-os-traces/writer-runs.jsonl (all runs, append-only).
 * Legacy per-run JSONL directories remain readable.
 * Never prints prompt, article, keyword, or source text.
 */
import { lstat, readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";

const args = process.argv.slice(2);
const json = args.includes("--json");
const runArg = args.indexOf("--run");
const runId = runArg >= 0 ? args[runArg + 1] : null;
const positional = args.filter((arg, i) => arg !== "--json" &&
  arg !== "--run" && (runArg < 0 || i !== runArg + 1));
const target = positional[0] ?? ".growth-os-traces/writer-runs.jsonl";
if (positional.length > 1 || (runArg >= 0 && (!runId || !/^[\w-]{1,120}$/.test(runId)))) {
  console.error("USAGE: node scripts/writer-status.mjs [TRACE_FILE_OR_DIRECTORY] [--run ID] [--json]");
  process.exit(2);
}

const safe = value => typeof value === "string" &&
  /^[A-Za-z0-9_.-]{1,120}$/.test(value) ? value : null;
const num = value => Number.isFinite(value) && value >= 0 ? value : null;
const findLast = (events, stage) => [...events].reverse().find(e => e.stage === stage);
const seen = (events, stage) => events.some(e => e.stage === stage);
const marker = (events, stage, key = "status") =>
  safe(findLast(events, stage)?.fields?.[key]) ?? (seen(events, stage) ? "RECORDED" : "NOT_RECORDED");
const terminalStages = new Set(["run.succeeded", "run.failed", "run.article_rejected", "run.http_error"]);

let sourceFiles = [];
try {
  const stats = await lstat(target);
  if (stats.isSymbolicLink()) throw Error("SYMLINK_NOT_ALLOWED");
  if (stats.isFile()) {
    sourceFiles = [target];
  } else if (stats.isDirectory()) {
    const names = await readdir(target);
    sourceFiles = names
      .filter(name => name === "writer-runs.jsonl" || /^[0-9]+-[0-9a-f-]+\.jsonl$/i.test(name))
      .map(name => join(target, name));
    for (const file of sourceFiles) {
      const fileStats = await lstat(file);
      if (fileStats.isSymbolicLink() || !fileStats.isFile() || (fileStats.mode & 0o077) !== 0) throw Error("INVALID_TRACE_FILE_OR_PERMISSIONS");
    }
  } else {
    throw Error("INVALID_TRACE_TARGET");
  }
} catch {
  console.error("NO_LOCAL_WRITER_TRACES: expected .growth-os-traces/writer-runs.jsonl");
  process.exit(2);
}
if (!sourceFiles.length) {
  console.error("NO_MATCHING_WRITER_RUNS");
  process.exit(2);
}

const runs = new Map();
let malformedLines = 0;
for (const file of sourceFiles) {
  const source = await readFile(file, "utf8");
  for (const line of source.split("\n")) {
    if (!line.trim()) continue;
    let event;
    try { event = JSON.parse(line); } catch { malformedLines++; continue; }
    if (!event || !Number.isInteger(event.eventId) ||
        typeof event.stage !== "string" || typeof event.runId !== "string") {
      malformedLines++;
      continue;
    }
    if (!runs.has(event.runId)) runs.set(event.runId, { events: [], files: new Set() });
    const run = runs.get(event.runId);
    run.events.push(event);
    run.files.add(file);
  }
}

const candidates = [...runs.entries()]
  .filter(([id, run]) => (!runId || id === runId) &&
    (runId || run.events.some(e => e.stage === "run.started" && e.fields?.scope === "content.article")))
  .map(([id, run]) => {
    run.events.sort((a, b) => a.eventId - b.eventId);
    const start = run.events.find(e => e.stage === "run.started");
    return { id, ...run, start, startTime: Date.parse(start?.timestamp ?? "") || 0 };
  })
  .sort((a, b) => b.startTime - a.startTime);

const selected = candidates[0];
if (!selected) {
  console.error(runId ? "NO_MATCHING_WRITER_RUNS" :
    "NO_ARTICLE_TRACE_FOUND: no content.article run has been recorded");
  process.exit(2);
}

const { id: selectedRunId, events } = selected;
const last = events.at(-1);
const terminal = [...events].reverse().find(e => terminalStages.has(e.stage));
const failure = findLast(events, "run.failed");
const blockedPreflight = findLast(events, "writer.preflight.blocked");
const draft = findLast(events, "writer.draft_generated");
const finalCritic = findLast(events, "critic.final.completed");
const readiness = findLast(events, "audit.final_readiness.completed");
const inputProfile = findLast(events, "article.input_profile");
const articleBriefHash = findLast(events, "article.entrypoint")?.fields?.briefIdSha256;
const matchingBriefRuns = typeof articleBriefHash === "string"
  ? [...runs.values()].filter(run => run.events.some(e =>
      e.stage === "brief.correlation" && e.fields?.briefIdSha256 === articleBriefHash))
  : [];
const matchingBriefRun = matchingBriefRuns.at(-1) ?? null;
const templateEvent = matchingBriefRun
  ? findLast(matchingBriefRun.events, "template.selected")
  : null;
const directTemplateId = safe(inputProfile?.fields?.templateId);
const selectedTemplateId = directTemplateId && directTemplateId !== "NOT_EXPLICITLY_BOUND"
  ? directTemplateId
  : safe(templateEvent?.fields?.templateId);
const modelCalls = events.filter(e => e.stage === "model.exchange").length;
const modelUsageEvents = events.filter(e => e.stage === "model.usage");
const modelTimingEvents = events.filter(e =>
  e.stage === "model.response_metadata" || e.stage === "model.request_failed_attempt");
const sumField = (items, field) => items.reduce((total, event) =>
  total + (Number.isFinite(event.fields?.[field]) && event.fields[field] >= 0
    ? event.fields[field] : 0), 0);
const startTimeMs = Date.parse(selected.start?.timestamp ?? "");
const terminalTimeMs = Date.parse(terminal?.timestamp ?? "");
const elapsedMs = Number.isFinite(startTimeMs) && Number.isFinite(terminalTimeMs)
  ? Math.max(0, terminalTimeMs - startTimeMs) : null;
const privateTextIncluded = events.some(e => e.stage.startsWith("forensic.") &&
  e.fields?.fullArtifact === true && Object.hasOwn(e.fields, "artifact"));
const diagnostics = [
  ...(malformedLines ? ["MALFORMED_JSONL_LINES:" + malformedLines] : []),
  ...(!terminal ? ["NO_TERMINAL_EVENT_YET"] : []),
  ...(terminal && terminal !== last ? ["TERMINAL_NOT_LAST_EVENT"] : []),
  ...(privateTextIncluded ? ["PRIVATE_TEXT_PRESENT_IN_LOG_KEEP_LOCAL"] : []),
];
const report = {
  version: "GROWTH_OS_WRITER_QUICK_STATUS_V2",
  logFile: selected.files.size === 1 ? basename([...selected.files][0]) : "MULTIPLE_TRACE_SOURCES",
  runId: safe(selectedRunId) ?? "INVALID_RUN_ID",
  startedAt: selected.start?.timestamp ?? null,
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
  input: {
    templateId: selectedTemplateId ?? "NOT_RECORDED",
    templatePolicyBound: inputProfile?.fields?.templatePolicyBound === true || Boolean(templateEvent),
    searchIntent: safe(inputProfile?.fields?.searchIntent) ?? "NOT_RECORDED",
    primaryKeywordCount: num(inputProfile?.fields?.primaryKeywordCount),
    secondaryKeywordCount: num(inputProfile?.fields?.secondaryKeywordCount),
    uniqueBriefKeywordCount: num(inputProfile?.fields?.uniqueBriefKeywordCount),
    uniqueKeywordCandidateCount: num(inputProfile?.fields?.uniqueKeywordCandidateCount) ?? num(draft?.fields?.keywordCandidateCount),
    loggedKeywordCandidateCount: num(inputProfile?.fields?.loggedKeywordCandidateCount),
    keywordLimitStatus: safe(inputProfile?.fields?.keywordLimitStatus) ?? "NOT_RECORDED",
    keywordInventorySource: safe(inputProfile?.fields?.keywordInventorySource) ?? "NOT_RECORDED",
    keywordCandidateLimit: num(inputProfile?.fields?.keywordCandidateLimit),
    keywordCandidateOverflowCount: num(inputProfile?.fields?.keywordCandidateOverflowCount),
    plannedSectionCount: num(inputProfile?.fields?.plannedSectionCount),
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
    elapsedMs,
    modelDurationMs: sumField(modelTimingEvents, "durationMs"),
    inputTokens: sumField(modelUsageEvents, "inputTokens"),
    outputTokens: sumField(modelUsageEvents, "outputTokens"),
    totalTokens: sumField(modelUsageEvents, "totalTokens"),
    failureClass: safe(failure?.fields?.failureClass) ?? safe(blockedPreflight?.fields?.failureClass),
    reasonCode: safe(failure?.fields?.reasonCode) ?? safe(blockedPreflight?.fields?.reasonCode),
    recommendedAction: safe(failure?.fields?.recommendedAction) ??
      safe(blockedPreflight?.fields?.recommendedAction),
    headingOutlineCaptured: events.some(e => e.stage === "forensic.writer.draft_outline" &&
      e.fields?.fullArtifact === true && Object.hasOwn(e.fields, "artifact")),
  },
  diagnostics,
  privateTextIncluded,
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
  console.log("TEMPLATE   " + report.input.templateId +
    " | keyword candidates=" + (report.input.uniqueKeywordCandidateCount ?? "?") +
    "/" + (report.input.keywordCandidateLimit ?? "?"));
  console.log("DRAFT      " + (report.details.draftWords ?? "?") +
    " words | H2=" + (report.details.draftH2 ?? "?") +
    " | H3=" + (report.details.draftH3 ?? "?"));
  console.log("REPAIRS    " + (report.details.repairedSections ?? "?") +
    " sections | model exchanges=" + report.details.observedModelExchanges);
  console.log("TIME       total=" + (report.details.elapsedMs ?? "?") +
    "ms | model=" + report.details.modelDurationMs + "ms");
  console.log("TOKENS     input=" + report.details.inputTokens +
    " | output=" + report.details.outputTokens + " | total=" + report.details.totalTokens);
  if (report.details.reasonCode) {
    console.log("ERROR      " + report.details.reasonCode);
    console.log("OWNER      " + (report.details.failureClass ?? "UNKNOWN"));
    console.log("NEXT       " + (report.details.recommendedAction ?? "INSPECT_TRACE"));
  }
  if (report.diagnostics.length) console.log("WARNINGS   " + report.diagnostics.join(", "));
}
