import {
  describe,
  expect,
  it,
} from "vitest";

import {
  analyzeArticleAgainstPlan,
} from "./content-plan-analysis";

describe(
  "content plan coverage V2",
  () => {
    it(
      "handles framing words and pronoun variants deterministically",
      () => {
        const result =
          analyzeArticleAgainstPlan({
            title:
              "What Is Credit Monitoring?",

            metaDescription:
              "A practical guide to credit monitoring.",

            h1:
              "What Is Credit Monitoring?",

            bodyMarkdown: [
              "Credit monitoring tracks changes to your credit files and can alert you to activity.",
              "",
              "## Can Someone Check Your Credit Without You Knowing?",
              "",
              "A credit inquiry may appear on your credit report.",
            ].join(
              "\n"
            ),

            primaryKeyword:
              "what is credit monitoring",

            secondaryKeywords:
              [],

            plan: {
              confidence:
                "HIGH",

              architecture: {
                requiredTopics: [
                  "Understanding credit monitoring",
                ],

                questionsToAnswer: [
                  "Can someone check my credit without me knowing?",
                ],

                contentGaps:
                  [],
              },

              benchmark: {
                eligiblePages:
                  5,

                observedMedianWordCount:
                  1800,

                observedMedianH2:
                  5,

                observedMedianH3:
                  3,
              },
            },
          });

        expect(
          result.topics.covered
        ).toBe(
          1
        );

        expect(
          result.questions.covered
        ).toBe(
          1
        );

        expect(
          result.warnings.some(
            (warning) =>
              warning.startsWith(
                "REQUIRED_TOPIC_NOT_LEXICALLY_COVERED:"
              )
          )
        ).toBe(
          false
        );

        expect(
          result.warnings.some(
            (warning) =>
              warning.startsWith(
                "PLANNED_QUESTION_NOT_LEXICALLY_COVERED:"
              )
          )
        ).toBe(
          false
        );
      }
    );
  }
);
