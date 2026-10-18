import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { ArticleExecutionPlanV1 } from "./article-execution-plan-v1";
import { assertCanonicalWriterPreflightV1,
  CANONICAL_WRITER_PREFLIGHT_GATES_V1 } from "./canonical-writer-preflight-v1";
import { withWriterTraceV1 } from "./writer-trace-v1";

const originalTraceDir=process.env.GROWTH_OS_WRITER_TRACE_DIR;
afterEach(()=>{
  if(originalTraceDir===undefined)delete process.env.GROWTH_OS_WRITER_TRACE_DIR;
  else process.env.GROWTH_OS_WRITER_TRACE_DIR=originalTraceDir;
});

function fixture() {
  const sections=Array.from({length:5},(_,i)=>({
    id:"section-"+(i+1),heading:"Topic "+(i+1),level:2 as const,
    state:"WRITABLE" as const,
    mission:"Explain one aspect",requiredTopicIds:["topic-"+i],
    requiredQuestionIds:[],requiredEntityIds:[],
    requiredClaimIds:["claim-"+i+"-a","claim-"+i+"-b"],
    evidenceIds:["excerpt-"+i+"-a","excerpt-"+i+"-b"],
    targetWords:{min:100,preferred:160,max:240},
  }));
  const plan={
    version:"ARTICLE_EXECUTION_PLAN_V1",
    requiredTopics:[],
    requiredQuestions:[],
    sections,
  } as unknown as ArticleExecutionPlanV1;
  const blueprints=sections.map(s=>({heading:s.heading,
    requiredClaims:[...s.requiredClaimIds]}));
  return {plan,blueprints};
}

describe("canonical production/CLI Writer preflight",()=>{
  it("uses exactly five existing authority checks, in one stable order",()=>{
    expect(CANONICAL_WRITER_PREFLIGHT_GATES_V1).toEqual([
      "required_evidence","required_coverage","answer_support",
      "section_capacity","mission_authority",
    ]);
    expect(()=>assertCanonicalWriterPreflightV1(fixture())).not.toThrow();
  });
  it("fails closed on unsupported planned question before paying Writer",()=>{
    const input=fixture();
    const sections=[...input.plan.sections];
    sections[4]={...sections[4]!,
      requiredClaimIds:[],evidenceIds:[],
      requiredQuestionIds:["question-top-service"]};
    const plan={...input.plan,sections};
    expect(()=>assertCanonicalWriterPreflightV1({...input,plan}))
      .toThrow("SECTION_EDITORIAL_EVIDENCE_CAPACITY_INSUFFICIENT");
  });
  it("emits privacy-safe per-gate diagnostics in existing JSONL tracing",async()=>{
    const directory=await mkdtemp(join(tmpdir(),"growth-os-unified-preflight-"));
    process.env.GROWTH_OS_WRITER_TRACE_DIR=directory;
    const input=fixture();
    const sections=[...input.plan.sections];
    sections[4]={...sections[4]!,requiredClaimIds:[],evidenceIds:[],
      requiredQuestionIds:["private-client-question"]};
    try{
      await expect(withWriterTraceV1({scope:"content.article",correlationId:"private-brief"},async()=>{
        assertCanonicalWriterPreflightV1({...input,
          plan:{...input.plan,sections}});
      })).rejects.toThrow("SECTION_EDITORIAL_EVIDENCE_CAPACITY_INSUFFICIENT");
      const filename=(await readdir(directory)).find(n=>n.endsWith(".jsonl"));
      const jsonl=await readFile(join(directory,filename!),"utf8");
      const events=jsonl.trim().split("\n").map(x=>JSON.parse(x));
      const blocked=events.find(x=>x.stage==="writer.preflight.blocked");
      expect(blocked?.fields).toMatchObject({
        stage:"section_capacity",
        reasonCode:"SECTION_EDITORIAL_EVIDENCE_CAPACITY_INSUFFICIENT",
        failureClass:"RESEARCH_PLANNING",
      });
      expect(events.find(x=>x.stage==="run.failed")?.fields)
        .toMatchObject({failureClass:"RESEARCH_PLANNING"});
      expect(jsonl).not.toContain("private-client-question");
      expect(jsonl).not.toContain("private-brief");
    }finally{
      await rm(directory,{recursive:true,force:true});
    }
  });
});