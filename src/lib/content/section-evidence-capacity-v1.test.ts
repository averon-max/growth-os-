import {describe,it,expect} from "vitest";
import {
  inspectSectionEvidenceCapacityV1,
  assertSectionEvidenceCapacityV1,
  SectionEvidenceCapacityErrorV1,
  type SectionEvidenceCapacityV1,
} from "./section-evidence-capacity-v1";
const section=(overrides:Partial<SectionEvidenceCapacityV1>={}):SectionEvidenceCapacityV1=>({
  id:"sec-a",heading:"What should you do?",state:"WRITABLE",
  requiredQuestionIds:["question"],requiredTopicIds:["topic"],
  requiredClaimIds:[],evidenceIds:[],
  targetWords:{preferred:260},...overrides,
});

describe("pre-Writer information gain evidence capacity",()=>{
  it("rejects a long answer section with zero factual support before paying for Writer",()=>{
    expect(inspectSectionEvidenceCapacityV1([section()])).toMatchObject([
      {sectionId:"sec-a",reason:"SUBSTANTIVE_QUESTION_WITHOUT_EVIDENCE"},
    ]);
    expect(()=>assertSectionEvidenceCapacityV1([section()]))
      .toThrow(SectionEvidenceCapacityErrorV1);
  });
  it("accepts actual verified claim and matching evidence assignment",()=>{
    expect(inspectSectionEvidenceCapacityV1([section({
      requiredClaimIds:["claim-1"],evidenceIds:["verified-1"],
    })])).toEqual([]);
  });
  it("does not invent a source when an assigned claim has no evidence",()=>{
    expect(inspectSectionEvidenceCapacityV1([section({
      requiredClaimIds:["claim-1"],evidenceIds:[],
    })]).length).toBe(1);
  });
  it("does not force optional deferred sections into Writer",()=>{
    expect(inspectSectionEvidenceCapacityV1([section({
      state:"DEFERRED_NO_EVIDENCE",
    })])).toEqual([]);
  });
  it("blocks a six-section explainer even when each section has one verified fact",()=>{
    const parts=[
      "What is the concept?",
      "How does it work?",
      "What are the limits?",
      "Does it affect outcomes?",
      "What should a reader compare?",
      "How should the reader respond?",
    ];
    const sections=parts.map((heading,index)=>section({
      id:"section-"+index,heading,
      requiredClaimIds:["claim-"+index],
      evidenceIds:["verified-"+index],
    }));
    expect(inspectSectionEvidenceCapacityV1(sections)).toMatchObject([
      {
        sectionId:"article-plan",
        reason:"EXPLANATORY_ARTICLE_HAS_ONE_FACT_PER_SECTION",
      },
    ]);
    expect(()=>assertSectionEvidenceCapacityV1(sections))
      .toThrow(SectionEvidenceCapacityErrorV1);
  });

  it("accepts diversified verified explanations without a numerical word quota",()=>{
    const sections=Array.from({length:6},(_,index)=>section({
      id:"section-"+index,
      heading:"How does factor "+index+" work?",
      requiredClaimIds:["answer-"+index,"detail-"+index],
      evidenceIds:["evidence-"+index],
    }));
    expect(inspectSectionEvidenceCapacityV1(sections)).toEqual([]);
  });

  it("permits concise source-free framing that owns no substantive question",()=>{
    expect(inspectSectionEvidenceCapacityV1([section({
      heading:"Quick orientation",requiredQuestionIds:[],
      requiredTopicIds:[],targetWords:{preferred:100},
    })])).toEqual([]);
  });
  it("blocks a verbose topic explanation without a single supported claim",()=>{
    expect(inspectSectionEvidenceCapacityV1([section({
      heading:"Limitations",requiredQuestionIds:[],
      requiredTopicIds:["limitation"],targetWords:{preferred:220},
    })])).toMatchObject([{reason:"LENGTH_BUDGET_WITHOUT_EVIDENCE"}]);
  });
});
