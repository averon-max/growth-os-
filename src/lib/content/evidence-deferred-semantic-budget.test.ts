import {
  describe,
  expect,
  it,
} from "vitest";

import {
  serializeMasterArticleSemanticCriticBudgetV1,
} from "./master-article-semantic-critic-budget";


describe(
  "evidence-deferred semantic critic budget",
  () => {
    it(
      "projects deferred scope into authoritative provider input",
      () => {
        const serialized =
          serializeMasterArticleSemanticCriticBudgetV1({
            contract: {
              sectionBlueprints:
                [],
            },

            run: {
              article: {
                title:
                  "Test",

                metaDescription:
                  "Test",

                h1:
                  "Test",

                bodyMarkdown:
                  "Test",
              },
            },

            context: {
              originalityReferences:
                [],

              cannibalizationCandidates:
                [],

              evidenceDeferredSections: [
                {
                  heading:
                    "Free vs. Paid Credit Monitoring Options",

                  sourceDeferredHeading:
                    "Free credit monitoring versus paid services",

                  summary:
                    "Comparison deferred until verified evidence exists.",

                  reason:
                    "MISSING_PUBLICATION_GRADE_EVIDENCE",
                },
              ],
            },
          });


        expect(
          serialized
        ).toContain(
          '"evidenceDeferredSections"'
        );

        expect(
          serialized
        ).toContain(
          "Free vs. Paid Credit Monitoring Options"
        );

        expect(
          serialized
        ).toContain(
          "MISSING_PUBLICATION_GRADE_EVIDENCE"
        );
      }
    );
  }
);
