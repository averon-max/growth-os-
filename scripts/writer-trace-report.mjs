#!/usr/bin/env node
/**
 * READ-ONLY investigation of Growth OS Writer JSONL runs.
 * Usage:
 *   node scripts/writer-trace-report.mjs .growth-os-traces
 *   node scripts/writer-trace-report.mjs .growth-os-traces --run RUN_ID
 *   node scripts/writer-trace-report.mjs .growth-os-traces --run RUN_ID --stage forensic. --raw
 * --raw exposes locally recorded drafts, prompts and research. Keep output private.
 */
import { lstat, readdir, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join } from "node:path";

const argv = process.argv.slice(2);
let directory = ".growth-os-traces", runId = null, stageFilter = null, raw = false;
for (let i = 0; i < argv.length; i++) {
  const arg = argv[i];
  if (arg === "--raw") raw = true;
  else if (arg === "--run" || arg === "--stage") {
    const value = argv[++i];
    if (!value || value.startsWith("--")) {
      console.error("Missing value for " + arg); process.exit(2);
    }
    if (arg === "--run") runId = value;
    else stageFilter = value;
  } else if (arg === "--help") {
    console.log("Usage: node scripts/writer-trace-report.mjs [TRACE_DIRECTORY] [--run RUN_ID] [--stage PREFIX] [--raw]");
    process.exit(0);
  } else if (arg.startsWith("--") || directory !== ".growth-os-traces") {
    console.error("Unexpected argument: " + arg); process.exit(2);
  } else directory = arg;
}

let files;
try { files = (await readdir(directory)).filter(name => name.endsWith(".jsonl")).sort(); }
catch (error) {
  console.error("Trace directory unavailable: " + String(error.message));
  process.exit(1);
}
if (runId) files = files.filter(name => name === runId + ".jsonl");
if (!files.length) { console.error("No matching JSONL runs; no generation triggered."); process.exit(1); }

const reports = [];
for (const file of files) {
  const source = await readFile(join(directory, file), "utf8");
  const events = [];
  const parseErrors = [];
  for (const [index, line] of source.split("\n").entries()) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      if (!event || !Number.isInteger(event.eventId) || typeof event.stage !== "string")
        parseErrors.push(index + 1);
      else events.push(event);
    } catch { parseErrors.push(index + 1); }
  }
  const stageCounts = Object.create(null);
  for (const event of events) stageCounts[event.stage] = (stageCounts[event.stage] || 0) + 1;
  const modelExchanges = events.filter(e => e.stage === "model.exchange");
  const usage = events.filter(e => e.stage === "model.usage");
  const artifacts = events.filter(e => e.stage.startsWith("forensic."));
  const terminal = ["run.succeeded", "run.failed", "run.article_rejected", "run.http_error"];
  const warnings = [];
  if (parseErrors.length) warnings.push("MALFORMED_JSONL");
  if (!events.some(e => e.stage === "run.started")) warnings.push("MISSING_START_EVENT");
  if (!events.some(e => terminal.includes(e.stage))) warnings.push("MISSING_TERMINAL_EVENT");
  for (let i = 1; i < events.length; i++) {
    if (events[i].eventId !== events[i-1].eventId + 1) {
      warnings.push("NONCONTIGUOUS_SEQUENCE"); break;
    }
  }
  if (modelExchanges.some(e => e.fields?.textMode !== "PRIVATE_ARTIFACT" && e.fields?.textMode !== "OPT_IN_TEXT_UP_TO_2MB"))
    warnings.push("MODEL_TEXT_HASHES_ONLY");
  if (artifacts.some(e => e.fields?.fullArtifact === false))
    warnings.push("ARTIFACT_MISSING_OR_NOT_OPTED_IN");
  if (artifacts.some(e => e.fields?.omittedReason))
    warnings.push("ARTIFACT_OMITTED");
  if (!events.some(e => e.stage.includes("keyword")))
    warnings.push("KEYWORD_SELECTION_NOT_OBSERVED");
  if (!events.some(e => e.stage.includes("serp") || e.stage.includes("research")))
    warnings.push("SERP_RESEARCH_NOT_OBSERVED");
  if (!events.some(e => e.stage.includes("critic") || e.stage.includes("audit")))
    warnings.push("EDITORIAL_REVIEW_NOT_OBSERVED");
  // Verify all detached snapshots before presenting an apparently complete run.
  const detached = new Map();
  const artifactChecks = [];
  for (const event of artifacts.filter(e => e.fields?.fullArtifact)) {
    const name = event.fields?.artifactFile;
    if (!name) {
      artifactChecks.push({eventId:event.eventId,valid:false,reason:"LEGACY_INLINE_ARTIFACT"});
      continue;
    }
    if (typeof name !== "string" || !/^\\d{6}-[0-9a-f-]+\\.json$/.test(name)) {
      artifactChecks.push({eventId:event.eventId,valid:false,reason:"INVALID_ARTIFACT_REFERENCE"});
      continue;
    }
    const location = join(directory, file.slice(0, -6) + ".artifacts", name);
    try {
      const stats = await lstat(location);
      if (!stats.isFile() || (stats.mode & 0o077) !== 0) {
        artifactChecks.push({eventId:event.eventId,valid:false,reason:"ARTIFACT_PERMISSIONS_INVALID"});
        continue;
      }
      const bytes = await readFile(location);
      const digest = createHash("sha256").update(bytes).digest("hex");
      const valid = digest === event.fields.artifactSha256 &&
        bytes.length === event.fields.artifactBytes;
      artifactChecks.push({eventId:event.eventId,valid,reason:valid?null:"ARTIFACT_HASH_OR_SIZE_MISMATCH"});
      if (valid && raw) detached.set(event.eventId, JSON.parse(bytes.toString("utf8")));
    } catch {
      artifactChecks.push({eventId:event.eventId,valid:false,reason:"ARTIFACT_MISSING_OR_UNREADABLE"});
    }
  }
  if (artifactChecks.some(check => !check.valid && check.reason !== "LEGACY_INLINE_ARTIFACT"))
    warnings.push("ARTIFACT_INTEGRITY_FAILURE");
  const important = events.filter(e => /error|failed|reject|block|warn|validation|repair|recovery/i.test(e.stage));
  const selected = events.filter(e => !stageFilter || e.stage.startsWith(stageFilter));
  const start = Date.parse(events[0]?.timestamp || "");
  const end = Date.parse(events.at(-1)?.timestamp || "");
  const report = {
    file, runId: events[0]?.runId ?? null,
    startedAt: events[0]?.timestamp ?? null,
    lastEventAt: events.at(-1)?.timestamp ?? null,
    elapsedMs: Number.isFinite(start) && Number.isFinite(end) ? end-start : null,
    terminalStage: events.at(-1)?.stage ?? null,
    eventCount: events.length,
    stageCounts, modelExchangeCount: modelExchanges.length,
    usage: {
      calls: usage.length,
      inputTokens: usage.reduce((n,e)=>n+(Number(e.fields?.inputTokens)||0),0),
      outputTokens: usage.reduce((n,e)=>n+(Number(e.fields?.outputTokens)||0),0),
    },
    artifactCount: artifacts.length,
    fullArtifacts: artifacts.filter(e=>e.fields?.fullArtifact===true).length,
    parseErrorLines: parseErrors,
    artifactChecks,
    diagnostics: important.map(e=>({
      eventId:e.eventId,stage:e.stage,
      issueCount:e.fields?.issueCount??null,
      passed:e.fields?.passed??null,
      articleStatus:e.fields?.articleStatus??null,
      route:e.fields?.route??null,
    })),
    warnings: [...new Set(warnings)],
    // Missing telemetry is NEVER proof an execution stage was skipped.
    ...(raw ? { rawEvents:selected.map(event => ({
      ...event,
      ...(detached.has(event.eventId) ? { privateArtifact: detached.get(event.eventId) } : {}),
    })) } : {
      selectedEvents:selected.map(e=>({eventId:e.eventId,stage:e.stage,timestamp:e.timestamp,
        artifactBytes:e.fields?.artifactBytes??null,
        artifactSha256:e.fields?.artifactSha256??null,
        promptSha256:e.fields?.promptSha256??null,
        outputSha256:e.fields?.outputSha256??null,
      })),
    }),
  };
  reports.push(report);
}
console.log(JSON.stringify({version:"GROWTH_OS_TRACE_REPORT_V2",readOnly:true,
  containsPrivateData:raw,reportCount:reports.length,reports},null,2));
