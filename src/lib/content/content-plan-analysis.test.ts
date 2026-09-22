import {
  describe,
  expect,
  it,
} from "vitest";

import {
  analyzeArticleAgainstPlan,
} from "./content-plan-analysis";

describe(
  "content plan analysis",
  () => {
    it(
      "measures article structure and evidence-plan coverage without converting competitor medians into targets",
      () => {
        const result =
          analyzeArticleAgainstPlan({
            title:
              "Identity Theft Protection Guide",

            h1:
              "Identity Theft Protection Guide",

            bodyMarkdown: `
Identity theft protection can combine several monitoring signals.

## Credit monitoring

Credit monitoring can surface important changes.

## Dark web monitoring

Dark web monitoring can identify exposed credentials.

## What should you monitor?

Review alerts and account changes.
`,

            primaryKeyword:
              "identity theft protection",

            secondaryKeywords: [
              "credit monitoring",
              "dark web monitoring",
            ],

            plan: {
              confidence:
                "HIGH",

              architecture: {
                requiredTopics: [
                  "credit monitoring",
                  "dark web monitoring",
                ],

                questionsToAnswer: [
                  "what should you monitor",
                ],

                contentGaps: [
                  "account takeover",
                ],

                headingPolicy: {
                  h1:
                    1,

                  h2:
                    "AS_NEEDED",

                  h3:
                    "ONLY_WHEN_NEEDED",

                  maxDepth:
                    3,
                },
              },

              benchmark: {
                eligiblePages:
                  6,

                observedMedianWordCount:
                  2400,

                observedMedianH2:
                  9,

                observedMedianH3:
                  7,
              },
            },
          });

        expect(
          result.planAvailable
        ).toBe(true);

        expect(
          result.confidence
        ).toBe("HIGH");

        expect(
          result.article
            .structure
            .totalH1
        ).toBe(1);

        expect(
          result.article
            .structure
            .h2
        ).toBe(3);

        expect(
          result.topics.covered
        ).toBe(2);

        expect(
          result.questions
            .covered
        ).toBe(1);

        /*
         * Competitor data stays observational.
         * The analyzer does not manufacture
         * numeric SEO targets from it.
         */
        expect(
          result.article
            .targetAlignment
            .wordCount.state
        ).toBe(
          "NO_TARGET"
        );

        expect(
          result.article
            .targetAlignment
            .h2.state
        ).toBe(
          "NO_TARGET"
        );

        expect(
          result.article
            .targetAlignment
            .h3.state
        ).toBe(
          "NO_TARGET"
        );

        expect(
          result
            .benchmarkObservation
            .observedMedianWordCount
        ).toBe(2400);
      }
    );

    it(
      "surfaces missing plan concepts as explainable warnings instead of a fake score",
      () => {
        const result =
          analyzeArticleAgainstPlan({
            title:
              "Credit Monitoring",

            h1:
              "Credit Monitoring",

            bodyMarkdown: `
## How it works

Credit monitoring tracks selected credit-file changes.
`,

            primaryKeyword:
              "credit monitoring",

            secondaryKeywords: [
              "dark web monitoring",
            ],

            plan: {
              confidence:
                "MEDIUM",

              architecture: {
                requiredTopics: [
                  "credit monitoring",
                  "dark web monitoring",
                ],

                questionsToAnswer: [
                  "what is identity monitoring",
                ],

                contentGaps:
                  [],
              },

              benchmark:
                {},
            },
          });

        expect(
          result.topics.total
        ).toBe(2);

        expect(
          result.topics.covered
        ).toBe(1);

        expect(
          result.topics.missing
        ).toBe(1);

        expect(
          result.warnings.some(
            (warning) =>
              warning.includes(
                "dark web monitoring"
              )
          )
        ).toBe(true);

        expect(
          result.warnings.some(
            (warning) =>
              warning.includes(
                "what is identity monitoring"
              )
          )
        ).toBe(true);
      }
    );

    it(
      "works safely when an old evidence snapshot has no compatible plan",
      () => {
        const result =
          analyzeArticleAgainstPlan({
            title:
              "SEO Guide",

            h1:
              "SEO Guide",

            bodyMarkdown:
              "## Overview\nSEO guide body.",

            primaryKeyword:
              "SEO guide",

            plan:
              null,
          });

        expect(
          result.planAvailable
        ).toBe(false);

        expect(
          result.topics.total
        ).toBe(0);

        expect(
          result.questions.total
        ).toBe(0);

        expect(
          result.article
            .structure
            .totalH1
        ).toBe(1);
      }
    );
  }
);
