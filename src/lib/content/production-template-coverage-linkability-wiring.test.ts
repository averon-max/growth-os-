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
    "src/lib/content/production-master-live-stage-planner.ts",
    "utf8"
  );


describe(
  "Production template coverage + linkability wiring",
  () => {
    it(
      "requires semantic roles from Stage Plan",
      () => {
        expect(
          planner
        ).toContain(
          "roles:"
        );

        expect(
          planner
        ).toContain(
          "ArticleSectionRoleV1[]"
        );

        expect(
          planner
        ).toContain(
          "LIVE_STAGE_PLAN_SECTION_ROLES_REQUIRED"
        );
      }
    );


    it(
      "runs deterministic template coverage before ArticleExecutionPlan",
      () => {
        expect(
          planner
        ).toContain(
          "TEMPLATE_COVERAGE_PRODUCTION_GATE_V1"
        );

        expect(
          planner
        ).toContain(
          "assertTemplateCoverageV1({"
        );

        expect(
          planner
        ).toContain(
          "buildArticleExecutionPlanV1({"
        );

        expect(
          planner.indexOf(
            "assertTemplateCoverageV1({"
          )
        ).toBeLessThan(
          planner.indexOf(
            "buildArticleExecutionPlanV1({"
          )
        );
      }
    );


    it(
      "reuses existing original value and gates linkability",
      () => {
        expect(
          planner
        ).toContain(
          "planProductionOriginalValue({"
        );

        expect(
          planner
        ).toContain(
          "PRODUCTION_TEMPLATE_EVIDENCE_AND_LINKABILITY_GATE_V1"
        );

        expect(
          planner
        ).toContain(
          "assertProductionTemplateEvidenceGateV1({"
        );

        expect(
          planner
        ).not.toContain(
          "OriginalValuePlanV2"
        );
      }
    );
  }
);
