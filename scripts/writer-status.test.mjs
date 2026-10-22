import {test} from "node:test";
import {strict as assert} from "node:assert";
import {mkdtempSync,appendFileSync,rmSync} from "node:fs";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const cli=fileURLToPath(new URL("./writer-status.mjs",import.meta.url));
const id="1760000000000-aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const later="1760000000001-bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const now="2026-10-19T15:00:00.000Z";
function event(n,stage,fields={},runId=id){
  return {version:"GROWTH_OS_WRITER_TRACE_V1",eventId:n,runId,timestamp:now,stage,fields};
}
function write(directory,runId,events){
  appendFileSync(join(directory,"writer-runs.jsonl"),
    events.map(x=>JSON.stringify(x)).join("\n")+"\n",{mode:0o600});
}
function run(directory,args=[]){
  return spawnSync(process.execPath,[cli,directory,...args],{encoding:"utf8"});
}
test("one command summarizes a complete safe real-stage run without text",()=>{
  const directory=mkdtempSync(join(tmpdir(),"writer-quick-"));
  try{
    const events=[
      event(1,"run.started",{scope:"content.article"}),
      event(2,"article.locked_evidence_scope",{}),
      event(3,"writer.preflight.passed",{stage:"required_evidence"}),
      event(4,"writer.draft_generated",{approxWordCount:1986,h2Count:6,h3Count:6}),
      event(5,"model.exchange",{prompt:"PRIVATE_PROMPT_NEEDLE"}),
      event(6,"critic.initial.completed",{status:"WARN"}),
      event(7,"critic.final.completed",{status:"PASS",criticCount:9,repairedSectionCount:1}),
      event(8,"serp.replay.completed",{status:"WARN"}),
      event(9,"audit.final_readiness.completed",{status:"PASS",blockerCount:0,warningCount:1}),
      event(10,"run.succeeded",{articleStatus:"IN_REVIEW"}),
    ];
    write(directory,id,events);
    const result=run(directory,["--json"]);
    assert.equal(result.status,0,result.stderr);
    const report=JSON.parse(result.stdout);
    assert.equal(report.result,"IN_REVIEW");
    assert.equal(report.stages.research,"SIGNED_SCOPE_RECORDED");
    assert.equal(report.stages.critics,"PASS");
    assert.equal(report.stages.replay,"WARN");
    assert.equal(report.stages.readiness,"PASS");
    assert.equal(report.details.draftWords,1986);
    assert.equal(report.details.finalCriticCount,9);
    assert.equal(report.details.repairedSections,1);
    assert.equal(report.details.readinessWarnings,1);
    assert.equal(report.privateTextIncluded,false);
    assert.equal(JSON.stringify(report).includes("PRIVATE_PROMPT_NEEDLE"),false);
    const short=run(directory);
    assert.equal(short.status,0);
    assert.match(short.stdout,/RESULT\s+IN_REVIEW/);
    assert.match(short.stdout,/REPLAY\s+WARN/);
  }finally{rmSync(directory,{recursive:true,force:true});}
});
test("picks latest article, ignores brief runs and prints actionable failure",()=>{
  const directory=mkdtempSync(join(tmpdir(),"writer-quick-"));
  try{
    write(directory,id,[
      event(1,"run.started",{scope:"content.article"}),
      event(2,"writer.preflight.blocked",{
        stage:"section_capacity",
        reasonCode:"SECTION_EDITORIAL_EVIDENCE_CAPACITY_INSUFFICIENT",
        failureClass:"RESEARCH_PLANNING",
        recommendedAction:"REPAIR_VERIFIED_RESEARCH_OR_PLAN",
        message:"PRIVATE_SOURCE_NEEDLE"}),
      event(3,"run.failed",{reasonCode:"SECTION_EDITORIAL_EVIDENCE_CAPACITY_INSUFFICIENT",
        failureClass:"RESEARCH_PLANNING"}),
    ]);
    write(directory,later,[
      event(1,"run.started",{scope:"content.brief"},later),
      event(2,"run.succeeded",{articleStatus:"IN_REVIEW"},later),
    ]);
    const output=run(directory,["--json"]);
    assert.equal(output.status,0);
    const report=JSON.parse(output.stdout);
    assert.equal(report.runId,id);
    assert.equal(report.result,"FAILED");
    assert.equal(report.stages.preflight,"BLOCKED");
    assert.equal(report.details.reasonCode,"SECTION_EDITORIAL_EVIDENCE_CAPACITY_INSUFFICIENT");
    assert.equal(report.details.recommendedAction,"REPAIR_VERIFIED_RESEARCH_OR_PLAN");
    assert.equal(output.stdout.includes("PRIVATE_SOURCE_NEEDLE"),false);
  }finally{rmSync(directory,{recursive:true,force:true});}
});
test("old logs explicitly show not recorded rather than pretending pass",()=>{
  const directory=mkdtempSync(join(tmpdir(),"writer-quick-"));
  try{
    write(directory,id,[
      event(1,"run.started",{scope:"content.article"}),
      event(2,"run.succeeded",{articleStatus:"IN_REVIEW"}),
    ]);
    const output=run(directory,["--json","--run",id]);
    assert.equal(output.status,0,output.stderr);
    const report=JSON.parse(output.stdout);
    assert.equal(report.stages.research,"NOT_RECORDED");
    assert.equal(report.stages.critics,"NOT_RECORDED");
    assert.equal(report.stages.replay,"NOT_RECORDED");
  }finally{rmSync(directory,{recursive:true,force:true});}
});

test("the last critic verdict wins after SERP repair, no false PASS",()=>{
  const directory=mkdtempSync(join(tmpdir(),"writer-quick-"));
  try{
    write(directory,id,[
      event(1,"run.started",{scope:"content.article"}),
      event(2,"writer.draft_generated",{approxWordCount:2000,h2Count:6,h3Count:4}),
      event(3,"critic.final.completed",{status:"PASS",criticCount:9,repairedSectionCount:1}),
      event(4,"critic.final.completed",{status:"BLOCK",criticCount:9,repairedSectionCount:2}),
      event(5,"serp.replay.completed",{status:"WARN"}),
      event(6,"audit.final_readiness.completed",{status:"FAIL",blockerCount:1}),
      event(7,"run.article_rejected",{articleStatus:"REJECTED"}),
    ]);
    const output=run(directory,["--json"]);
    assert.equal(output.status,0);
    const report=JSON.parse(output.stdout);
    assert.equal(report.result,"REJECTED");
    assert.equal(report.stages.critics,"BLOCK");
    assert.equal(report.stages.readiness,"FAIL");
    assert.equal(report.details.repairedSections,2);
  }finally{rmSync(directory,{recursive:true,force:true});}
});

test("missing trace reports a clear error, never generates an article",()=>{
  const output=run("/does-not-exist-growth-os-trace");
  assert.equal(output.status,2);
  assert.match(output.stderr,/NO_LOCAL_WRITER_TRACES/);
});


test("joins the selected template from the matching brief run without exposing the brief ID",()=>{
  const directory=mkdtempSync(join(tmpdir(),"writer-template-join-"));
  const briefHash="a".repeat(64);
  try{
    write(directory,id,[
      event(1,"run.started",{scope:"content.article"}),
      event(2,"article.entrypoint",{briefIdSha256:briefHash}),
      event(3,"article.input_profile",{
        templateId:"NOT_EXPLICITLY_BOUND",templatePolicyBound:false,
        searchIntent:"INFORMATIONAL",primaryKeywordCount:1,
        secondaryKeywordCount:4,uniqueBriefKeywordCount:5,
        keywordCandidateLimit:200,keywordCandidateOverflowCount:0,
        plannedQueryCount:12,plannedTopicCount:6,plannedQuestionCount:4,
        plannedSectionCount:6}),
      event(4,"writer.draft_generated",{approxWordCount:2200,h2Count:6,h3Count:5}),
      event(5,"run.succeeded",{articleStatus:"IN_REVIEW"}),
    ]);
    write(directory,later,[
      event(1,"run.started",{scope:"content.brief"},later),
      event(2,"template.selected",{templateId:"EXPLAINER_GUIDE"},later),
      event(3,"brief.correlation",{briefIdSha256:briefHash},later),
      event(4,"run.succeeded",{articleStatus:"READY"},later),
    ]);
    const output=run(directory,["--json"]);
    assert.equal(output.status,0,output.stderr);
    const report=JSON.parse(output.stdout);
    assert.equal(report.input.templateId,"EXPLAINER_GUIDE");
    assert.equal(report.input.templatePolicyBound,true);
    assert.equal(report.input.uniqueBriefKeywordCount,5);
    assert.equal(report.details.draftH2,6);
    assert.equal(JSON.stringify(report).includes(briefHash),false);
  }finally{rmSync(directory,{recursive:true,force:true});}
});
