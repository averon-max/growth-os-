import { describe, expect, it } from "vitest";
import {
  selectStagePlanRecoveryRouteV1,
  DUPLICATE_STAGE_PLAN_CLAIM_OWNER_PREFIX_V1,
} from "./stage-plan-recovery-route-v1";

const duplicate = DUPLICATE_STAGE_PLAN_CLAIM_OWNER_PREFIX_V1 + "claim-1";

describe("Stage Plan recovery route — fail-closed contract", () => {
  it("accepts exactly zero issues, even after a prior retry slot is consumed", () => {
    expect(selectStagePlanRecoveryRouteV1({ issues: [] })).toBe("ACCEPT");
    expect(selectStagePlanRecoveryRouteV1({
      issues: [], fullRegenerationAttempted: true,
    })).toBe("ACCEPT");
    expect(selectStagePlanRecoveryRouteV1({
      issues: [], localClaimOwnerRepairAttempted: true,
    })).toBe("ACCEPT");
  });

  it("routes exclusively duplicate claim-owner issues to bounded local repair", () => {
    expect(selectStagePlanRecoveryRouteV1({ issues: [duplicate] }))
      .toBe("LOCAL_CLAIM_OWNER_REPAIR");
    expect(selectStagePlanRecoveryRouteV1({
      issues: [duplicate, DUPLICATE_STAGE_PLAN_CLAIM_OWNER_PREFIX_V1 + "claim-2"],
    })).toBe("LOCAL_CLAIM_OWNER_REPAIR");
  });

  it("uses one full regeneration for any non-local or mixed failures", () => {
    for (const issues of [
      ["sections[].comprehensiveReaderJobs"],
      ["sections[].informationGainClaimBreadth"],
      ["sections[].requiredClaimIds unknown:claim-1"],
      ["plan.topics unowned:Monitoring"],
      [duplicate, "sections[].comprehensiveReaderJobs"],
      ["sections[].requiredClaimIds duplicate-owner"],
    ]) expect(selectStagePlanRecoveryRouteV1({issues}))
      .toBe("FULL_REGENERATION");
  });

  it("never permits full regeneration after an attempted localized AI repair", () => {
    for (const issues of [
      [duplicate], ["plan.questions unowned:why"], [duplicate, "other"],
    ]) {
      expect(selectStagePlanRecoveryRouteV1({
        issues, localClaimOwnerRepairAttempted: true,
      })).toBe("STOP");
    }
  });

  it("stops after a full replan even if remaining issues are local-only", () => {
    expect(selectStagePlanRecoveryRouteV1({
      issues: [duplicate], fullRegenerationAttempted: true,
    })).toBe("STOP");
    expect(selectStagePlanRecoveryRouteV1({
      issues: ["sections[].informationGainClaimBreadth"],
      fullRegenerationAttempted: true,
    })).toBe("STOP");
  });

  it("does not mutate the original issue array or normalize error codes", () => {
    const issues = [duplicate, "  missing field  "];
    const original = issues.slice();
    const route = selectStagePlanRecoveryRouteV1({issues});
    expect(route).toBe("FULL_REGENERATION");
    expect(issues).toEqual(original);
  });
});
