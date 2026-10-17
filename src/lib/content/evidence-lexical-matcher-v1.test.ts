import { describe, expect, it } from "vitest";
import { canonicalEvidenceTokenV1, findVerifiedExcerptCandidateV1, negativeClaimTargetAnchorsV1 } from "./evidence-lexical-matcher-v1";

describe("extracted lexical evidence matcher", () => {
  it("preserves controlled monitoring synonyms", () => {
    expect(canonicalEvidenceTokenV1("watches")).toBe("monitor");
    expect(canonicalEvidenceTokenV1("tracks")).toBe("monitor");
    expect(canonicalEvidenceTokenV1("alerts")).toBe("alert");
  });
  it("only accepts material, matching excerpts", () => {
    const claimText = "Credit monitoring tracks changes in your credit report.";
    expect(findVerifiedExcerptCandidateV1({
      claimText,
      bodyText: "Credit monitoring tracks changes that appear in your credit report. It can help readers notice activity they may want to review.",
    })?.coverage).toBeGreaterThanOrEqual(0.7);
    expect(findVerifiedExcerptCandidateV1({
      claimText,
      bodyText: "Credit monitoring does not track changes in your credit report.",
    })).toBeNull();
  });
  it("does not weaken exact numeric evidence", () => {
    expect(findVerifiedExcerptCandidateV1({
      claimText: "The service costs $20 per month.",
      bodyText: "The service costs $10 per month.",
    })).toBeNull();
  });
  it("provides deterministic negative-claim anchors", () => {
    const claim = "Credit monitoring does not change your credit score.";
    expect(negativeClaimTargetAnchorsV1(claim)).toEqual(negativeClaimTargetAnchorsV1(claim));
    expect(negativeClaimTargetAnchorsV1(claim).length).toBeGreaterThan(0);
  });
});
