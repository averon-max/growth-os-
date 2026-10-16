import {describe,expect,it} from "vitest";
import {evaluateComprehensiveEditorialReleaseV1}
  from "./comprehensive-editorial-release-gate-v1";
import {buildArticleExecutionPlanV1}
  from "./article-execution-plan-v1";

function plan(pageType="EXPLAINER_GUIDE",sections=6){
  return buildArticleExecutionPlanV1({
    websiteId:"site",topic:"credit monitoring",
    primaryQuery:"what is credit monitoring",
    intent:"INFORMATIONAL",pageType,riskClass:"YMYL",
    pageAction:"CREATE_NEW",requiredTopics:[],requiredQuestions:[],
    sections:Array.from({length:sections},(_,i)=>({
      id:"s-"+i,heading:"Question "+i,level:2,mission:"Explain "+i,
      state:"WRITABLE" as const,requiredClaimIds:["c"+i+"a","c"+i+"b"],
      evidenceIds:["e"+i+"a","e"+i+"b"],
    })),
  });
}
function section(i:number,words=350,withH3=false){
  const sentences=[
    "A source-backed explanation of distinct consumer information job "+i+".",
    "The reader learns the meaning, limitation, or next practical step.",
  ].join(" ");
  const body=Array(words).fill("fact").join(" ");
  return "## Reader question "+i+"?\n\n"+
    sentences+"\n\n"+(withH3?
      "### Specific consideration for question "+i+"\n\n"+
      "An independently useful explanation.\n\n":"")+
    body+"\n\n";
}
describe("Product comprehensive structural contract, NOT Google headings quota",()=>{
  it("rejects 2000-word text with only one H2 and one H3",()=>{
    const body="## Main subject\n\n"+"fact ".repeat(2100)+
      "\n### Only child\n\nAnswer.";
    const r=evaluateComprehensiveEditorialReleaseV1({
      plan:plan(),bodyMarkdown:body,
    });
    expect(r.pass).toBe(false);
    expect(r.blockers).toContain(
      "COMPREHENSIVE_EDITORIAL_H2_STRUCTURE_TOO_SHALLOW");
    expect(r.blockers).toContain(
      "COMPREHENSIVE_EDITORIAL_SUBSECTION_STRUCTURE_MISSING");
  });
  it("rejects actual 1714-word six H2 zero-H3 even when the headings exist",()=>{
    const body=Array.from({length:6},(_,i)=>section(i,260)).join("");
    const r=evaluateComprehensiveEditorialReleaseV1({
      plan:plan(),bodyMarkdown:body,
    });
    expect(r.pass).toBe(false);
    expect(r.blockers).toContain(
      "COMPREHENSIVE_EDITORIAL_DEPTH_BELOW_TARGET");
    expect(r.blockers).toContain(
      "COMPREHENSIVE_EDITORIAL_SUBSECTION_STRUCTURE_MISSING");
  });
  it("rejects 2050+ words with H3 all nested in one H2, and 2 H3",()=>{
    const body=Array.from({length:6},(_,i)=>section(i,370,i===0)).join("")+
      "### Another child of last section\n\n"+("explain ".repeat(80));
    const r=evaluateComprehensiveEditorialReleaseV1({
      plan:plan(),bodyMarkdown:body,
    });
    expect(r.pass).toBe(false);
    expect(r.blockers).toContain(
      "COMPREHENSIVE_EDITORIAL_SUBSECTION_STRUCTURE_MISSING");
  });
  it("accepts substantive 6 H2 and >=3 meaningful H3 in multiple sections",()=>{
    const body=Array.from({length:6},(_,i)=>section(i,350,i<3)).join("");
    const r=evaluateComprehensiveEditorialReleaseV1({
      plan:plan(),bodyMarkdown:body,
    });
    expect(r.pass).toBe(true);
    expect(r.h2Count).toBe(6);
    expect(r.h3Count).toBe(3);
    expect(r.minimumH2).toBe(6);
    expect(r.minimumH3).toBe(3);
    expect(r.h3OwnerSections).toBe(3);
  });
  it("rejects planned 8 H2 when final Writer silently collapses to 6",()=>{
    const body=Array.from({length:6},(_,i)=>section(i,400,i<3)).join("");
    const r=evaluateComprehensiveEditorialReleaseV1({
      plan:plan("EXPLAINER_GUIDE",8),bodyMarkdown:body,
    });
    expect(r.pass).toBe(false);
    expect(r.minimumH2).toBe(8);
    expect(r.blockers).toContain(
      "COMPREHENSIVE_EDITORIAL_H2_STRUCTURE_TOO_SHALLOW");
  });
  it("rejects meaningless 10-word H2s hidden behind a giant section",()=>{
    const body=section(0,2050)+Array.from({length:5},(_,i)=>
      section(i+1,3,i<3)).join("");
    const r=evaluateComprehensiveEditorialReleaseV1({
      plan:plan(),bodyMarkdown:body,
    });
    expect(r.blockers).toContain(
      "COMPREHENSIVE_EDITORIAL_SHALLOW_H2_PARAGRAPHS");
  });
  it("rejects exact repeated paragraphs rather than rewarding keyword padding",()=>{
    const repeated="Credit monitoring provides an alert that helps consumers check changes in a report. ".repeat(3);
    const body=Array.from({length:6},(_,i)=>
      "## Question "+i+"\n\n"+repeated+"\n\n"+
      (i<3?"### Detail\n\n":"")+("fact ".repeat(340))+"\n\n"
    ).join("");
    expect(evaluateComprehensiveEditorialReleaseV1({
      plan:plan(),bodyMarkdown:body,
    }).blockers).toContain(
      "COMPREHENSIVE_EDITORIAL_DUPLICATED_PARAGRAPHS");
  });
  it("does not force long-form shape or decorative H3 onto short FAQ pages",()=>{
    const r=evaluateComprehensiveEditorialReleaseV1({
      plan:plan("FAQ"),bodyMarkdown:"Short direct answer.",
    });
    expect(r.pass).toBe(true);
    expect(r.minimumH2).toBeNull();
    expect(r.minimumH3).toBe(0);
  });
});
