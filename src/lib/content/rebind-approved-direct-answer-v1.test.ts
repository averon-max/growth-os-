import { describe, it, expect } from "vitest";
import { rebindApprovedDirectAnswerV1 } from "./rebind-approved-direct-answer-v1";

const input = {
  oldClaimId: "claim-score-inquiry",
  newClaimId: "claim-monitoring-score-direct-answer-v1",
  newEvidenceId: "evidence-score-impact-experian-reviewed-v1",
  oldClaimEvidenceIds: ["old-score-evidence"],
};
describe("verified direct answer ownership rebinding", () => {
  it("supports a contracted plan without the original blueprint claim", () => {
    const x = rebindApprovedDirectAnswerV1({
      ...input,
      planClaimIds: ["verified-other-claim"],
      blueprintClaimIds: ["claim-score-inquiry", "verified-other-claim"],
      planEvidenceIds: ["other-evidence"],
      blueprintEvidenceIds: ["old-score-evidence", "other-evidence"],
    });
    expect(x.planClaimIds).toEqual(["verified-other-claim", input.newClaimId]);
    expect(x.blueprintClaimIds).toEqual(["verified-other-claim", input.newClaimId]);
    expect(x.planEvidenceIds).toEqual(["other-evidence", input.newEvidenceId]);
    expect(x.blueprintEvidenceIds).toEqual(["other-evidence", input.newEvidenceId]);
  });
  it("replaces a legacy claim present in both plan and blueprint", () => {
    const x = rebindApprovedDirectAnswerV1({
      ...input,
      planClaimIds: [input.oldClaimId],
      blueprintClaimIds: [input.oldClaimId],
      planEvidenceIds: ["old-score-evidence"],
      blueprintEvidenceIds: ["old-score-evidence"],
    });
    expect(x.planClaimIds).toEqual([input.newClaimId]);
    expect(x.blueprintClaimIds).toEqual([input.newClaimId]);
    expect(x.planEvidenceIds).toEqual([input.newEvidenceId]);
  });
  it("fails closed when the legacy claim is not owned by either representation", () => {
    expect(() => rebindApprovedDirectAnswerV1({
      ...input,
      planClaimIds: ["unrelated"],
      blueprintClaimIds: ["unrelated"],
      planEvidenceIds: [],
      blueprintEvidenceIds: [],
    })).toThrow("DIRECT_ANSWER_REBIND_OWNER_INVALID");
  });
  it("preserves all unrelated evidence and required claims", () => {
    const x = rebindApprovedDirectAnswerV1({
      ...input,
      planClaimIds: ["first", input.oldClaimId, "second"],
      blueprintClaimIds: ["first", input.oldClaimId, "second"],
      planEvidenceIds: ["one", "old-score-evidence", "two"],
      blueprintEvidenceIds: ["one", "old-score-evidence", "two"],
    });
    expect(x.planClaimIds).toEqual(["first","second",input.newClaimId]);
    expect(x.planEvidenceIds).toEqual(["one","two",input.newEvidenceId]);
  });
});
