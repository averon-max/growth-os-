import {describe,expect,it} from "vitest";
import {verifyExistingArticleCitationScopeV1, assertReleaseArticleCitationScopeV1, ReleaseArticleCitationScopeErrorV1} from "./existing-article-citation-authority-v1";
import type {ArticleExecutionPlanV1} from "./article-execution-plan-v1";
import type {MasterRuntimeSnapshotV1} from "./master-runtime-adapter";
const plan={
  sections:[
    {state:"WRITABLE",heading:"How credit monitoring works",
      evidenceIds:["e1"],requiredClaimIds:["c1"]},
    {state:"WRITABLE",heading:"What it does not prevent",
      evidenceIds:["e2"],requiredClaimIds:["c2"]},
  ],
} as unknown as ArticleExecutionPlanV1;
const runtime={
  claimLedger:{claims:[
    {id:"c1",status:"VERIFIED",text:"Credit monitoring alerts consumers when account activity changes appear in credit records."},
    {id:"c2",status:"VERIFIED",text:"Monitoring cannot automatically prevent identity theft."},
  ]},
  evidenceGraph:{
    sources:[
      {id:"s1",url:"https://consumer.ftc.gov/source",publisher:"FTC"},
      {id:"s2",url:"https://consumerfinance.gov/source",publisher:"CFPB"},
    ],
    claimEvidence:[
      {id:"e1",claimId:"c1",sourceId:"s1",
        kind:"VERIFIED_EXCERPT",relation:"SUPPORTS",excerpt:"Verified"},
      {id:"e2",claimId:"c2",sourceId:"s2",
        kind:"VERIFIED_EXCERPT",relation:"SUPPORTS",excerpt:"Verified"},
    ],
  },
} as unknown as MasterRuntimeSnapshotV1;
const base="## How credit monitoring works\n\n"+
  "Credit monitoring alerts consumers when account activity changes appear in credit records.\n\n"+
  "## What it does not prevent\n\n"+
  "Monitoring cannot automatically prevent identity theft.";
describe("same-ID candidate citation section ownership",()=>{
  it("blocks zero visible links",()=>{
    const r=verifyExistingArticleCitationScopeV1({
      candidateBodyMarkdown:base,plan,runtime});
    expect(r.status).toBe("BLOCK_NO_VISIBLE_CITATIONS");
    expect(r.completeSectionCitationCoverage).toBe(false);
    expect(r.uncitedEvidenceSections).toHaveLength(2);
  });
  it("blocks exact globally VERIFIED URL when cited in wrong H2",()=>{
    const r=verifyExistingArticleCitationScopeV1({
      candidateBodyMarkdown:base.replace(
        "Credit monitoring alerts consumers when account activity changes appear in credit records.",
        "Credit monitoring alerts consumers when account activity changes appear in credit records. [Source](https://consumerfinance.gov/source)"),
      plan,runtime,
    });
    expect(r.status).toBe("BLOCK_WRONG_SECTION_CITATIONS");
    expect(r.unapprovedLinks).toBe(1);
  });
  it("allows only scoped verified URLs to proceed to separate semantic review",()=>{
    const r=verifyExistingArticleCitationScopeV1({
      candidateBodyMarkdown:base.replace(
        "Credit monitoring alerts consumers when account activity changes appear in credit records.",
        "Credit monitoring alerts consumers when account activity changes appear in credit records. [Source](https://consumer.ftc.gov/source)"),
      plan,runtime,
    });
    expect(r.status).toBe("REVIEW_SEMANTIC_PROOF_REQUIRED");
    expect(r.completeSectionCitationCoverage).toBe(false);
    expect(r.uncitedEvidenceSections).toMatchObject([
      {sectionIndex:1,heading:"What it does not prevent"},
    ]);
    expect(r.commitAllowed).toBe(false);
    expect(r.fullySemanticallyVerified).toBe(false);
  });
});

describe("approval and publication: section-signed sources are mandatory",()=>{
  const valid=base
    .replace("Credit monitoring alerts consumers when account activity changes appear in credit records.",
      "Credit monitoring alerts consumers when account activity changes appear in credit records. [FTC](https://consumer.ftc.gov/source)")
    .replace("Monitoring cannot automatically prevent identity theft.",
      "Monitoring cannot automatically prevent identity theft. [CFPB](https://consumerfinance.gov/source)");
  it("passes provenance check only with both section-owned VERIFIED_EXCERPT sources",()=>{
    const result=assertReleaseArticleCitationScopeV1({
      candidateBodyMarkdown:valid,plan,runtime,
    });
    expect(result.totalLinks).toBe(2);
    expect(result.unapprovedLinks).toBe(0);
    expect(result.completeSectionCitationCoverage).toBe(true);
    expect(result.fullySemanticallyVerified).toBe(false);
  });
  it("blocks an external URL absent from signed claims even with correct original sources",()=>{
    expect(()=>assertReleaseArticleCitationScopeV1({
      candidateBodyMarkdown:valid.replace(
        " [FTC](https://consumer.ftc.gov/source)",
        " [FTC](https://consumer.ftc.gov/source) [extra](https://identitytheft.gov/)"
      ),plan,runtime,
    })).toThrow(ReleaseArticleCitationScopeErrorV1);
  });
  it("blocks an otherwise verified source when moved to another H2",()=>{
    expect(()=>assertReleaseArticleCitationScopeV1({
      candidateBodyMarkdown:valid.replace(
        "[FTC](https://consumer.ftc.gov/source)",
        "[CFPB](https://consumerfinance.gov/source)"
      ),plan,runtime,
    })).toThrow("UNSIGNED_OR_WRONG_SECTION_LINKS");
  });
  it("blocks missing citations for one evidence-rich H2",()=>{
    expect(()=>assertReleaseArticleCitationScopeV1({
      candidateBodyMarkdown:valid.replace(" [CFPB](https://consumerfinance.gov/source)",""),
      plan,runtime,
    })).toThrow("EVIDENCED_H2_UNCITED");
  });
});


describe("version-bound human reviewed outbound official ACTION links",()=>{
  const candidate=base
    .replace("Credit monitoring alerts consumers when account activity changes appear in credit records.",
      "Credit monitoring alerts consumers when account activity changes appear in credit records. [FTC](https://consumer.ftc.gov/source) [Official action](https://www.annualcreditreport.com/index.action)")
    .replace("Monitoring cannot automatically prevent identity theft.",
      "Monitoring cannot automatically prevent identity theft. [CFPB](https://consumerfinance.gov/source)");
  const review={
    version:"OFFICIAL_NAVIGATION_REVIEW_V1",
    articleFingerprint:"article-fingerprint-42",
    decision:"APPROVED",
    approvedBy:"verified-editor",
    approvedAt:"2026-10-19T17:00:00.000Z",
    entries:[{url:"https://www.annualcreditreport.com/index.action",
      supportingSourceUrl:"https://consumer.ftc.gov/source",
      supportingEvidenceId:"e1",sectionIndex:0,
      purpose:"Navigate to official free credit report request website"}],
  };
  it("keeps action links blocked until explicitly reviewed",()=>{
    const pending={...review,decision:"PENDING_REVIEW"};
    expect(()=>assertReleaseArticleCitationScopeV1({
      candidateBodyMarkdown:candidate,plan,runtime,
      articleFingerprint:review.articleFingerprint,navigationReview:pending,
    })).toThrow("UNSIGNED_OR_WRONG_SECTION_LINKS");
  });
  it("approves only one exact URL in the matching H2, not any domain wildcard",()=>{
    const output=assertReleaseArticleCitationScopeV1({
      candidateBodyMarkdown:candidate,plan,runtime,
      articleFingerprint:review.articleFingerprint,navigationReview:review,
    });
    expect(output.unapprovedLinks).toBe(0);
    expect(output.completeSectionCitationCoverage).toBe(true);
    expect(output.sections[0]?.approvedNavigationLinks).toBe(1);
    expect(output.sections[0]?.evidenceCitationLinks).toBe(1);
    expect(output.fullySemanticallyVerified).toBe(false);
  });
  it("rejects stale article fingerprint",()=>{
    expect(()=>assertReleaseArticleCitationScopeV1({
      candidateBodyMarkdown:candidate,plan,runtime,
      articleFingerprint:"another-article-sha",navigationReview:review,
    })).toThrow("NAVIGATION_APPROVAL_FINGERPRINT_OR_DECISION_INVALID");
  });
  it("rejects source evidence assigned to a different H2",()=>{
    expect(()=>assertReleaseArticleCitationScopeV1({
      candidateBodyMarkdown:candidate,plan,runtime,
      articleFingerprint:review.articleFingerprint,
      navigationReview:{...review,entries:[{...review.entries[0],
        supportingEvidenceId:"e2"}]},
    })).toThrow("NAVIGATION_APPROVAL_SOURCE_NOT_SIGNED_IN_H2");
  });
  it("rejects action link when its signed authority source is not visibly linked in the same H2",()=>{
    expect(()=>assertReleaseArticleCitationScopeV1({
      candidateBodyMarkdown:candidate.replace(
        " [FTC](https://consumer.ftc.gov/source)",""),
      plan,runtime,articleFingerprint:review.articleFingerprint,
      navigationReview:review,
    })).toThrow("NAVIGATION_SUPPORTING_SOURCE_NOT_VISIBLE_IN_H2");
  });
  it("rejects unapproved extra URL even if another official destination was approved",()=>{
    expect(()=>assertReleaseArticleCitationScopeV1({
      candidateBodyMarkdown:candidate.replace(
        " [Official action](https://www.annualcreditreport.com/index.action)",
        " [Official action](https://www.annualcreditreport.com/index.action) [extra](https://unknown.example/)"),
      plan,runtime,articleFingerprint:review.articleFingerprint,
      navigationReview:review,
    })).toThrow("UNSIGNED_OR_WRONG_SECTION_LINKS");
  });
  it("action-only links cannot satisfy required source citation in a section",()=>{
    expect(()=>assertReleaseArticleCitationScopeV1({
      candidateBodyMarkdown:candidate.replace(
        " [FTC](https://consumer.ftc.gov/source)",""),
      plan,runtime,articleFingerprint:review.articleFingerprint,
      navigationReview:review,
    })).toThrow("NAVIGATION_SUPPORTING_SOURCE_NOT_VISIBLE_IN_H2");
  });
});
