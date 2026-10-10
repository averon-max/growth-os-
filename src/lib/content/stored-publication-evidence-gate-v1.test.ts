import { describe, expect, it } from "vitest";
import {
  assertStoredPublicationEvidenceV1,
} from "./stored-publication-evidence-gate-v1";

const claim =
  "Using a credit-monitoring service does not itself change the information in a credit report.";

const badExcerpt =
  "Monitor your credit with Experian. Get alerts about changes and suspicious activity on your credit report. Raise your FICO Score instantly with Experian Boost. Not all payments are boost-eligible.";

const goodExcerpt =
  "Using a credit-monitoring service does not itself change the information in a credit report.";

function plan(excerpt: string) {
  return {
    masterRuntime: {
      claimLedger: {
        claims: [{
          id: "claim-score-impact",
          text: claim,
          status: "VERIFIED",
        }],
      },
      evidenceGraph: {
        sources: [{
          id: "source-experian",
          url: "https://www.experian.com/",
        }],
        claimEvidence: [{
          id: "evidence-score-impact",
          sourceId: "source-experian",
          claimId: "claim-score-impact",
          relation: "SUPPORTS",
          kind: "VERIFIED_EXCERPT",
          excerpt,
        }],
      },
    },
    articleExecutionPlan: {
      sections: [{
        id: "section-score-impact",
        state: "WRITABLE",
        requiredClaimIds: ["claim-score-impact"],
        evidenceIds: ["evidence-score-impact"],
      }],
    },
  };
}

describe("Stored publication evidence gate V1", () => {
  it("blocks stale unsupported Experian evidence", () => {
    expect(() =>
      assertStoredPublicationEvidenceV1(plan(badExcerpt))
    ).toThrow(
      "PUBLICATION_EVIDENCE_INVALID:EVIDENCE_UNSUPPORTED:evidence-score-impact"
    );
  });

  it("accepts directly supported claims", () => {
    expect(() =>
      assertStoredPublicationEvidenceV1(plan(goodExcerpt))
    ).not.toThrow();
  });

  it("fails closed without a snapshot", () => {
    expect(() =>
      assertStoredPublicationEvidenceV1(null)
    ).toThrow("PUBLICATION_EVIDENCE_INVALID:SNAPSHOT_MISSING");
  });
});
