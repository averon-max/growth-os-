import {
  describe,
  expect,
  it,
} from "vitest";

import {
  inspectStagePlanDistinctInformationJobsV1,
  inspectStagePlanQuestionIntentBoundaryV1,
} from "./stage-plan-quality-gates-v1";


describe(
  "Stage Plan quality gates V1",
  () => {
    it(
      "does not let the model self-authorize a commercial best-query as informational",
      () => {
        const issues =
          inspectStagePlanQuestionIntentBoundaryV1({
            pageIntent:
              "INFORMATIONAL",

            queries: [
              {
                query:
                  "best credit monitoring service",

                /*
                 * Intentionally incorrect model declaration.
                 */
                intent:
                  "INFORMATIONAL",
              },
            ],

            questions: [
              "best credit monitoring service",
            ],
          });


        expect(
          issues
        ).toHaveLength(
          1
        );

        expect(
          issues[0]
        ).toMatch(
          /^questions\[\]\.deterministic-cross-intent:best credit monitoring service:(?:COMMERCIAL|TRANSACTIONAL):INFORMATIONAL$/
        );
      }
    );


    it(
      "accepts distinct information jobs",
      () => {
        expect(
          inspectStagePlanDistinctInformationJobsV1({
            sections: [
              {
                heading:
                  "What Credit Monitoring Is",

                mission:
                  "Define credit monitoring and establish its scope.",

                expectedOutcome:
                  "The reader understands the concept.",

                topics: [
                  "Definition of credit monitoring",
                ],

                questions: [
                  "what is credit monitoring",
                ],
              },

              {
                heading:
                  "How Credit Monitoring Works",

                mission:
                  "Explain how report changes are detected and communicated.",

                expectedOutcome:
                  "The reader understands the process.",

                topics: [
                  "How credit monitoring detects changes",
                ],

                questions: [
                  "how does credit monitoring work",
                ],
              },
            ],
          })
        ).toEqual(
          []
        );
      }
    );


    it(
      "blocks two sections with the same information job",
      () => {
        const issues =
          inspectStagePlanDistinctInformationJobsV1({
            sections: [
              {
                heading:
                  "What Credit Monitoring Does",

                mission:
                  "Explain what credit monitoring can detect.",

                expectedOutcome:
                  "The reader understands monitored changes.",

                topics: [
                  "Monitoring coverage",
                ],

                questions:
                  [],
              },

              {
                heading:
                  "Credit Monitoring Coverage",

                mission:
                  "Explain what credit monitoring can detect.",

                expectedOutcome:
                  "The reader understands which changes are monitored.",

                topics: [
                  "Detection coverage",
                ],

                questions:
                  [],
              },
            ],
          });


        expect(
          issues
        ).toContain(
          "sections[].duplicate-information-job:0:1"
        );
      }
    );


    it(
      "does not confuse coverage and limitations",
      () => {
        expect(
          inspectStagePlanDistinctInformationJobsV1({
            sections: [
              {
                heading:
                  "What Credit Monitoring Covers",

                mission:
                  "Explain which report changes monitoring may surface.",

                expectedOutcome:
                  "The reader understands coverage.",

                topics: [
                  "Monitoring coverage",
                ],

                questions:
                  [],
              },

              {
                heading:
                  "What Credit Monitoring Cannot Do",

                mission:
                  "Explain limitations and what monitoring does not prevent.",

                expectedOutcome:
                  "The reader understands limitations.",

                topics: [
                  "Monitoring limitations",
                ],

                questions:
                  [],
              },
            ],
          })
        ).toEqual(
          []
        );
      }
    );
  }
);
