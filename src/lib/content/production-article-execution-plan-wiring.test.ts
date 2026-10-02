import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";


const planner =
  readFileSync(
    new URL(
      "./production-master-live-stage-planner.ts",
      import.meta.url
    ),
    "utf8"
  );


const service =
  readFileSync(
    new URL(
      "./service.ts",
      import.meta.url
    ),
    "utf8"
  );


describe(
  "production ArticleExecutionPlan wiring",
  () => {
    it(
      "requires explicit topic and question ownership before Master Runtime",
      () => {
        expect(
          planner
        ).toContain(
          "REQUIRED_COVERAGE_OWNERSHIP_V1"
        );

        expect(
          planner
        ).toContain(
          "LIVE_STAGE_PLAN_REQUIRED_TOPIC_UNOWNED"
        );

        expect(
          planner
        ).toContain(
          "LIVE_STAGE_PLAN_REQUIRED_QUESTION_UNOWNED"
        );

        expect(
          planner
        ).toContain(
          "LIVE_STAGE_PLAN_REQUIRED_TOPIC_MULTIPLE_OWNERS"
        );

        expect(
          planner
        ).toContain(
          "LIVE_STAGE_PLAN_REQUIRED_QUESTION_MULTIPLE_OWNERS"
        );
      }
    );


    it(
      "builds execution plan from the same live Stage Plan and verified evidence",
      () => {
        expect(
          planner
        ).toContain(
          "LIVE_ARTICLE_EXECUTION_PLAN_V1"
        );

        expect(
          planner
        ).toContain(
          "buildArticleExecutionPlanV1({"
        );

        expect(
          planner
        ).toContain(
          "sectionEvidenceAssignments"
        );

        expect(
          planner
        ).toContain(
          "verifiedEvidenceIds"
        );

        expect(
          planner
        ).toContain(
          "DEFERRED_NO_EVIDENCE"
        );
      }
    );


    it(
      "persists execution plan beside Master Runtime",
      () => {
        expect(
          service
        ).toContain(
          "PERSIST_ARTICLE_EXECUTION_PLAN_V1"
        );

        expect(
          service
        ).toContain(
          "articleExecutionPlan:"
        );

        expect(
          service
        ).toContain(
          "liveMaster"
        );
      }
    );


    it(
      "contains no credit-monitoring-specific planner logic",
      () => {
        const production =
          [
            planner,
            readFileSync(
              new URL(
                "./article-execution-plan-v1.ts",
                import.meta.url
              ),
              "utf8"
            ),
          ]
            .join(
              "\n"
            )
            .toLowerCase();


        for (
          const forbidden
          of [
            "credit monitoring",
            "3-bureau",
            "3 bureau credit",
            "free vs paid credit",
          ]
        ) {
          expect(
            production.includes(
              forbidden
            )
          ).toBe(
            false
          );
        }
      }
    );
  }
);
