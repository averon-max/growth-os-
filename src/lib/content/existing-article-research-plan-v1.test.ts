import {describe,expect,it} from "vitest";
import {
  validateResearchExpansionProposalsV1,
  budgetResearchExpansionProposalsV1,
} from "./existing-article-research-plan-v1";
import type {ArticleExecutionPlanV1}
  from "./article-execution-plan-v1";
import type {ResearchExpansionProposalV1}
  from "./existing-article-research-plan-v1";

const plan={
  sections:Array.from({length:6},(_,i)=>({
    id:"section-"+(i+1),
    heading:"How does aspect "+i+" work?",
    state:"WRITABLE",
  })),
} as unknown as ArticleExecutionPlanV1;
const existing=[
  "Credit monitoring tracks updates to certain credit information.",
  "Credit monitoring sends an alert about some monitored changes.",
];
function suggestions():ResearchExpansionProposalV1[]{
  const facts=[
    "Different credit reports can include information from distinct data furnishers.",
    "An automatic change notification may be sent through a configured messaging channel.",
    "A monitoring alert cannot automatically remove a fraudulent account from a report.",
    "Reading your own credit file is normally categorized as a soft inquiry.",
    "A subscription can monitor data from one credit bureau instead of several.",
    "An unfamiliar account can be disputed through the reporting bureau responsible.",
  ];
  return facts.map((text,i)=>({
    sectionId:"section-"+(i+1),
    proposedClaims:[{
      text,category:"FACT" as const,risk:"LOW" as const,
    }],
  }));
}
describe("bounded same-article fact research expansion",()=>{
  it("creates only stable claim ids bound to existing sections",()=>{
    const proposed=validateResearchExpansionProposalsV1({
      plan,existingClaimTexts:existing,proposals:suggestions(),
    });
    expect(proposed).toHaveLength(6);
    expect(proposed[0]).toMatchObject({
      id:"research-section-1-0",sectionId:"section-1",
    });
    expect(new Set(proposed.map(p=>p.id)).size).toBe(6);
  });
  it("fails closed instead of inventing a seventh section",()=>{
    const proposed=suggestions();
    proposed[5]={...proposed[5],sectionId:"new-heading"};
    expect(()=>validateResearchExpansionProposalsV1({
      plan,existingClaimTexts:existing,proposals:proposed,
    })).toThrow("SECTION_ID_INVALID");
  });
  it("does not accept an incomplete proposal leaving a section without new facts",()=>{
    expect(()=>validateResearchExpansionProposalsV1({
      plan,existingClaimTexts:existing,proposals:suggestions().slice(0,5),
    })).toThrow("MISSING_SECTION_RESEARCH");
  });
  it("rejects copying the original existing claim with changed phrasing",()=>{
    const proposed=suggestions();
    proposed[0]={
      sectionId:"section-1",
      proposedClaims:[{
        text:"Credit monitoring tracks updates to certain credit information.",
        category:"FACT",risk:"LOW",
      }],
    };
    expect(()=>validateResearchExpansionProposalsV1({
      plan,existingClaimTexts:existing,proposals:proposed,
    })).toThrow("CLAIM_DUPLICATES_EXISTING_FACT");
  });
  it("contracts a paid 24-fact response to 18, retaining 3 factual proposals per section",()=>{
    const over=suggestions().map((section,i)=>({
      ...section,
      proposedClaims:[...Array.from({length:4},(_,j)=>({
        text:"Distinct topic "+i+" source-observable mechanism "+j+
          " can be independently described by a published page.",
        category:"FACT" as const,risk:"LOW" as const,
      }))],
    }));
    const result=budgetResearchExpansionProposalsV1({
      plan,proposals:over,
    });
    expect(result).toMatchObject({
      offeredClaims:24,retainedClaims:18,droppedClaims:6,
    });
    expect(result.proposals.map(section=>section.proposedClaims.length))
      .toEqual([3,3,3,3,3,3]);
    expect(result.proposals[0].proposedClaims)
      .toEqual(over[0].proposedClaims.slice(0,3));
    expect(validateResearchExpansionProposalsV1({
      plan,existingClaimTexts:existing,
      proposals:result.proposals,
    })).toHaveLength(18);
  });
  it("preserves all original proposals when model respects its cost ceiling",()=>{
    const input=suggestions();
    const result=budgetResearchExpansionProposalsV1({
      plan,proposals:input,
    });
    expect(result.droppedClaims).toBe(0);
    expect(result.proposals).toEqual(input);
  });
  it("does not hide a duplicate or an unknown section when contracting",()=>{
    const original=suggestions().map((p,i)=>({
      ...p,proposedClaims:Array.from({length:4},(_,j)=>({
        text:"Fact domain "+i+" item "+j+
          " is explained using distinct independent verification.",
        category:"FACT" as const,risk:"LOW" as const,
      })),
    }));
    original[5]={...original[5],sectionId:"section-1"};
    expect(()=>budgetResearchExpansionProposalsV1({
      plan,proposals:original,
    })).toThrow("SECTION_ID_INVALID_OR_DUPLICATED");
  });

  it("rejects multi-fact dumps exceeding the bounded plan limit",()=>{
    const proposed=suggestions().map((s,i)=>({
      ...s,
      proposedClaims:Array.from({length:4},(_,j)=>({
        text:"Facet "+i+" point "+j+
          " has a separate precise verification case.",
        category:"FACT" as const,risk:"LOW" as const,
      })),
    }));
    expect(()=>validateResearchExpansionProposalsV1({
      plan,existingClaimTexts:existing,proposals:proposed,
    })).toThrow("TOTAL_PROPOSALS_LIMIT");
  });
  it("does not accept unsupported cost/stat claims via untyped categories",()=>{
    const proposed=suggestions();
    proposed[2]={
      sectionId:"section-3",
      proposedClaims:[{
        text:"A provider charges a precise amount every month.",
        category:"MADE_UP" as never,risk:"LOW",
      }],
    };
    expect(()=>validateResearchExpansionProposalsV1({
      plan,existingClaimTexts:existing,proposals:proposed,
    })).toThrow("CLAIM_TYPE_INVALID");
  });
});
