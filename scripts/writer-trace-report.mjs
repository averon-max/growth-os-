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
import { basename, dirname, join } from "node:path";

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

let files = [];
let singleFile = false;
try {
  const stats = await lstat(directory);
  if (stats.isSymbolicLink()) throw Error("TRACE_SYMLINK_NOT_ALLOWED");
  if (stats.isFile()) {
    if ((stats.mode & 0o077) !== 0) throw Error("TRACE_FILE_PERMISSIONS_INVALID");
    singleFile = true;
    files = [directory];
  } else if (stats.isDirectory()) {
    files = (await readdir(directory))
      .filter(name => name === "writer-runs.jsonl" || name.endsWith(".jsonl"))
      .map(name => join(directory, name));
    for (const file of files) {
      const fileStats = await lstat(file);
      if (fileStats.isSymbolicLink() || !fileStats.isFile() || (fileStats.mode & 0o077) !== 0) throw Error("INVALID_TRACE_FILE_OR_PERMISSIONS");
    }
  } else {
    throw Error("INVALID_TRACE_TARGET");
  }
} catch {
  console.error("Trace target unavailable or unsafe; no generation triggered.");
  process.exit(1);
}
if (runId && !singleFile) {
  files = files.filter(file => basename(file) === "writer-runs.jsonl" ||
    basename(file) === runId + ".jsonl");
}
if (!files.length) { console.error("No matching JSONL runs; no generation triggered."); process.exit(1); }

const reports = [];
for (const file of files) {
  const source = await readFile(file, "utf8");
  const allEvents = [];
  const parseErrors = [];
  for (const [index, line] of source.split("\n").entries()) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      if (!event || !Number.isInteger(event.eventId) ||
          typeof event.stage !== "string" || typeof event.runId !== "string")
        parseErrors.push(index + 1);
      else allEvents.push(event);
    } catch { parseErrors.push(index + 1); }
  }
  const grouped = new Map();
  if (basename(file) === "writer-runs.jsonl") {
    // The canonical shared log intentionally contains many run IDs.
    for (const event of allEvents) {
      if (!grouped.has(event.runId)) grouped.set(event.runId, []);
      grouped.get(event.runId).push(event);
    }
  } else if (allEvents.length) {
    // Legacy per-run files are expected to contain exactly one run. Keep
    // mixed IDs visible as an integrity warning instead of hiding corruption.
    grouped.set(allEvents[0].runId, allEvents);
  }
  for (const [groupRunId, unsortedEvents] of grouped) {
  if (runId && groupRunId !== runId) continue;
  const events = unsortedEvents.sort((a,b) => a.eventId - b.eventId);
  const stageCounts = Object.create(null);
  for (const event of events) stageCounts[event.stage] = (stageCounts[event.stage] || 0) + 1;
  const modelExchanges = events.filter(e => e.stage === "model.exchange");
  const usage = events.filter(e => e.stage === "model.usage");
  const artifacts = events.filter(e => e.stage.startsWith("forensic."));
  const terminal = ["run.succeeded", "run.failed", "run.article_rejected", "run.http_error"];
  const warnings = [];
  if (parseErrors.length) warnings.push("MALFORMED_JSONL");
  if (!events.some(e => e.stage === "run.started")) warnings.push("MISSING_START_EVENT");
  const terminalEvents = events.filter(event => terminal.includes(event.stage));
  if (!terminalEvents.length) warnings.push("MISSING_TERMINAL_EVENT");
  if (terminalEvents.length > 1) warnings.push("MULTIPLE_TERMINAL_EVENTS");
  if (terminalEvents.length && !terminal.includes(events.at(-1)?.stage))
    warnings.push("TERMINAL_EVENT_NOT_LAST");
  if (events.length && events[0].eventId !== 1)
    warnings.push("FIRST_EVENT_ID_INVALID");
  if (new Set(events.map(event => event.runId)).size > 1)
    warnings.push("MIXED_RUN_IDS");
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
    if (!name && Object.hasOwn(event.fields ?? {}, "artifact")) {
      try {
        const serialized = JSON.stringify(event.fields.artifact);
        const bytes = Buffer.from(serialized, "utf8");
        const digest = createHash("sha256").update(bytes).digest("hex");
        const valid = digest === event.fields.artifactSha256 &&
          bytes.length === event.fields.artifactBytes;
        artifactChecks.push({eventId:event.eventId,valid,reason:valid?null:"INLINE_ARTIFACT_HASH_OR_SIZE_MISMATCH"});
        if (valid && raw) detached.set(event.eventId, event.fields.artifact);
      } catch {
        artifactChecks.push({eventId:event.eventId,valid:false,reason:"INLINE_ARTIFACT_INVALID"});
      }
      continue;
    }
    if (!name) {
      artifactChecks.push({eventId:event.eventId,valid:false,reason:"LEGACY_INLINE_ARTIFACT"});
      continue;
    }
    if (typeof name !== "string" || !/^\d{6}-[0-9a-f-]+\.json$/.test(name)) {
      artifactChecks.push({eventId:event.eventId,valid:false,reason:"INVALID_ARTIFACT_REFERENCE"});
      continue;
    }
    const traceDirectory = singleFile ? dirname(file) : directory;
    const location = join(traceDirectory, basename(file).slice(0, -6) + ".artifacts", name);
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
  if (artifactChecks.some(check => check.reason === "LEGACY_INLINE_ARTIFACT"))
    warnings.push("LEGACY_INLINE_PRIVATE_ARTIFACT");
  if (artifactChecks.some(check => !check.valid && check.reason !== "LEGACY_INLINE_ARTIFACT"))
    warnings.push("ARTIFACT_INTEGRITY_FAILURE");
  const important = events.filter(e => /error|failed|reject|block|warn|validation|repair|recovery/i.test(e.stage));
  const selected = events.filter(e => !stageFilter || e.stage.startsWith(stageFilter));
  // Safe operator triage: only the bounded code, responsible subsystem and
  // canonical template ID. Never surface exception prose or private drafts.
  const failureEvent = [...events].reverse().find(e => e.stage === "run.failed") ?? null;
  const preflightBlocked = [...events].reverse()
    .find(e => e.stage === "writer.preflight.blocked") ?? null;
  const templateEvent = [...events].reverse()
    .find(e => e.stage === "template.selected") ?? null;
  const safeToken = v => typeof v === "string" &&
    /^[A-Za-z0-9_.-]{1,120}$/.test(v) ? v : null;
  const failureDiagnosis = failureEvent || preflightBlocked ? {
    reasonCode:safeToken(preflightBlocked?.fields?.reasonCode) ??
      safeToken(failureEvent?.fields?.reasonCode),
    failureClass:safeToken(preflightBlocked?.fields?.failureClass) ??
      safeToken(failureEvent?.fields?.failureClass),
    responsibleStage:safeToken(preflightBlocked?.fields?.stage),
    recommendedAction:safeToken(preflightBlocked?.fields?.recommendedAction) ??
      safeToken(failureEvent?.fields?.recommendedAction),
    automaticRetry:false,
  } : null;
  const start = Date.parse(events[0]?.timestamp || "");
  const end = Date.parse(events.at(-1)?.timestamp || "");
  const report = {
    file: singleFile ? basename(file) : basename(file), runId: events[0]?.runId ?? null,
    scope: events.find(e => e.stage === "run.started")?.fields?.scope ?? null,
    briefIdSha256: (() => {
      const value = events.find(e => e.stage === "brief.correlation" || e.stage === "article.entrypoint")
        ?.fields?.briefIdSha256;
      return typeof value === "string" && /^[0-9a-f]{64}$/.test(value) ? value : null;
    })(),
    startedAt: events[0]?.timestamp ?? null,
    lastEventAt: events.at(-1)?.timestamp ?? null,
    elapsedMs: Number.isFinite(start) && Number.isFinite(end) ? end-start : null,
    terminalStage: events.at(-1)?.stage ?? null,
    selectedTemplateId: safeToken(templateEvent?.fields?.templateId),
    failureDiagnosis,
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
}
// Link recorded brief/article traces without guessing from filenames or article content.
const relatedRuns = [];
for (const brief of reports) {
  if (brief.scope !== "content.brief" || !brief.briefIdSha256) continue;
  for (const article of reports) {
    if (article.scope !== "content.article" || article.briefIdSha256 !== brief.briefIdSha256)
      continue;
    relatedRuns.push({
      briefRunId: brief.runId,
      articleRunId: article.runId,
      briefIdSha256: brief.briefIdSha256,
    });
  }
}
console.log(JSON.stringify({version:"GROWTH_OS_TRACE_REPORT_V2",readOnly:true,
  containsPrivateData:raw,reportCount:reports.length,relatedRuns,reports},null,2));
