import {
  describe,
  expect,
  it,
} from "vitest";

import {
  contractStagePlanRequiredQuestionsV1,
} from "./stage-plan-question-contraction-v1";


describe(
  "Stage Plan required question contraction V1",
  () => {
    it(
      "removes a deterministic cross-intent required question while preserving research elsewhere",
      () => {
        const result =
          contractStagePlanRequiredQuestionsV1({
            questions: [
              "what is credit monitoring",
              "what is credit monitoring services",
            ],

            sectionQuestions: [
              [
                "what is credit monitoring",
              ],

              [
                "what is credit monitoring services",
              ],
            ],

            issues: [
              "questions[].deterministic-cross-intent:what is credit monitoring services:TRANSACTIONAL:INFORMATIONAL",
            ],
          });


        expect(
          result.questions
        ).toEqual([
          "what is credit monitoring",
        ]);


        expect(
          result.sectionQuestions
        ).toEqual([
          [
            "what is credit monitoring",
          ],

          [],
        ]);


        expect(
          result.dropped
        ).toEqual([
          {
            question:
              "what is credit monitoring services",

            reasons: [
              "DETERMINISTIC_CROSS_INTENT",
            ],
          },
        ]);
      }
    );


    it(
      "removes an unowned required question instead of inventing an owner",
      () => {
        const result =
          contractStagePlanRequiredQuestionsV1({
            questions: [
              "what is credit monitoring",
              "what is credit monitoring on credit karma",
            ],

            sectionQuestions: [
              [
                "what is credit monitoring",
              ],
            ],

            issues: [
              "plan.questions unowned:what is credit monitoring on credit karma",
            ],
          });


        expect(
          result.questions
        ).toEqual([
          "what is credit monitoring",
        ]);


        expect(
          result.dropped[0]
        ).toEqual({
          question:
            "what is credit monitoring on credit karma",

          reasons: [
            "UNOWNED",
          ],
        });
      }
    );


    it(
      "does not silently contract a model-declared cross-intent disagreement",
      () => {
        const result =
          contractStagePlanRequiredQuestionsV1({
            questions: [
              "does credit monitoring affect credit score",
            ],

            sectionQuestions: [
              [
                "does credit monitoring affect credit score",
              ],
            ],

            issues: [
              "questions[].cross-intent:does credit monitoring affect credit score:COMMERCIAL:INFORMATIONAL",
            ],
          });


        expect(
          result.questions
        ).toEqual([
          "does credit monitoring affect credit score",
        ]);


        expect(
          result.dropped
        ).toEqual(
          []
        );
      }
    );


    it(
      "removes an unobserved invented required question",
      () => {
        const result =
          contractStagePlanRequiredQuestionsV1({
            questions: [
              "invented seo question",
            ],

            sectionQuestions: [
              [
                "invented seo question",
              ],
            ],

            issues: [
              "questions[].unobserved:invented seo question",
            ],
          });


        expect(
          result.questions
        ).toEqual(
          []
        );


        expect(
          result.dropped[0]
            ?.reasons
        ).toContain(
          "UNOBSERVED"
        );
      }
    );
  }
);
