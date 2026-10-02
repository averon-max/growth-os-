import {
  readFileSync,
} from "node:fs";

import {
  describe,
  expect,
  it,
} from "vitest";

import {
  ArticleExecutionPlanErrorV1,
  buildArticleExecutionPlanV1,
} from "./article-execution-plan-v1";


describe(
  "ArticleExecutionPlan V1",
  () => {
    it(
      "builds different plans for different search missions without topic templates",
      () => {
        const canonical =
          buildArticleExecutionPlanV1({
            websiteId:
              "site-a",

            topic:
              "canonical tags",

            primaryQuery:
              "what is a canonical tag",

            intent:
              "DEFINITIONAL",

            pageType:
              "GUIDE",

            riskClass:
              "STANDARD",

            pageAction:
              "CREATE_NEW",

            requiredTopics: [
              {
                id:
                  "topic-definition",

                label:
                  "definition",

                priority:
                  "MUST",
              },

              {
                id:
                  "topic-implementation",

                label:
                  "implementation",

                priority:
                  "MUST",
              },
            ],

            requiredQuestions: [
              {
                id:
                  "question-when",

                label:
                  "when should a canonical tag be used",

                priority:
                  "MUST",
              },
            ],

            sections: [
              {
                id:
                  "section-definition",

                heading:
                  "What Is a Canonical Tag?",

                level:
                  2,

                mission:
                  "Define the concept clearly.",

                requiredTopicIds: [
                  "topic-definition",
                ],

                state:
                  "WRITABLE",
              },

              {
                id:
                  "section-use",

                heading:
                  "When to Use Canonical Tags",

                level:
                  2,

                mission:
                  "Explain appropriate use cases.",

                requiredQuestionIds: [
                  "question-when",
                ],

                state:
                  "WRITABLE",
              },

              {
                id:
                  "section-implementation",

                heading:
                  "How to Implement a Canonical Tag",

                level:
                  2,

                mission:
                  "Explain implementation.",

                requiredTopicIds: [
                  "topic-implementation",
                ],

                state:
                  "WRITABLE",
              },
            ],
          });


        const crm =
          buildArticleExecutionPlanV1({
            websiteId:
              "site-b",

            topic:
              "crm software",

            primaryQuery:
              "best crm for plumbers",

            intent:
              "COMMERCIAL_COMPARISON",

            pageType:
              "COMPARISON",

            riskClass:
              "STANDARD",

            pageAction:
              "CREATE_NEW",

            requiredTopics: [
              {
                id:
                  "topic-criteria",

                label:
                  "selection criteria",

                priority:
                  "MUST",
              },

              {
                id:
                  "topic-options",

                label:
                  "options",

                priority:
                  "MUST",
              },

              {
                id:
                  "topic-comparison",

                label:
                  "comparison",

                priority:
                  "MUST",
              },
            ],

            requiredQuestions: [
              {
                id:
                  "question-choice",

                label:
                  "which option fits which business",

                priority:
                  "MUST",
              },

              {
                id:
                  "question-cost",

                label:
                  "how pricing should be evaluated",

                priority:
                  "SHOULD",
              },
            ],

            sections: [
              {
                id:
                  "section-criteria",

                heading:
                  "What Plumbers Should Look For",

                level:
                  2,

                mission:
                  "Define decision criteria.",

                requiredTopicIds: [
                  "topic-criteria",
                ],

                state:
                  "WRITABLE",
              },

              {
                id:
                  "section-options",

                heading:
                  "CRM Options to Compare",

                level:
                  2,

                mission:
                  "Present relevant options.",

                requiredTopicIds: [
                  "topic-options",
                ],

                state:
                  "WRITABLE",
              },

              {
                id:
                  "section-comparison",

                heading:
                  "How the Options Compare",

                level:
                  2,

                mission:
                  "Compare the decision dimensions.",

                requiredTopicIds: [
                  "topic-comparison",
                ],

                state:
                  "WRITABLE",
              },

              {
                id:
                  "section-choice",

                heading:
                  "Which CRM Fits Your Business?",

                level:
                  2,

                mission:
                  "Map needs to choices.",

                requiredQuestionIds: [
                  "question-choice",
                ],

                state:
                  "WRITABLE",
              },
            ],
          });


        const howTo =
          buildArticleExecutionPlanV1({
            websiteId:
              "site-c",

            topic:
              "structured data",

            primaryQuery:
              "how to add structured data to nextjs",

            intent:
              "HOW_TO",

            pageType:
              "HOW_TO",

            riskClass:
              "STANDARD",

            pageAction:
              "CREATE_NEW",

            requiredTopics: [
              {
                id:
                  "topic-prereq",

                label:
                  "prerequisites",

                priority:
                  "MUST",
              },

              {
                id:
                  "topic-implementation",

                label:
                  "implementation",

                priority:
                  "MUST",
              },

              {
                id:
                  "topic-validation",

                label:
                  "validation",

                priority:
                  "MUST",
              },
            ],

            requiredQuestions: [],

            sections: [
              {
                id:
                  "section-prereq",

                heading:
                  "Before You Add Structured Data",

                level:
                  2,

                mission:
                  "Explain prerequisites.",

                requiredTopicIds: [
                  "topic-prereq",
                ],

                state:
                  "WRITABLE",
              },

              {
                id:
                  "section-implementation",

                heading:
                  "Add the Structured Data",

                level:
                  2,

                mission:
                  "Explain implementation.",

                requiredTopicIds: [
                  "topic-implementation",
                ],

                state:
                  "WRITABLE",
              },

              {
                id:
                  "section-validation",

                heading:
                  "Validate the Result",

                level:
                  2,

                mission:
                  "Explain validation.",

                requiredTopicIds: [
                  "topic-validation",
                ],

                state:
                  "WRITABLE",
              },
            ],
          });


        expect(
          canonical.sections.length
        ).toBe(
          3
        );

        expect(
          crm.sections.length
        ).toBe(
          4
        );

        expect(
          howTo.sections.length
        ).toBe(
          3
        );


        expect(
          crm.lengthPlan
            .preferredMax
        ).toBeGreaterThan(
          canonical.lengthPlan
            .preferredMax
        );
      }
    );


    it(
      "fails deterministically when a MUST information job has no owner",
      () => {
        expect(
          () =>
            buildArticleExecutionPlanV1({
              websiteId:
                "site",

              topic:
                "generic topic",

              primaryQuery:
                "generic query",

              intent:
                "INFORMATIONAL",

              pageType:
                "ARTICLE",

              riskClass:
                "STANDARD",

              pageAction:
                "CREATE_NEW",

              requiredTopics: [
                {
                  id:
                    "must-topic",

                  label:
                    "important topic",

                  priority:
                    "MUST",
                },
              ],

              requiredQuestions:
                [],

              sections: [
                {
                  id:
                    "section-1",

                  heading:
                    "Introduction",

                  level:
                    2,

                  mission:
                    "Introduce.",

                  state:
                    "WRITABLE",
                },
              ],
            })
        ).toThrow(
          ArticleExecutionPlanErrorV1
        );
      }
    );


    it(
      "contains no production topic-specific content rules",
      () => {
        const source =
          readFileSync(
            new URL(
              "./article-execution-plan-v1.ts",
              import.meta.url
            ),
            "utf8"
          ).toLowerCase();


        for (
          const forbidden
          of [
            "credit monitoring",
            "3-bureau",
            "3 bureau",
            "identity theft",
            "free vs paid",
          ]
        ) {
          expect(
            source.includes(
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
