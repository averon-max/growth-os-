import {describe,expect,it} from "vitest";
import {
  reviewAndConstrainVerifiedEvidenceV1,
  type SemanticEvidencePairV1,
  type SemanticEvidenceJudgmentV1,
} from "./semantic-evidence-review-v1";
type Input=Parameters<typeof reviewAndConstrainVerifiedEvidenceV1>[0];
const graph=(items:{id:string;claimId:string;excerpt:string}[]):Input["graph"]=>({
  sources:[],
  claimEvidence:items.map(e=>({
    id:e.id,claimId:e.claimId,sourceId:"source-1",
    kind:"VERIFIED_EXCERPT" as const,relation:"SUPPORTS" as const,
    excerpt:e.excerpt,
  })),
});
const verdict=(pairs:readonly SemanticEvidencePairV1[],
  approved:Set<string>):SemanticEvidenceJudgmentV1[]=>
  pairs.map(p=>({
    claimId:p.claimId,evidenceId:p.evidenceId,
    verdict:approved.has(p.evidenceId)?"SUPPORTED":"PARTIAL",
    reason:approved.has(p.evidenceId)
      ?"Passage states the complete claim.":"Passage does not state the complete relationship.",
  }));

describe("bounded semantic support, no new authority",()=>{
  it("demotes a related alert-speed snippet that cannot support an instruction",async()=>{
    const claim="A person should review an unexpected credit monitoring alert before deciding what action to take.";
    const article=graph([{
      id:"alert-snippet",claimId:"claim-alert",
      excerpt:"Personal credit monitoring services provide direct, immediate alerts necessary for consumers to take swift action, preventing potential damage before it escalates.",
    }]);
    const result=await reviewAndConstrainVerifiedEvidenceV1({
      claims:[{id:"claim-alert",text:claim}],graph:article,
      judge:async pairs=>verdict(pairs,new Set()),
    });
    expect(result.approvedPairs).toBe(0);
    expect(result.demotedEvidenceIds).toEqual(["alert-snippet"]);
    expect(result.graph.claimEvidence[0]).toMatchObject({
      kind:"REFERENCE_ONLY",relation:"PARTIALLY_SUPPORTS",
    });
  });

  it("retains source-only factual support without changing existing evidence ids",async()=>{
    const excerpt="Credit monitoring tracks changes in your credit report.";
    const result=await reviewAndConstrainVerifiedEvidenceV1({
      claims:[{id:"c1",text:excerpt}],
      graph:graph([{id:"e1",claimId:"c1",excerpt}]),
      judge:async pairs=>verdict(pairs,new Set(["e1"])),
    });
    expect(result.approvedPairs).toBe(1);
    expect(result.graph.claimEvidence[0]).toMatchObject({
      id:"e1",kind:"VERIFIED_EXCERPT",relation:"SUPPORTS",
    });
  });

  it("fails closed if the model invents or duplicates evidence ids",async()=>{
    await expect(reviewAndConstrainVerifiedEvidenceV1({
      claims:[{id:"c1",text:"A precise claim"}],
      graph:graph([{id:"e1",claimId:"c1",excerpt:"A precise claim"}]),
      judge:async()=>[{claimId:"c1",evidenceId:"not-in-plan",
        verdict:"SUPPORTED",reason:"Not an authorized evidence id."}],
    })).rejects.toThrow("SEMANTIC_EVIDENCE_REVIEW_INVALID");
  });

  it("does not elevate a model's positive verdict above deterministic conditions",async()=>{
    const claim="Review unusual account activity before approving the action.";
    const result=await reviewAndConstrainVerifiedEvidenceV1({
      claims:[{id:"c1",text:claim}],
      graph:graph([{id:"e1",claimId:"c1",
        excerpt:"Account activity may be reviewed and the action approved."}]),
      judge:async pairs=>verdict(pairs,new Set(["e1"])),
    });
    expect(result.approvedPairs).toBe(0);
    expect(result.graph.claimEvidence[0].kind).toBe("REFERENCE_ONLY");
  });

  it("blocks more than the bounded number of evidence pairs before model calls",async()=>{
    let calls=0;
    await expect(reviewAndConstrainVerifiedEvidenceV1({
      claims:[{id:"c1",text:"A precise claim"}],
      graph:graph(Array.from({length:73},(_,i)=>({
        id:"e"+i,claimId:"c1",excerpt:"A precise claim",
      }))),
      judge:async()=>{calls++;return [];},
    })).rejects.toThrow("REVIEW_BUDGET_EXCEEDED");
    expect(calls).toBe(0);
  });

  it("uses one model batch for fourteen saved evidence excerpts",async()=>{
    let calls=0;
    const result=await reviewAndConstrainVerifiedEvidenceV1({
      claims:[{id:"c1",text:"Credit monitoring tracks changes in your credit report."}],
      graph:graph(Array.from({length:14},(_,i)=>({
        id:"e"+i,claimId:"c1",
        excerpt:"Credit monitoring tracks changes in your credit report.",
      }))),
      judge:async pairs=>{calls++;return verdict(pairs,new Set(pairs.map(p=>p.evidenceId)));},
    });
    expect(calls).toBe(1);
    expect(result.calls).toBe(1);
    expect(result.approvedPairs).toBe(14);
  });
});
