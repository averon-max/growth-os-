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
  "production Stage Plan page-intent authority V1",
  () => {
    it(
      "uses canonical SearchMission intent instead of model prose",
      () => {
        expect(
          source
        ).toContain(
          "STAGE_PLAN_PAGE_INTENT_AUTHORITY_V1"
        );


        expect(
          source
        ).toContain(
          '"intent": "INFORMATIONAL | COMMERCIAL | TRANSACTIONAL | NAVIGATIONAL | LOCAL"'
        );


        expect(
          (
            source.match(
              /pageIntent:\s*mission\.missionIntent/g
            ) ??
            []
          ).length
        ).toBeGreaterThanOrEqual(
          3
        );


        expect(
          (
            source.match(
              /plan\.intent\s*=\s*mission\.missionIntent/g
            ) ??
            []
          ).length
        ).toBeGreaterThanOrEqual(
          2
        );
      }
    );


    it(
      "contracts only locally proven invalid required questions",
      () => {
        expect(
          source
        ).toContain(
          "STAGE_PLAN_LOCAL_REQUIRED_QUESTION_CONTRACTION_V1"
        );


        expect(
          source
        ).toContain(
          "contractStagePlanRequiredQuestionsV1"
        );


        expect(
          source
        ).toContain(
          "POST_RETRY_REQUIRED_QUESTION_CONTRACTION_V1"
        );


        expect(
          source
        ).toContain(
          "preservedResearchQueries"
        );
      }
    );
  }
);
