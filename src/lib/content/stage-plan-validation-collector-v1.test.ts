import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  collectStagePlanValidationIssuesV1,
} from "./stage-plan-validation-collector-v1";
import {
  inspectStagePlanCoverageOwnership,
} from "./stage-plan-coverage-ownership-v1";
import {
  inspectStagePlanDistinctInformationJobsV1,
  inspectStagePlanQuestionIntentBoundaryV1,
} from "./stage-plan-quality-gates-v1";
import type {
  StagePlanModelOutput,
} from "./production-master-live-stage-planner";

function candidate(): StagePlanModelOutput {
  return {
    primaryQuery: "what is credit monitoring",
    pageType: "guide",
    intent: "INFORMATIONAL",
    action: "CREATE",
    queries: [{ query: "what is credit monitoring", intent: "INFORMATIONAL" }],
    topics: [{topic: "Monitoring definition"}],
    questions: ["what is credit monitoring"],
    sections: [{
      heading: "How monitoring works",
      mission: "Describe credit monitoring alerts",
      expectedOutcome: "Readers understand alert coverage",
      topics: ["Monitoring definition"],
      questions: ["what is credit monitoring"],
    }],
    claims: [],
  } as unknown as StagePlanModelOutput;
}

describe("single Stage Plan validation collector", () => {
  it("preserves exact original gate ordering and issue multiplicity", () => {
    const plan = candidate();
    const order: string[] = [];
    const inspectCompleteness = vi.fn(() => {
      order.push("completeness");
      return ["completeness:error", "same:error"];
    });
    const inspectClaimOwnership = vi.fn(() => {
      order.push("claim-ownership");
      return ["claim:error", "same:error"];
    });

    const actual = collectStagePlanValidationIssuesV1({
      plan,
      pageIntent: "INFORMATIONAL",
      inspectCompleteness,
      inspectClaimOwnership,
    });
    const expected = [
      "completeness:error", "same:error", "claim:error", "same:error",
      ...inspectStagePlanCoverageOwnership(plan),
      ...inspectStagePlanQuestionIntentBoundaryV1({
        pageIntent: "INFORMATIONAL", queries: plan.queries, questions: plan.questions,
      }),
      ...inspectStagePlanDistinctInformationJobsV1({ sections: plan.sections }),
    ];
    expect(actual).toEqual(expected);
    expect(order).toEqual(["completeness", "claim-ownership"]);
    expect(inspectCompleteness).toHaveBeenCalledWith(plan);
    expect(inspectClaimOwnership).toHaveBeenCalledWith(plan);
    expect(actual.filter(issue => issue === "same:error")).toHaveLength(2);
  });

  it("reflects mutations from a deliberate upstream repair without cached issues", () => {
    const plan = candidate();
    const inspectCompleteness = () => [] as string[];
    const inspectClaimOwnership = () => [] as string[];
    const first = collectStagePlanValidationIssuesV1({
      plan, pageIntent: "INFORMATIONAL", inspectCompleteness, inspectClaimOwnership,
    });
    plan.sections[0].topics = ["Unknown topic"];
    const second = collectStagePlanValidationIssuesV1({
      plan, pageIntent: "INFORMATIONAL", inspectCompleteness, inspectClaimOwnership,
    });
    expect(first).not.toContain("sections[].topics unknown:Unknown topic");
    expect(second).toContain("sections[].topics unknown:Unknown topic");
    expect(second).toContain("plan.topics unowned:Monitoring definition");
  });

  it("does not mutate the candidate plan", () => {
    const plan = candidate();
    const before = JSON.stringify(plan);
    collectStagePlanValidationIssuesV1({
      plan, pageIntent: "INFORMATIONAL",
      inspectCompleteness: () => [],
      inspectClaimOwnership: () => [],
    });
    expect(JSON.stringify(plan)).toBe(before);
  });

  it("does not swallow completeness inspector errors", () => {
    expect(() => collectStagePlanValidationIssuesV1({
      plan: candidate(),
      pageIntent: "INFORMATIONAL",
      inspectCompleteness: () => { throw new TypeError("invalid contract"); },
      inspectClaimOwnership: () => [],
    })).toThrow("invalid contract");
  });

  it("keeps four planner stage decisions and their explicit trace phases", () => {
    const source = readFileSync(
      "src/lib/content/production-master-live-stage-planner.ts", "utf8",
    );
    expect(source.match(/inspectCurrentStagePlanV1\(/g)).toHaveLength(4);
    for (const phase of [
      "initial_model_output",
      "after_local_claim_owner_repair",
      "after_full_plan_retry",
    ]) {
      expect(source).toContain('inspectCurrentStagePlanV1("' + phase + '")');
    }
    expect(source).toContain("inspectCurrentStagePlanV1(validationPhase)");
    expect(source).toContain(
      'applyLocalRequiredQuestionContractionV1("after_required_question_contraction")',
    );
    expect(source).toContain(
      'applyLocalRequiredQuestionContractionV1("after_post_retry_question_contraction")',
    );
    expect(source).toContain('recordWriterTraceV1("stage_plan.validation"');
  });
});
