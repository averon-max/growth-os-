import { test } from "node:test";
import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./writer-trace-report.mjs", import.meta.url));

function execute(directory, extra = []) {
  return JSON.parse(execFileSync(process.execPath,
    [script, directory, "--run", "run-1", ...extra], {encoding:"utf8"}));
}

test("validates detached artifact integrity without revealing private contents by default", () => {
  const directory = mkdtempSync(join(tmpdir(), "writer-trace-report-test-"));
  const content = JSON.stringify({notes:"PRIVATE_ARTICLE_DRAFT"});
  const digest = createHash("sha256").update(content, "utf8").digest("hex");
  const now = "2026-10-17T12:00:00.000Z";
  const artifactName = "000003-abcd1234-abcd.json";
  const events = [
    {eventId:1,runId:"run-1",timestamp:now,stage:"run.started",fields:{scope:"article"}},
    {eventId:2,runId:"run-1",timestamp:now,stage:"model.exchange",
      fields:{model:"test",textMode:"PRIVATE_ARTIFACT",promptSha256:"abc123"}},
    {eventId:3,runId:"run-1",timestamp:now,stage:"forensic.critic.initial_suite",
      fields:{fullArtifact:true,artifactFile:artifactName,artifactBytes:Buffer.byteLength(content),
        artifactSha256:digest}},
    {eventId:4,runId:"run-1",timestamp:now,stage:"run.article_rejected",
      fields:{articleStatus:"REJECTED"}},
  ];
  try {
    const privateDir=join(directory,"run-1.artifacts");
    mkdirSync(privateDir,{mode:0o700});
    const artifactFile=join(privateDir,artifactName);
    writeFileSync(artifactFile,content,{mode:0o600});
    writeFileSync(join(directory,"run-1.jsonl"),
      events.map(e=>JSON.stringify(e)).join("\n")+"\n",{mode:0o600});

    const result=execute(directory);
    assert.equal(result.readOnly,true);
    assert.equal(result.reports[0].terminalStage,"run.article_rejected");
    assert.equal(result.reports[0].fullArtifacts,1);
    assert.deepEqual(result.reports[0].artifactChecks,[{eventId:3,valid:true,reason:null}]);
    assert.equal(JSON.stringify(result).includes("PRIVATE_ARTICLE_DRAFT"),false);

    const raw=execute(directory,["--stage","forensic.","--raw"]);
    assert.equal(raw.containsPrivateData,true);
    assert.equal(raw.reports[0].rawEvents.length,1);
    assert.equal(raw.reports[0].rawEvents[0].privateArtifact.notes,"PRIVATE_ARTICLE_DRAFT");

    writeFileSync(artifactFile,JSON.stringify({notes:"MODIFIED_DATA"}),{mode:0o600});
    const changed=execute(directory);
    assert.equal(changed.reports[0].artifactChecks[0].valid,false);
    assert.ok(changed.reports[0].warnings.includes("ARTIFACT_INTEGRITY_FAILURE"));
  } finally {
    rmSync(directory,{recursive:true,force:true});
  }
});

test("reports malformed JSONL, missing terminal event and broken sequences", () => {
  const directory=mkdtempSync(join(tmpdir(),"writer-trace-report-corrupt-"));
  try {
    const events=[
      {eventId:1,runId:"run-1",timestamp:"2026-10-17T12:00:00Z",stage:"run.started",fields:{}},
      {eventId:4,runId:"run-1",timestamp:"2026-10-17T12:01:00Z",stage:"research.error",fields:{}},
    ];
    writeFileSync(join(directory,"run-1.jsonl"),
      events.map(e=>JSON.stringify(e)).join("\n")+"\n{broken json\n",{mode:0o600});
    const report=execute(directory).reports[0];
    assert.ok(report.warnings.includes("MALFORMED_JSONL"));
    assert.ok(report.warnings.includes("NONCONTIGUOUS_SEQUENCE"));
    assert.ok(report.warnings.includes("MISSING_TERMINAL_EVENT"));
    assert.deepEqual(report.parseErrorLines,[3]);
  } finally {
    rmSync(directory,{recursive:true,force:true});
  }
});

test("identifies mixed run IDs, wrong first event and terminal not last", () => {
  const directory=mkdtempSync(join(tmpdir(),"writer-trace-report-integrity-"));
  try {
    const now="2026-10-17T12:00:00Z";
    const events=[
      {eventId:2,runId:"run-1",timestamp:now,stage:"run.started",fields:{}},
      {eventId:3,runId:"other-run",timestamp:now,stage:"run.succeeded",fields:{}},
      {eventId:4,runId:"run-1",timestamp:now,stage:"late.event",fields:{}},
    ];
    writeFileSync(join(directory,"run-1.jsonl"),
      events.map(event=>JSON.stringify(event)).join("\n")+"\n");
    const warnings=execute(directory).reports[0].warnings;
    assert.ok(warnings.includes("FIRST_EVENT_ID_INVALID"));
    assert.ok(warnings.includes("MIXED_RUN_IDS"));
    assert.ok(warnings.includes("TERMINAL_EVENT_NOT_LAST"));
  } finally {
    rmSync(directory,{recursive:true,force:true});
  }
});

test("shows stable template and error owner without leaking private section details", () => {
  const directory=mkdtempSync(join(tmpdir(),"writer-trace-actionable-"));
  try {
    const now="2026-10-18T12:00:00Z";
    const events=[
      {eventId:1,runId:"run-1",timestamp:now,stage:"run.started",
        fields:{scope:"content.article"}},
      {eventId:2,runId:"run-1",timestamp:now,stage:"template.selected",
        fields:{templateId:"EXPLAINER_GUIDE"}},
      {eventId:3,runId:"run-1",timestamp:now,stage:"writer.preflight.blocked",
        fields:{stage:"section_capacity",
          reasonCode:"SECTION_EDITORIAL_EVIDENCE_CAPACITY_INSUFFICIENT",
          failureClass:"RESEARCH_PLANNING",
          recommendedAction:"REPAIR_VERIFIED_RESEARCH_OR_PLAN",
          errorMessage:"PRIVATE_CLIENT_CLAIM"}},
      {eventId:4,runId:"run-1",timestamp:now,stage:"run.failed",
        fields:{reasonCode:"SECTION_EDITORIAL_EVIDENCE_CAPACITY_INSUFFICIENT",
          failureClass:"RESEARCH_PLANNING"}},
    ];
    writeFileSync(join(directory,"run-1.jsonl"),
      events.map(e=>JSON.stringify(e)).join("\n")+"\n",{mode:0o600});
    const report=execute(directory);
    assert.equal(report.reports[0].selectedTemplateId,"EXPLAINER_GUIDE");
    assert.deepEqual(report.reports[0].failureDiagnosis,{
      reasonCode:"SECTION_EDITORIAL_EVIDENCE_CAPACITY_INSUFFICIENT",
      failureClass:"RESEARCH_PLANNING",
      responsibleStage:"section_capacity",
      recommendedAction:"REPAIR_VERIFIED_RESEARCH_OR_PLAN",
      automaticRetry:false,
    });
    assert.equal(JSON.stringify(report).includes("PRIVATE_CLIENT_CLAIM"),false);
  } finally {
    rmSync(directory,{recursive:true,force:true});
  }
});


test("groups shared append-only file by run ID and verifies inline private artifacts",()=>{
  const directory=mkdtempSync(join(tmpdir(),"writer-trace-shared-log-"));
  const log=join(directory,"writer-runs.jsonl");
  const now="2026-10-21T12:00:00.000Z";
  const privateArtifact={headings:["What is credit monitoring?"],keywords:["credit monitoring"]};
  const serialized=JSON.stringify(privateArtifact);
  const artifactHash=createHash("sha256").update(serialized,"utf8").digest("hex");
  const events=[
    {eventId:1,runId:"run-1",timestamp:now,stage:"run.started",fields:{scope:"content.article"}},
    {eventId:1,runId:"run-2",timestamp:now,stage:"run.started",fields:{scope:"content.brief"}},
    {eventId:2,runId:"run-1",timestamp:now,stage:"forensic.writer.draft_outline",
      fields:{fullArtifact:true,artifactBytes:Buffer.byteLength(serialized),artifactSha256:artifactHash,artifact:privateArtifact}},
    {eventId:3,runId:"run-1",timestamp:now,stage:"run.article_rejected",fields:{articleStatus:"REJECTED"}},
    {eventId:2,runId:"run-2",timestamp:now,stage:"run.succeeded",fields:{articleStatus:"READY"}},
  ];
  try{
    writeFileSync(log,events.map(e=>JSON.stringify(e)).join("\n")+"\n",{mode:0o600});
    const safe=execute(directory);
    assert.equal(safe.reports.length,1);
    assert.equal(safe.reports[0].runId,"run-1");
    assert.deepEqual(safe.reports[0].artifactChecks,[{eventId:2,valid:true,reason:null}]);
    assert.equal(JSON.stringify(safe).includes("credit monitoring"),false);
    const raw=execute(directory,["--stage","forensic.","--raw"]);
    assert.equal(raw.reports[0].rawEvents[0].privateArtifact.headings[0],"What is credit monitoring?");
  }finally{
    rmSync(directory,{recursive:true,force:true});
  }
});
