import {describe,expect,it} from "vitest";
import {
  COMPREHENSIVE_INFORMATIONAL_TARGET_WORDS_V1,
  deriveSectionBudgetsForLengthContractV1,
  resolveArticleLengthContractV1,
} from "./article-length-contract-v1";
import {buildMasterSectionPrompt} from "./master-section-prompt";
import type {SectionGenerationContractV1}
  from "./article-generation-contract";

describe("Comprehensive informational editorial depth",()=>{
  it("plans deeper evidence-grounded guides as a product standard, not a Google ranking rule",()=>{
    const profile=resolveArticleLengthContractV1({
      intent:"INFORMATIONAL",pageType:"GUIDE",
    });
    expect(profile.articleClass).toBe("COMPREHENSIVE_INFORMATIONAL");
    expect(profile.targetWords)
      .toEqual({min:2000,max:3200});
    expect(COMPREHENSIVE_INFORMATIONAL_TARGET_WORDS_V1.min).toBe(2000);
  });
  it("scales six section depth budgets without inventing extra topics or sections",()=>{
    const profile=resolveArticleLengthContractV1({
      intent:"DEFINITIONAL",pageType:"EXPLAINER_GUIDE",
    });
    const sections=Array.from({length:6},(_,i)=>({
      id:"section-"+(i+1),state:"WRITABLE",
      targetWords:{min:150,preferred:230+i*5,max:400},
    }));
    const budget=deriveSectionBudgetsForLengthContractV1(sections,profile);
    expect(budget.size).toBe(6);
    const total=(key:"min"|"preferred"|"max")=>
      [...budget.values()].reduce((n,v)=>n+v[key],0);
    expect(total("min")).toBe(2000);
    expect(total("preferred")).toBe(2600);
    expect(total("max")).toBe(3200);
  });
  it("does not demand long-form depth on narrow FAQ or product pages",()=>{
    expect(resolveArticleLengthContractV1({
      intent:"INFORMATIONAL",pageType:"FAQ",
    }).targetWords).toBeNull();
    expect(resolveArticleLengthContractV1({
      intent:"COMMERCIAL",pageType:"PRODUCT_REVIEW",
    }).targetWords).toBeNull();
  });
  it("lets only real assigned search jobs motivate optional H3 and natural long-tail language",()=>{
    const contract={
      version:"SECTION_GENERATION_CONTRACT_V1",
      sectionIndex:0,sectionNumber:1,totalSections:1,
      blueprint:{heading:"What credit monitoring covers",
        mission:"Help the reader understand monitoring scope.",
        queryNodeIds:["observed-query-1","observed-query-2"],
        requiredClaims:[],forbiddenClaims:[],
        evidenceIds:[],internalLinks:[],
        expectedOutcome:"Reader understands the actual scope."},
      queryGraph:{nodes:[{
        id:"observed-query-1",query:"how credit monitoring works",
        intent:"INFORMATIONAL",
      },{
        id:"observed-query-2",query:"credit monitoring limitations",
        intent:"INFORMATIONAL",
      }]},
      executionPlanAuthority:{requiredTopics:[],
        requiredQuestions:[{id:"question-1",label:"Which changes are tracked?"},
          {id:"question-2",label:"What is not covered?"}],
        targetWords:{min:240,preferred:400,max:540}},
    } as unknown as SectionGenerationContractV1;
    const prompt=buildMasterSectionPrompt(contract);
    expect(prompt).toContain("how credit monitoring works");
    expect(prompt).toContain("credit monitoring limitations");
    expect(prompt).toContain("meaningfully distinct, evidence-supported reader subquestions");
    expect(prompt).toContain("descriptive H3 headings (###)");
    expect(prompt).toContain("Never add a decorative H3");
    expect(prompt).toContain("never force exact-match wording");
    expect(prompt).toContain("stop rather than producing generic filler");
  });
});
