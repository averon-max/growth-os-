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
  "production QueryGraph required-question admission V1",
  () => {
    it(
      "enriches the existing production query signals instead of creating shadow queries",
      () => {
        expect(
          source
        ).toContain(
          "QUERY_BOUNDARY_EVIDENCE_ENRICHMENT_V1"
        );


        expect(
          source
        ).toContain(
          "deriveQueryBoundaryEvidenceV1"
        );


        expect(
          source
        ).toContain(
          "sameMissionEvidence:"
        );


        expect(
          source
        ).toContain(
          "research\n                  .serpSnapshot\n                  .results"
        );
      }
    );


    it(
      "uses canonical QueryGraph for required-question admission",
      () => {
        expect(
          source
        ).toContain(
          "QUERYGRAPH_REQUIRED_QUESTION_ADMISSION_PREVIEW_V1"
        );


        expect(
          source
        ).toContain(
          "deriveQueryGraphRequiredQuestionAdmissionV1"
        );


        expect(
          source
        ).toContain(
          "mandatoryQuestionLabelsV1"
        );
      }
    );


    it(
      "keeps non-admitted questions out of ArticleExecutionPlan and section obligations",
      () => {
        expect(
          source
        ).toContain(
          "QUERYGRAPH_SECTION_QUESTION_SCOPE_V1"
        );


        expect(
          source
        ).toContain(
          "QUERYGRAPH_EXECUTION_REQUIRED_QUESTIONS_V1"
        );
      }
    );


    it(
      "guards assembled production QueryGraph inputs from drift",
      () => {
        expect(
          source
        ).toContain(
          "QUERYGRAPH_QUESTION_INPUT_DRIFT_GUARD_V1"
        );


        expect(
          source
        ).toContain(
          "LIVE_STAGE_PLAN_QUERYGRAPH_QUESTION_INPUT_DRIFT"
        );
      }
    );
  }
);
