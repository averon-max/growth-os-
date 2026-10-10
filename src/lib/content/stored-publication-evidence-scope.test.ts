import { describe, expect, it } from "vitest";
import { assertStoredPublicationEvidenceV1 } from "./stored-publication-evidence-gate-v1";

function snapshot() {
  return {
    masterRuntime: {
      claimLedger: {
        claims: [
          {
            id: "claim-main",
            text: "Credit monitoring tracks changes in your credit report.",
            status: "VERIFIED",
          },
          {
            id: "claim-deferred",
            text: "Credit monitoring guarantees complete identity theft prevention.",
            status: "UNSUPPORTED",
          },
        ],
      },
      evidenceGraph: {
        sources: [
          {
            id: "source-main",
            url: "https://example.org/credit-monitoring",
          },
        ],
        claimEvidence: [
          {
            id: "evidence-main",
            claimId: "claim-main",
            sourceId: "source-main",
            relation: "SUPPORTS",
            kind: "VERIFIED_EXCERPT",
            excerpt: "Credit monitoring tracks changes in your credit report.",
          },
        ],
      },
    },
    articleExecutionPlan: {
      sections: [
        {
          id: "section-main",
          state: "WRITABLE",
          requiredClaimIds: ["claim-main"],
          evidenceIds: ["evidence-main"],
        },
        {
          id: "section-optional",
          state: "DEFERRED_NO_EVIDENCE",
          requiredClaimIds: ["claim-deferred"],
          evidenceIds: [],
        },
      ],
    },
  };
}

describe("Stored publication evidence must match writable scope", () => {
  it("accepts verified writable content despite a deferred unsupported claim", () => {
    expect(() => assertStoredPublicationEvidenceV1(snapshot())).not.toThrow();
  });

  it("blocks unsupported claims if they become part of the writable scope", () => {
    const input = snapshot();
    input.articleExecutionPlan.sections[1].state = "WRITABLE";
    expect(() => assertStoredPublicationEvidenceV1(input)).toThrow(
      "PUBLICATION_EVIDENCE_INVALID:REQUIRED_CLAIM_UNSUPPORTED:claim-deferred"
    );
  });

  it("fails closed when the scoped execution plan is unavailable", () => {
    const input: { articleExecutionPlan?: unknown } & ReturnType<typeof snapshot> =
      snapshot();
    delete input.articleExecutionPlan;
    expect(() => assertStoredPublicationEvidenceV1(input)).toThrow(
      "PUBLICATION_EVIDENCE_INVALID:EXECUTION_PLAN_MISSING"
    );
  });

  it("rejects a writable claim when its evidence is not section-referenced", () => {
    const input = snapshot();
    input.articleExecutionPlan.sections[0].evidenceIds = [];
    expect(() => assertStoredPublicationEvidenceV1(input)).toThrow(
      "PUBLICATION_EVIDENCE_INVALID:REQUIRED_CLAIM_UNSUPPORTED:claim-main"
    );
  });

  it("does not promote contradictory excerpts", () => {
    const input = snapshot();
    input.masterRuntime.evidenceGraph.claimEvidence[0].excerpt =
      "Credit monitoring does not track changes in your credit report.";
    expect(() => assertStoredPublicationEvidenceV1(input)).toThrow(
      "PUBLICATION_EVIDENCE_INVALID:EVIDENCE_UNSUPPORTED:evidence-main"
    );
  });

  it("requires evidence source IDs to exist in the persisted graph", () => {
    const input = snapshot();
    input.masterRuntime.evidenceGraph.claimEvidence[0].sourceId = "missing-source";
    expect(() => assertStoredPublicationEvidenceV1(input)).toThrow(
      "PUBLICATION_EVIDENCE_INVALID:EVIDENCE_REFERENCE_INVALID:evidence-main"
    );
  });
});
