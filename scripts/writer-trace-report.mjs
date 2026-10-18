#!/usr/bin/env node
// Growth OS Writer: read-only JSONL report. No changes to generation, database or files.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
const folder = process.argv[2] || ".growth-os-traces";
const names = (await readdir(folder)).filter(name => name.endsWith(".jsonl")).sort();
const report = [];
for (const name of names) {
  const source = await readFile(join(folder, name), "utf8");
  const events = []; let invalidLines = 0;
  for (const line of source.split("\n").filter(Boolean)) {
    try { const parsed = JSON.parse(line); if (parsed?.stage) events.push(parsed); else invalidLines++; }
    catch { invalidLines++; }
  }
  const names = events.map(event => String(event.stage));
  const has = prefix => names.some(stage => stage.includes(prefix));
  const models = events.filter(event => event.stage === "model.exchange");
  const usage = events.filter(event => event.stage === "model.usage");
  const gaps = [];
  if (!has("query.signal")) gaps.push("KEYWORD_PROVENANCE_NOT_VISIBLE");
  if (!has("research.collected")) gaps.push("SERP_RESEARCH_NOT_VISIBLE");
  if (!has("evidence")) gaps.push("EVIDENCE_NOT_VISIBLE");
  if (!has("critic") && !has("audit")) gaps.push("FINAL_REVIEW_NOT_VISIBLE");
  if (models.some(event => event.fields?.textMode !== "OPT_IN_TEXT_UP_TO_2MB")) gaps.push("FULL_MODEL_TEXT_NOT_ENABLED");
  if (invalidLines) gaps.push("INVALID_JSONL_LINES");
  report.push({
    file:name, runId:events[0]?.runId || null, eventCount:events.length, invalidLines,
    startedAt:events[0]?.timestamp || null, lastAt:events.at(-1)?.timestamp || null,
    lastStage:events.at(-1)?.stage || null, stages:[...new Set(names)],
    modelCalls:models.length,
    requestFingerprints:models.map(event => ({
      stage:event.fields?.stage, model:event.fields?.model,
      promptSha256:event.fields?.promptSha256, outputSha256:event.fields?.outputSha256,
      promptChars:event.fields?.promptChars, outputChars:event.fields?.outputChars,
      textMode:event.fields?.textMode
    })),
    usage:{ inputTokens:usage.reduce((sum,event)=>sum+(Number(event.fields?.inputTokens)||0),0),
      outputTokens:usage.reduce((sum,event)=>sum+(Number(event.fields?.outputTokens)||0),0) },
    visibilityGaps:gaps
  });
}
console.log(JSON.stringify({version:"GROWTH_OS_TRACE_REPORT_V1", readOnly:true, reports:report},null,2));
