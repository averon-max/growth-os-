import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";


function source(
  relative:
    string
): string {
  return readFileSync(
    new URL(
      relative,
      import.meta.url
    ),
    "utf8"
  );
}


describe(
  "Content V1 guidance boundaries V2",
  () => {
    it(
      "keeps article length as warning-level guidance",
      () => {
        const readiness =
          source(
            "./final-article-readiness-v1.ts"
          );

        expect(
          readiness
        ).toContain(
          "ARTICLE_LENGTH_GUIDANCE_STRUCTURE_HARD_GATES_V2"
        );

        for (
          const code
          of [
            "FINAL_READINESS_LENGTH_DEFICIT",
            "FINAL_READINESS_LENGTH_EXCESS",
          ]
        ) {
          const marker =
            readiness.indexOf(
              code
            );

          expect(
            marker
          ).toBeGreaterThan(
            0
          );

          const local =
            readiness.slice(
              Math.max(
                0,
                marker - 220
              ),
              marker + 220
            );

          expect(
            local
          ).toContain(
            "warnings.push"
          );

          expect(
            local
          ).not.toContain(
            "blockers.push"
          );
        }
      }
    );


    it(
      "keeps execution-plan heading structure hard",
      () => {
        const readiness =
          source(
            "./final-article-readiness-v1.ts"
          );

        expect(
          readiness
        ).toContain(
          "FINAL_READINESS_H2_BELOW_PLAN"
        );

        expect(
          readiness
        ).toContain(
          "FINAL_READINESS_H3_BELOW_PLAN"
        );

        expect(
          readiness
        ).toContain(
          "FINAL_READINESS_DUPLICATE_NORMALIZED_HEADING"
        );
      }
    );


    it(
      "does not convert template H2 planning range into Stage Plan failure",
      () => {
        const planner =
          source(
            "./production-master-live-stage-planner.ts"
          );

        expect(
          planner
        ).toContain(
          "TEMPLATE_H2_PLANNING_GUIDANCE_ONLY_V2"
        );

        expect(
          planner
        ).not.toContain(
          "TEMPLATE_H2_PLANNING_MINIMUM_RECOVERY_V1"
        );

        const marker =
          planner.indexOf(
            "TEMPLATE_H2_PLANNING_GUIDANCE_ONLY_V2"
          );

        const local =
          planner.slice(
            marker,
            marker + 1900
          );

        expect(
          local
        ).toContain(
          "template H2 planning guidance"
        );

        expect(
          local
        ).not.toContain(
          "missing.push("
        );
      }
    );


    it(
      "keeps Writer targetWords explicitly soft",
      () => {
        const writerPrompt =
          source(
            "./master-section-prompt.ts"
          );

        expect(
          writerPrompt
        ).toContain(
          "targetWords is a SOFT editorial depth budget"
        );

        expect(
          writerPrompt
        ).toContain(
          "Never pad"
        );
      }
    );


    it(
      "keeps finite budget ceilings as runaway protection",
      () => {
        const budget =
          source(
            "./content-run-budget-v1.ts"
          );

        expect(
          budget
        ).toContain(
          "32 calls is a runaway safety ceiling"
        );

        expect(
          budget
        ).toContain(
          "operational cost/safety guard"
        );

        expect(
          budget
        ).toContain(
          "maxEstimatedInputTokens:"
        );

        expect(
          budget
        ).toContain(
          "140_000"
        );

        expect(
          budget
        ).toContain(
          "maxRepairCalls:"
        );
      }
    );
  }
);
