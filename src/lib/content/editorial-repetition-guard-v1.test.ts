import {describe,expect,it} from "vitest";
import fixture from "./__fixtures__/repetitive-credit-monitoring-reader-v1.json";
import {
  detectHighConfidenceEditorialRepetitionV1,
} from "./editorial-repetition-guard-v1";

describe("reader-value editorial repetition guard",()=>{
  it("catches the user's real article that previously passed keyword and critic gates",()=>{
    const issues=detectHighConfidenceEditorialRepetitionV1(fixture.sections);
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe("EDITORIAL_RECYCLED_ADVICE_ACROSS_SECTIONS");
    expect(issues[0].sectionIndex).toBeGreaterThan(0);
    expect(issues[0].affectedSections.length).toBeGreaterThanOrEqual(4);
    expect(issues[0].repeatedPhrases).toHaveLength(2);
  });

  it("does not mistake repeated topic terminology alone for repeated advice",()=>{
    const sections=Array.from({length:6},(_,index)=>({
      heading:"Subject "+index,
      bodyMarkdown:[
        "Credit monitoring is the subject of this section.",
        Array.from({length:180},(_,i)=>"unique"+index+"x"+i).join(" "),
      ].join("\n\n"),
    }));
    expect(detectHighConfidenceEditorialRepetitionV1(sections)).toEqual([]);
  });

  it("catches a full paragraph copied between sections without demanding any new AI",()=>{
    const repeated="Compare account activity with the original record and follow the documented process if the source information differs from what the account owner expected during verification.";
    const sections=[
      {heading:"Opening",bodyMarkdown:repeated},
      {heading:"Action",bodyMarkdown:"A unique short introduction.\n\n"+repeated},
    ];
    expect(detectHighConfidenceEditorialRepetitionV1(sections)).toMatchObject([
      {code:"EDITORIAL_REPEATED_PARAGRAPH_ACROSS_SECTIONS",sectionIndex:1},
    ]);
  });

  it("does not classify short or unrelated sections as filler",()=>{
    const sections=[
      {heading:"Purpose",bodyMarkdown:"Explain the purpose clearly."},
      {heading:"Steps",bodyMarkdown:"Give the next steps."},
    ];
    expect(detectHighConfidenceEditorialRepetitionV1(sections)).toEqual([]);
  });

  it("keeps structural headings and fenced code out of the repetition calculation",()=>{
    const sections=Array.from({length:5},(_,i)=>({
      heading:"A topic "+i,
      bodyMarkdown:"## Identical heading\n\n"+
        "Different useful instructions "+i+".\n\n"+
        "~~~text\nThe repeated phrase does not by itself constitute prose.\n~~~",
    }));
    expect(detectHighConfidenceEditorialRepetitionV1(sections)).toEqual([]);
  });
});
