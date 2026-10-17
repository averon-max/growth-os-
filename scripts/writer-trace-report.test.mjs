import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

test("trace report summarizes events without leaking prompt text", () => {
  const dir = mkdtempSync(join(tmpdir(), "growth-writer-report-"));
  try {
    const event = (eventId, timestamp, stage, fields = {}) =>
      JSON.stringify({ version: "GROWTH_OS_WRITER_TRACE_V1", eventId, timestamp, runId: "test", stage, fields });
    writeFileSync(join(dir, "123-aabbcc.jsonl"), [
      event(1,"2026-10-17T00:00:00.000Z","run.started",{scope:"test"}),
      event(2,"2026-10-17T00:00:01.000Z","model.exchange",{stage:"article",model:"test",promptChars:99,outputChars:123,promptText:"private-prompt"}),
      event(3,"2026-10-17T00:00:02.000Z","run.failed",{errorName:"TypeError"}),
    ].join("\n")+"\n");
    const result = spawnSync(process.execPath, ["scripts/writer-trace-report.mjs", dir], {encoding:"utf8"});
    assert.equal(result.status,0,result.stderr);
    assert.doesNotMatch(result.stdout,/private-prompt/);
    const report = JSON.parse(result.stdout);
    assert.equal(report.scanned,1);
    assert.equal(report.runs[0].durationMs,2000);
    assert.equal(report.runs[0].modelExchangeCount,1);
    assert.equal(report.runs[0].outcome.errorName,"TypeError");
  } finally {
    rmSync(dir,{recursive:true,force:true});
  }
});
