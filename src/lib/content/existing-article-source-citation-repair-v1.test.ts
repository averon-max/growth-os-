import {describe,expect,it} from "vitest";
import {draftExistingArticleSignedCitationsV1,
  getOwnedVerifiedCitationsV1} from "./existing-article-source-citation-repair-v1";
import type {ArticleExecutionPlanV1} from "./article-execution-plan-v1";
import type {MasterRuntimeSnapshotV1} from "./master-runtime-adapter";

const claim="Credit monitoring alerts consumers when certain changes appear on their credit reports.";
const plan={
  version:"ARTICLE_EXECUTION_PLAN_V1",
  sections:[{
    state:"WRITABLE",heading:"How credit monitoring works",
    evidenceIds:["ev_good","ev_foreign"],requiredClaimIds:["claim_good"],
  },{
    state:"WRITABLE",heading:"Credit monitoring limitations",
    evidenceIds:["ev_two"],requiredClaimIds:["claim_two"],
  }],
} as unknown as ArticleExecutionPlanV1;
const runtime={
  claimLedger:{claims:[
    {id:"claim_good",text:claim,status:"VERIFIED"},
    {id:"claim_two",text:"Credit monitoring does not prevent identity theft from happening to every individual.",status:"VERIFIED"},
    {id:"claim_foreign",text:"Unrelated claim with a different evidence source.",
      status:"VERIFIED"},
  ]},
  evidenceGraph:{
    sources:[
      {id:"source_good",url:"https://consumer.ftc.gov/articles/example",
        publisher:"Federal Trade Commission"},
      {id:"source_two",url:"https://www.consumerfinance.gov/example",
        publisher:"Consumer Financial Protection Bureau"},
      {id:"source_foreign",url:"https://example.org/unapproved",
        publisher:"Unapproved source"},
      {id:"source_bad",url:"http://127.0.0.1/private",
        publisher:"Unsafe source"},
    ],
    claimEvidence:[
      {id:"ev_good",claimId:"claim_good",sourceId:"source_good",
        kind:"VERIFIED_EXCERPT",relation:"SUPPORTS",
        excerpt:"Credit monitoring alerts consumers when certain changes appear on their credit reports."},
      {id:"ev_foreign",claimId:"claim_foreign",sourceId:"source_foreign",
        kind:"VERIFIED_EXCERPT",relation:"SUPPORTS",excerpt:"Real excerpt"},
      {id:"ev_two",claimId:"claim_two",sourceId:"source_two",
        kind:"VERIFIED_EXCERPT",relation:"SUPPORTS",excerpt:"Real excerpt"},
      {id:"ev_unsafe",claimId:"claim_good",sourceId:"source_bad",
        kind:"VERIFIED_EXCERPT",relation:"SUPPORTS",excerpt:"Real excerpt"},
    ],
  },
} as unknown as MasterRuntimeSnapshotV1;
const original="## How credit monitoring works\n\n"+
  claim+"\n\nThe alerts are not a promise that harm cannot happen.\n\n"+
  "## Credit monitoring limitations\n\n"+
  "A credit report is not protected from all identity theft.";
describe("exact existing article signed citation draft",()=>{
  it("adds only an already owned VERIFED_EXCERPT source for an exact persisted claim",()=>{
    const r=draftExistingArticleSignedCitationsV1({
      bodyMarkdown:original,plan,runtime,
    });
    expect(r.totalAddedCitations).toBe(1);
    expect(r.proposedBodyMarkdown).toContain(
      "[Source: Federal Trade Commission](https://consumer.ftc.gov/articles/example)");
    expect(r.proposedBodyMarkdown).not.toContain("unapproved");
    expect(r.proposedBodyMarkdown).not.toContain("127.0.0.1");
    expect(r.proposedBodyMarkdown).toContain(claim);
    expect(r.commitAllowed).toBe(false);
    expect(r.nineCriticsPerformed).toBe(false);
  });
  it("cannot authorize a source for an unassigned section, even when claim is globally verified",()=>{
    const citations=getOwnedVerifiedCitationsV1(runtime,plan,0);
    expect(citations.map(x=>x.claimId)).toEqual(["claim_good"]);
  });
  it("rejects paraphrased prose instead of pretending literal overlap proves a source",()=>{
    const paraphrase=original.replace(claim,
      "You may receive a notice when activity appears in your file.");
    const r=draftExistingArticleSignedCitationsV1({
      bodyMarkdown:paraphrase,plan,runtime,
    });
    expect(r.totalAddedCitations).toBe(0);
    expect(r.sections[0].exactClaimAnchorMissing)
      .toEqual(["claim_good"]);
  });
  it("fails closed on H2 scope drift",()=>{
    expect(()=>draftExistingArticleSignedCitationsV1({
      bodyMarkdown:original.replace(
        "## Credit monitoring limitations",
        "## General benefits"),plan,runtime,
    })).toThrow("QUALITY_REBIND_H2_SCOPE_MISMATCH");
  });
  it("never auto-appends a citation to a paragraph with unrelated existing links",()=>{
    const linked=original.replace(claim,
      claim+" See [more](https://different.example/page).");
    const r=draftExistingArticleSignedCitationsV1({
      bodyMarkdown:linked,plan,runtime,
    });
    expect(r.totalAddedCitations).toBe(0);
  });
});