import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  selectStagePlanRecoveryRouteV1,
} from "./stage-plan-recovery-route-v1";

const plannerSource = () => readFileSync(
  "src/lib/content/production-master-live-stage-planner.ts", "utf8",
);

describe("production Stage Plan recovery route integration", () => {
  it("uses the pure route for both local owner repair and the one full retry", () => {
    const source = plannerSource();
    expect(source).toContain('initialRecoveryRouteV1 === "LOCAL_CLAIM_OWNER_REPAIR"');
    expect(source).toContain('preRetryRecoveryRouteV1 === "FULL_REGENERATION"');
    expect(source).toContain("localClaimOwnerRepairAttempted: localClaimOwnerRepairAttemptedV1");
    expect(source).toContain("fullRegenerationAttempted: fullRegenerationAttemptedV1");
    expect(source).not.toContain("onlyDuplicateClaimOwnershipFailureV1");
  });

  it("retains original localized and full-replan failure reason codes", () => {
    const source = plannerSource();
    for (const code of [
      "LIVE_STAGE_PLAN_CLAIM_OWNER_CONFLICT_MISMATCH",
      "LIVE_STAGE_PLAN_CLAIM_OWNER_REPAIR_FAILED",
      "LIVE_STAGE_PLAN_CLAIM_OWNER_REPAIR_INCOMPLETE",
      "LIVE_STAGE_PLAN_AI_REPAIR_TRANSPORT_ERROR",
      "LIVE_STAGE_PLAN_INFORMATION_GAIN_UNRESOLVED",
      "LIVE_STAGE_PLAN_MODEL_OUTPUT_INCOMPLETE",
    ]) expect(source).toContain(code);
  });

  it("does not introduce additional paid model call sites", () => {
    const source = plannerSource();
    expect(source.match(/await callContentAiJson\(/g)).toHaveLength(5);
    expect(source).toContain("forceAlternateProvider:");
    expect(source).toContain("applyLocalRequiredQuestionContractionV1");
  });

  it("records exactly the pre-choice, pre-retry and terminal recovery phases", () => {
    const source = plannerSource();
    for (const phase of [
      "after_initial_question_contraction",
      "before_full_plan_retry",
      "terminal_stage_plan_boundary",
    ]) expect(source).toContain('phase: "' + phase + '"');
    expect(source.match(/recordWriterTraceV1\("stage_plan.recovery.route"/g))
      .toHaveLength(3);
  });

  it("keeps local attempts from escalating after a failed localized repair", () => {
    const issues = ["sections[].requiredClaimIds duplicate-owner:claim1"];
    expect(selectStagePlanRecoveryRouteV1({ issues }))
      .toBe("LOCAL_CLAIM_OWNER_REPAIR");
    expect(selectStagePlanRecoveryRouteV1({
      issues: ["sections[].comprehensiveReaderJobs"],
      localClaimOwnerRepairAttempted: true,
    })).toBe("STOP");
  });
  it("keeps evidence discovery bounded and records safe recovery decisions", () => {
    const source = plannerSource();
    expect(source).toContain("MAX_EVIDENCE_RECOVERY_WAVES_V1 =");
    expect(source).toContain("Math.min(MAX_EVIDENCE_RECOVERY_WAVES_V1, recoveryQuerySuffixes.length)");
    for (const suffix of [
      " official guidance",
      " consumer guidance",
      " government guidance",
      " help center",
      " facts",
    ]) expect(source).toContain(suffix);
    expect(source).toContain("unresolvedEvidenceClaims.length > 0");
    expect(source).toContain('recordWriterTraceV1("research.evidence_recovery.wave"');
    expect(source).toContain('recordWriterTraceV1("research.evidence_recovery.summary"');
    expect(source).toContain('recordWriterTraceV1("research.evidence_recovery.question_probe"');
    expect(source).toContain("querySha256: hashTraceTextV1(recoveryPrimaryQuery)");
    expect(source).not.toContain("query: recoveryPrimaryQuery,\n      unresolvedBeforeCount");
    // Refactoring the retrieval loop must not increase paid planner/repair calls.
    expect(source.match(/await callContentAiJson\(/g)).toHaveLength(5);
  });

});
