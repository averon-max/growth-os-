import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";

const source =
  readFileSync(
    new URL(
      "./production-master-live-stage-planner.ts",
      import.meta.url
    ),
    "utf8"
  );

describe(
  "Stage Plan coverage ownership recovery V1",
  () => {
    it(
      "revalidates coverage ownership at every Stage Plan repair boundary",
      () => {
        expect(
          source
        ).toContain(
          "STAGE_PLAN_COVERAGE_OWNERSHIP_RECOVERY_V1"
        );

        expect(
          source
        ).toContain(
          "function inspectStagePlanCoverageOwnership"
        );

        const calls =
          source.match(
            /\.\.\.inspectStagePlanCoverageOwnership\(\s*plan\s*\),/g
          ) ?? [];

        /*
         * Three deterministic validation boundaries exist:
         *
         * 1. initial Stage Plan validation
         * 2. revalidation after local claim-owner repair
         * 3. revalidation after the ONE bounded full regeneration
         *
         * This count is NOT a model-call count.
         */
        expect(
          source
        ).toContain(
          "STAGE_PLAN_LOCAL_REQUIRED_QUESTION_CONTRACTION_V1"
        );


        expect(
          calls
        ).toHaveLength(
          4
        );
      }
    );

    it(
      "preserves exact canonical ownership and the final fail-closed gate",
      () => {
        expect(
          source
        ).toContain(
          "Every sections[].questions item must exactly equal a string from plan.questions."
        );

        expect(
          source
        ).toContain(
          "Every plan.questions item must be owned by exactly one section through sections[].questions."
        );

        expect(
          source
        ).toContain(
          "LIVE_STAGE_PLAN_SECTION_UNKNOWN_QUESTION"
        );

        expect(
          source
        ).toContain(
          "!knownQuestions.has("
        );

        expect(
          source
        ).not.toContain(
          "plan.questions ="
        );
      }
    );

    it(
      "keeps exactly one Stage Plan AI regeneration",
      () => {
        const retries =
          source.match(
            /STAGE_PLAN_COMPLETENESS_RETRY_V4:/g
          ) ?? [];

        expect(
          retries
        ).toHaveLength(
          1
        );

        expect(
          source
        ).toContain(
          "Regenerate the ENTIRE Stage Plan JSON object from scratch."
        );
      }
    );
  }
);
