/**
 * Single ordering contract for deterministic Stage Plan acceptance checks.
 *
 * The original planner repeated this exact five-check chain four times:
 * initial model output, local question contraction, local claim-owner repair,
 * and full bounded replan. This module does not repair or mutate the plan.
 */
import type { StagePlanModelOutput } from "./production-master-live-stage-planner";
import {
  inspectStagePlanCoverageOwnership,
} from "./stage-plan-coverage-ownership-v1";
import {
  inspectStagePlanDistinctInformationJobsV1,
  inspectStagePlanQuestionIntentBoundaryV1,
} from "./stage-plan-quality-gates-v1";

export function collectStagePlanValidationIssuesV1({
  plan,
  pageIntent,
  inspectCompleteness,
  inspectClaimOwnership,
}: {
  plan: StagePlanModelOutput;
  pageIntent: string;
  inspectCompleteness: (candidate: StagePlanModelOutput) => string[];
  inspectClaimOwnership: (candidate: StagePlanModelOutput) => string[];
}): string[] {
  return [
    ...inspectCompleteness(plan),
    ...inspectClaimOwnership(plan),
    ...inspectStagePlanCoverageOwnership(plan),
    ...inspectStagePlanQuestionIntentBoundaryV1({
      pageIntent,
      queries: plan.queries,
      questions: plan.questions,
    }),
    ...inspectStagePlanDistinctInformationJobsV1({
      sections: plan.sections,
    }),
  ];
}
