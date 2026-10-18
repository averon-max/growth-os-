import { test } from "node:test";
import { strict as assert } from "node:assert";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./writer-trace-report.mjs", import.meta.url));

test("summarizes isolated writer runs without exposing raw text by default", () => {
  const directory = mkdtempSync(join(tmpdir(), "writer-trace-report-test-"));
  const now = "2026-10-17T12:00:00.000Z";
  const events = [
    {eventId:1,runId:"run-1",timestamp:now,stage:"run.started",fields:{scope:"article"}},
    {eventId:2,runId:"run-1",timestamp:now,stage:"model.exchange",
      fields:{model:"test",promptText:"SECRET_ARTICLE_PROMPT",textMode:"OPT_IN_TEXT_UP_TO_2MB"}},
    {eventId:3,runId:"run-1",timestamp:now,stage:"forensic.critic.initial_suite",
      fields:{fullArtifact:true,artifactBytes:42,artifact:{notes:"PRIVATE_ARTICLE_DRAFT"}}},
    {eventId:4,runId:"run-1",timestamp:now,stage:"run.article_rejected",
      fields:{articleStatus:"REJECTED"}},
  ];
  try {
    writeFileSync(join(directory, "run-1.jsonl"),
      events.map(e=>JSON.stringify(e)).join("\n")+"\n");
    const output = execFileSync(process.execPath,[script,directory,"--run","run-1"],{encoding:"utf8"});
    const report = JSON.parse(output);
    assert.equal(report.readOnly,true);
    assert.equal(report.reports[0].terminalStage,"run.article_rejected");
    assert.equal(report.reports[0].eventCount,4);
    assert.equal(report.reports[0].fullArtifacts,1);
    assert.equal(output.includes("SECRET_ARTICLE_PROMPT"),false);
    assert.equal(output.includes("PRIVATE_ARTICLE_DRAFT"),false);
    const raw = execFileSync(process.execPath,
      [script,directory,"--run","run-1","--stage","forensic.","--raw"],{encoding:"utf8"});
    const rawReport=JSON.parse(raw);
    assert.equal(rawReport.containsPrivateData,true);
    assert.equal(rawReport.reports[0].rawEvents.length,1);
    assert.equal(raw.includes("PRIVATE_ARTICLE_DRAFT"),true);
    assert.equal(raw.includes("SECRET_ARTICLE_PROMPT"),false);
  } finally { rmSync(directory,{recursive:true,force:true}); }
});
