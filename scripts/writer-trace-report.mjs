#!/usr/bin/env node
/**
 * Read-only, local Writer trace report. Does not load env files, call a model,
 * access a database, or print prompts / model outputs.
 */
import { readdir, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";

const directory = resolve(process.argv[2] || process.env.GROWTH_OS_WRITER_TRACE_DIR || ".growth-os-traces");
const limit = 25;
const runs = [];
let names;
try {
  names = (await readdir(directory)).filter(name => /^\d+-[0-9a-f-]+\.jsonl$/i.test(name)).sort().reverse().slice(0, limit);
} catch (error) {
  if (error?.code === "ENOENT") {
    console.log(JSON.stringify({ directory, runs: [], message: "No trace directory. Set GROWTH_OS_WRITER_TRACE_DIR and run Writer first." }, null, 2));
    process.exit(0);
  }
  throw error;
}
for (const name of names) {
  const lines = (await readFile(join(directory, name), "utf8")).split("\n").filter(Boolean);
  const stages = {};
  const outcomes = [];
  const modelCalls = [];
  let invalidLines = 0;
  let first = null, last = null, lastId = 0, orderErrors = 0;
  for (const line of lines) {
    let e;
    try { e = JSON.parse(line); } catch { invalidLines++; continue; }
    if (e?.version !== "GROWTH_OS_WRITER_TRACE_V1" || typeof e.stage !== "string") { invalidLines++; continue; }
    stages[e.stage] = (stages[e.stage] || 0) + 1;
    if (Number.isInteger(e.eventId)) {
      if (e.eventId <= lastId) orderErrors++;
      lastId = e.eventId;
    }
    const time = Date.parse(e.timestamp);
    if (Number.isFinite(time)) {
      if (first === null) first = time;
      last = time;
    }
    if (/^run\.(succeeded|failed|http_error)$/.test(e.stage)) {
      outcomes.push({
        stage: e.stage,
        httpStatus: typeof e.fields?.httpStatus === "number" ? e.fields.httpStatus : null,
        errorName: typeof e.fields?.errorName === "string" ? e.fields.errorName : null,
      });
    }
    if (e.stage === "model.exchange") {
      modelCalls.push({
        stage: typeof e.fields?.stage === "string" ? e.fields.stage : "unknown",
        model: typeof e.fields?.model === "string" ? e.fields.model : "unknown",
        promptChars: typeof e.fields?.promptChars === "number" ? e.fields.promptChars : null,
        outputChars: typeof e.fields?.outputChars === "number" ? e.fields.outputChars : null,
      });
    }
  }
  runs.push({
    file: name,
    events: Object.values(stages).reduce((a,b) => a+b, 0),
    durationMs: first !== null && last !== null ? Math.max(0,last-first) : null,
    outcome: outcomes.at(-1) || {stage: "incomplete", httpStatus: null, errorName: null},
    modelExchangeCount: modelCalls.length,
    modelCalls,
    stages,
    invalidLines,
    orderErrors,
  });
}
console.log(JSON.stringify({ directory, scanned: runs.length, runs }, null, 2));
