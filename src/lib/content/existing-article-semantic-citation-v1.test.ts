import {describe,expect,it} from "vitest";
import {
  buildSignedSemanticCitationWorklistV1,
  applyReviewedSignedSemanticCitationsV1,
} from "./existing-article-semantic-citation-v1";
import type {ArticleExecutionPlanV1} from "./article-execution-plan-v1";
import type {MasterRuntimeSnapshotV1} from "./master-runtime-adapter";

const plan={
  sections:[
    {state:"WRITABLE",heading:"How does credit monitoring work?",
      evidenceIds:["ev_alert"],requiredClaimIds:["claim_alert"]},
    {state:"WRITABLE",heading:"What happens after an alert?",
      evidenceIds:["ev_dispute"],requiredClaimIds:["claim_dispute"]},
  ],
} as unknown as ArticleExecutionPlanV1;
const runtime={
  claimLedger:{claims:[
    {id:"claim_alert",status:"VERIFIED",
      text:"Monitoring services send alerts when selected changes are detected in credit reports."},
    {id:"claim_dispute",status:"VERIFIED",
      text:"Consumers can dispute inaccurate information on their credit reports."},
    {id:"claim_outside",status:"VERIFIED",
      text:"This claim belongs to a different section only."},
  ]},
  evidenceGraph:{
    sources:[
      {id:"s_alert",url:"https://www.consumerfinance.gov/monitoring",
        publisher:"CFPB"},
      {id:"s_dispute",url:"https://consumer.ftc.gov/dispute",
        publisher:"FTC"},
      {id:"s_outside",url:"https://example.org/invalid",
        publisher:"Unassigned"},
    ],
    claimEvidence:[
      {id:"ev_alert",sourceId:"s_alert",claimId:"claim_alert",
        kind:"VERIFIED_EXCERPT",relation:"SUPPORTS",
        excerpt:"Alerts notify you of certain credit report changes."},
      {id:"ev_dispute",sourceId:"s_dispute",claimId:"claim_dispute",
        kind:"VERIFIED_EXCERPT",relation:"SUPPORTS",
        excerpt:"You have the right to dispute errors on your credit report."},
      {id:"ev_outside",sourceId:"s_outside",claimId:"claim_outside",
        kind:"VERIFIED_EXCERPT",relation:"SUPPORTS",
        excerpt:"This source does not belong to these sections."},
    ],
  },
} as unknown as MasterRuntimeSnapshotV1;
const article=[
  "## How does credit monitoring work?",
  "After you enroll in a service, it may notify you about selected changes to your credit file.",
  "This does not guarantee that every kind of fraud will be identified.",
  "## What happens after an alert?",
  "If the report contains a mistake, you can contact a credit reporting company to challenge that item.",
].join("\n\n");
const make=()=>buildSignedSemanticCitationWorklistV1({
  bodyMarkdown:article,plan,runtime,
});
describe("signed paraphrase citation review",()=>{
  it("offers already written exact sentences and ONLY the signed H2 sources",()=>{
    const w=make();
    expect(w).toHaveLength(2);
    expect(w[0]!.availableSources.map(s=>s.claimId)).toEqual(["claim_alert"]);
    expect(w[1]!.availableSources.map(s=>s.claimId)).toEqual(["claim_dispute"]);
    expect(w[0]!.sentences[0]!.text).toContain("After you enroll");
    expect(w[0]!.availableSources[0]!.verifiedExcerpt).toContain("Alerts notify");
  });
  it("adds reviewed citation to an unchanged pre-existing sentence, never creates claims",()=>{
    const w=make();
    const r=applyReviewedSignedSemanticCitationsV1({
      bodyMarkdown:article,plan,runtime,worklist:w,
      verdicts:[
        {sectionIndex:0,choices:[{
          claimId:"claim_alert",evidenceId:"ev_alert",
          sentenceId:w[0]!.sentences[0]!.id,verdict:"SUPPORTED",
          reason:"Same restricted category of alerts about credit file changes.",
        }]},
        {sectionIndex:1,choices:[{
          claimId:"claim_dispute",evidenceId:"ev_dispute",
          sentenceId:w[1]!.sentences[0]!.id,verdict:"SUPPORTED",
          reason:"Both concern disputing a mistaken credit report entry.",
        }]},
      ],
    });
    expect(r.addedCitations).toBe(2);
    expect(r.proposedBodyMarkdown).toContain(
      "[Source: CFPB](https://www.consumerfinance.gov/monitoring)");
    expect(r.proposedBodyMarkdown).toContain(
      "[Source: FTC](https://consumer.ftc.gov/dispute)");
    expect(r.proposedBodyMarkdown).toContain(
      "After you enroll in a service, it may notify you about selected changes to your credit file.");
    expect(r.commitAllowed).toBe(false);
    expect(r.nineCriticsPerformed).toBe(false);
  });
  it("cannot add a source belonging to another H2 even if globally verified",()=>{
    const w=make();
    expect(()=>applyReviewedSignedSemanticCitationsV1({
      bodyMarkdown:article,plan,runtime,worklist:w,
      verdicts:[
        {sectionIndex:0,choices:[{
          claimId:"claim_outside",evidenceId:"ev_outside",sentenceId:0,
          verdict:"SUPPORTED",reason:"False source ownership is not authority.",
        }]},
        {sectionIndex:1,choices:[]},
      ],
    })).toThrow("CITATION_REVIEW_UNASSIGNED_OR_DUPLICATE_PAIR");
  });
  it("requires an actual matching exact sentenceId; rejects model fabrication",()=>{
    const w=make();
    expect(()=>applyReviewedSignedSemanticCitationsV1({
      bodyMarkdown:article,plan,runtime,worklist:w,
      verdicts:[
        {sectionIndex:0,choices:[{
          claimId:"claim_alert",evidenceId:"ev_alert",sentenceId:5555,
          verdict:"SUPPORTED",reason:"A hallucinated sentence must fail.",
        }]},
        {sectionIndex:1,choices:[]},
      ],
    })).toThrow("CITATION_REVIEW_UNKNOWN_OR_UNSAFE_SENTENCE");
  });
  it("cannot promote a missing or different signed excerpt",()=>{
    const w=make();
    const changed={...w[0]!,availableSources:[{
      ...w[0]!.availableSources[0],verifiedExcerpt:"New model-written content",
    }]};
    expect(()=>applyReviewedSignedSemanticCitationsV1({
      bodyMarkdown:article,plan,runtime,
      worklist:[changed,w[1]!],
      verdicts:[{sectionIndex:0,choices:[]},{sectionIndex:1,choices:[]}],
    })).toThrow("CITATION_REVIEW_SOURCE_OR_ARTICLE_CHANGED");
  });
  it("PARTIAL review cannot create a citation",()=>{
    const w=make();
    const r=applyReviewedSignedSemanticCitationsV1({
      bodyMarkdown:article,plan,runtime,worklist:w,
      verdicts:[
        {sectionIndex:0,choices:[{
          claimId:"claim_alert",evidenceId:"ev_alert",sentenceId:null,
          verdict:"PARTIAL",reason:"Only the general topic is supported.",
        }]},
        {sectionIndex:1,choices:[]},
      ],
    });
    expect(r.addedCitations).toBe(0);
  });
});
