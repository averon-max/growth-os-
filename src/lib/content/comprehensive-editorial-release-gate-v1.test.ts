import {describe,expect,it} from "vitest";
import {evaluateComprehensiveEditorialReleaseV1}
  from "./comprehensive-editorial-release-gate-v1";
import {buildArticleExecutionPlanV1} from "./article-execution-plan-v1";
function plan(pageType="EXPLAINER_GUIDE"){
  return buildArticleExecutionPlanV1({
    websiteId:"site",topic:"credit monitoring",
    primaryQuery:"what is credit monitoring",
    intent:"INFORMATIONAL",pageType,riskClass:"YMYL",
    pageAction:"CREATE_NEW",requiredTopics:[],
    requiredQuestions:[],
    sections:Array.from({length:6},(_,i)=>({
      id:"s-"+i,heading:"Section "+i,level:2,mission:"Explain",
      state:"WRITABLE" as const,requiredClaimIds:["c1","c2"],
      evidenceIds:["e1","e2"],
    })),
  });
}
describe("Comprehensive editorial release threshold",()=>{
  it("rejects real 1714-word six-H2 zero-H3 case despite keyword coverage",()=>{
    const text=Array(1714).fill("word").join(" ");
    const r=evaluateComprehensiveEditorialReleaseV1({
      plan:plan(),bodyMarkdown:text,
    });
    expect(r.pass).toBe(false);
    expect(r.blockers).toEqual([
      "COMPREHENSIVE_EDITORIAL_DEPTH_BELOW_TARGET",
      "COMPREHENSIVE_EDITORIAL_SUBSECTION_STRUCTURE_MISSING",
    ]);
  });
  it("accepts evidence-rich well-structured 2050-word answer",()=>{
    const body="### Scope\n\n"+"fact ".repeat(1025)+
      "\n### Limitations\n\n"+"fact ".repeat(1025);
    expect(evaluateComprehensiveEditorialReleaseV1({
      plan:plan(),bodyMarkdown:body,
    }).pass).toBe(true);
  });
  it("does not require long-form or decorative H3 for narrow pages",()=>{
    const r=evaluateComprehensiveEditorialReleaseV1({
      plan:plan("FAQ"),bodyMarkdown:"Short direct answer.",
    });
    expect(r.pass).toBe(true);
  });
});
