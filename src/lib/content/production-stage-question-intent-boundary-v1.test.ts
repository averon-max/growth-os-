import {
  describe,
  expect,
  it,
} from "vitest";

import {
  inspectStagePlanQuestionIntentBoundaryV1,
} from "./stage-plan-quality-gates-v1";


describe(
  "production Stage Plan question intent boundary V1",
  () => {
    it(
      "allows observed same-intent informational questions",
      () => {
        const issues =
          inspectStagePlanQuestionIntentBoundaryV1({
            pageIntent:
              "INFORMATIONAL",

            queries: [
              {
                query:
                  "what is credit monitoring",

                intent:
                  "INFORMATIONAL",
              },

              {
                query:
                  "how does credit monitoring work",

                intent:
                  "INFORMATIONAL",
              },
            ],

            questions: [
              "what is credit monitoring",
              "how does credit monitoring work",
            ],
          });


        expect(
          issues
        ).toEqual(
          []
        );
      }
    );


    it(
      "rejects commercial PAA from an informational page mission",
      () => {
        const issues =
          inspectStagePlanQuestionIntentBoundaryV1({
            pageIntent:
              "INFORMATIONAL",

            queries: [
              {
                query:
                  "what is credit monitoring",

                intent:
                  "INFORMATIONAL",
              },

              {
                query:
                  "what is the best credit monitoring service",

                intent:
                  "COMMERCIAL",
              },

              {
                query:
                  "is credit monitoring worth paying for",

                intent:
                  "COMMERCIAL",
              },
            ],

            questions: [
              "what is credit monitoring",
              "what is the best credit monitoring service",
              "is credit monitoring worth paying for",
            ],
          });


        expect(
          issues
        ).toEqual([
          "questions[].cross-intent:what is the best credit monitoring service:COMMERCIAL:INFORMATIONAL",
          "questions[].cross-intent:is credit monitoring worth paying for:COMMERCIAL:INFORMATIONAL",
        ]);
      }
    );


    it(
      "rejects a question that has no observed query identity",
      () => {
        const issues =
          inspectStagePlanQuestionIntentBoundaryV1({
            pageIntent:
              "INFORMATIONAL",

            queries: [
              {
                query:
                  "what is credit monitoring",

                intent:
                  "INFORMATIONAL",
              },
            ],

            questions: [
              "invented seo question",
            ],
          });


        expect(
          issues
        ).toEqual([
          "questions[].unobserved:invented seo question",
        ]);
      }
    );


    it(
      "keeps adjacent demand in queries without requiring it as article coverage",
      () => {
        const issues =
          inspectStagePlanQuestionIntentBoundaryV1({
            pageIntent:
              "INFORMATIONAL",

            queries: [
              {
                query:
                  "what is credit monitoring",

                intent:
                  "INFORMATIONAL",
              },

              {
                query:
                  "best credit monitoring services",

                intent:
                  "COMMERCIAL",
              },
            ],

            questions: [
              "what is credit monitoring",
            ],
          });


        expect(
          issues
        ).toEqual(
          []
        );
      }
    );
  }
);
