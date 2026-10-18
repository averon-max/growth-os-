/**
 * CANONICAL_WRITER_PREFLIGHT_V1
 *
 * The UI/service and diagnostic CLI MUST execute the SAME pre-model
 * gates in the SAME order. This is not a second writer. It delegates
 * all decisions to the existing production authority checks.
 *
 * No research, AI/model calls, DB access, retries, or data mutation.
 */
import type { ArticleExecutionPlanV1 } from "./article-execution-plan-v1";
import {
  assertArticlePreWriterEvidenceReadyV1,
  assertArticlePreWriterRequiredCoverageV1,
  assertArticlePreWriterAnswerSupportV2,
} from "./article-prewriter-evidence-gate-v1";
import { assertSectionEvidenceCapacityV1 } from "./section-evidence-capacity-v1";
import { assertPreWriterMissionAuthorityV1 } from "./article-prewriter-mission-authority-gate-v1";
import { diagnoseWriterFailureV1 } from "./writer-failure-diagnosis-v1";
import { recordWriterTraceV1 } from "./writer-trace-v1";

export type CanonicalWriterPreflightV1Input = Readonly<{
  plan: Readonly<ArticleExecutionPlanV1>;
  blueprints: Parameters<typeof assertPreWriterMissionAuthorityV1>[0]["blueprints"];
}>;

export const CANONICAL_WRITER_PREFLIGHT_GATES_V1 = Object.freeze([
  "required_evidence",
  "required_coverage",
  "answer_support",
  "section_capacity",
  "mission_authority",
] as const);

export function assertCanonicalWriterPreflightV1(
  { plan, blueprints }: CanonicalWriterPreflightV1Input,
): void {
  const steps = [
    () => assertArticlePreWriterEvidenceReadyV1(plan),
    () => assertArticlePreWriterRequiredCoverageV1(plan),
    () => assertArticlePreWriterAnswerSupportV2(plan),
    () => assertSectionEvidenceCapacityV1(plan.sections),
    () => assertPreWriterMissionAuthorityV1({sections: plan.sections, blueprints}),
  ] as const;

  for (let index = 0; index < steps.length; index++) {
    const gate = CANONICAL_WRITER_PREFLIGHT_GATES_V1[index]!;
    recordWriterTraceV1("writer.preflight.started", {stage: gate, index});
    try {
      steps[index]!();
      recordWriterTraceV1("writer.preflight.passed", {stage: gate, index});
    } catch (error) {
      const diagnosed = diagnoseWriterFailureV1(error);
      recordWriterTraceV1("writer.preflight.blocked", {
        stage: gate,
        index,
        reasonCode: diagnosed.reasonCode,
        failureClass: diagnosed.failureClass,
        recommendedAction: diagnosed.recommendedAction,
      });
      // Preserve original error identity, semantics and source diagnostics.
      throw error;
    }
  }
}
