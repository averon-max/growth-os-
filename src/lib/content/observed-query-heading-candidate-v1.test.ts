import {describe,expect,it} from "vitest";
import {suggestObservedQueryHeadingCandidateV1 as suggest}
  from "./observed-query-heading-candidate-v1";

const sections=[
  {index:0,heading:"What is credit monitoring?",
    persistedH2:"What is credit monitoring?",verifiedEvidenceCount:3},
  {index:3,heading:"Does credit monitoring affect your credit score?",
    persistedH2:"Does credit monitoring affect your credit score?",
    verifiedEvidenceCount:5},
];
describe("read-only query/H2 re-binding suggestion",()=>{
  it("identifies the actual previously unassigned DataForSEO question in existing H2",()=>{
    const match=suggest({
      query:"does credit monitoring affect credit score",sections,
    });
    expect(match).toMatchObject({
      ownerSectionIndex:3,
      ownerHeading:"Does credit monitoring affect your credit score?",
      verifiedEvidenceCount:5,
      confidence:"EXACT_AFTER_POSSESSIVE_NORMALIZATION",
    });
    expect(match?.note).toContain("NOT automatically certified");
  });
  it("does not confuse different search intents with syntactically similar text",()=>{
    expect(suggest({
      query:"does credit monitoring affect credit report",sections,
    })).toBeNull();
    expect(suggest({
      query:"best credit monitoring services",sections,
    })).toBeNull();
  });
  it("requires publication-grade claim evidence and a current persisted matching H2",()=>{
    expect(suggest({
      query:"does credit monitoring affect credit score",
      sections:sections.map(s=>({...s,verifiedEvidenceCount:0})),
    })).toBeNull();
    expect(suggest({
      query:"does credit monitoring affect credit score",
      sections:sections.map(s=>({...s,persistedH2:"Does credit monitoring help?"})),
    })).toBeNull();
  });
  it("rejects ambiguous multiple matching section owners",()=>{
    expect(suggest({
      query:"does credit monitoring affect credit score",
      sections:[...sections,{...sections[1],index:4}],
    })).toBeNull();
  });
});
