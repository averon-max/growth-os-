import {
  describe,
  expect,
  it,
} from "vitest";

import {
  buildMasterArticleSemanticCriticBudgetV1,
  serializeMasterArticleSemanticCriticBudgetV1,
} from "./master-article-semantic-critic-budget";


describe(
  "Master Article Semantic Critic Budget V1",
  () => {
    it(
      "keeps final reader-facing article and critic context",
      () => {
        const result =
          buildMasterArticleSemanticCriticBudgetV1({
            contract: {
              mission: {
                readerGoal:
                  "Understand credit monitoring",
              },

              searchBlueprint: {
                primaryQuery:
                  "what is credit monitoring",

                intent:
                  "INFORMATIONAL",
              },

              sectionBlueprints: [
                {
                  blueprint: {
                    heading:
                      "How credit monitoring works",

                    mission:
                      "Explain monitoring.",

                    queryNodeIds: [
                      "q1",
                    ],
                  },
                },
              ],

              hugeUnusedGraph:
                "x".repeat(
                  50000
                ),
            },

            run: {
              article: {
                title:
                  "Credit Monitoring Guide",

                metaDescription:
                  "Guide",

                h1:
                  "What Is Credit Monitoring?",

                bodyMarkdown:
                  "## How credit monitoring works\\nUseful article text.",
              },

              provenance: {
                sectionCount:
                  1,
              },

              hugeUnusedRunData:
                "y".repeat(
                  50000
                ),
            },

            context: {
              originalityReferences: [
                {
                  id:
                    "serp-1",

                  label:
                    "Competitor",

                  text:
                    "Observed competitor material.",
                },
              ],

              cannibalizationCandidates:
                [],
            },
          });

        const serialized =
          JSON.stringify(
            result
          );

        expect(
          serialized
        ).toContain(
          "Useful article text."
        );

        expect(
          serialized
        ).toContain(
          "what is credit monitoring"
        );

        expect(
          serialized
        ).toContain(
          "Observed competitor material."
        );

        expect(
          serialized
        ).not.toContain(
          "x".repeat(
            100
          )
        );

        expect(
          serialized
        ).not.toContain(
          "y".repeat(
            100
          )
        );
      }
    );


    it(
      "serializes as minified provider context",
      () => {
        const result =
          serializeMasterArticleSemanticCriticBudgetV1({
            contract:
              {},

            run: {
              article: {
                bodyMarkdown:
                  "Article",
              },
            },

            context: {
              originalityReferences:
                [],

              cannibalizationCandidates:
                [],
            },
          });

        expect(
          result
        ).toContain(
          "MASTER_ARTICLE_SEMANTIC_CRITIC_BUDGET_V1"
        );

        expect(
          result
        ).not.toContain(
          '\n  "'
        );
      }
    );
  }
);
