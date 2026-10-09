import {
  describe,
  expect,
  it,
} from "vitest";

import {
  createMasterArticleCriticFindingV1,
} from "./master-article-critic";

import {
  classifyMasterArticleCriticFindingRepairabilityV1,
} from "./master-article-critic-repair-plan";


const CODE =
  "MISSING_REQUIRED_TOPIC_CREDIT_SCORE_RELATIONSHIP";


describe(
  "missing required topic: article-scoped vs section-anchored",
  () => {
    it(
      "article-scoped BLOCK with repairScope NONE is not section-repairable (original failure)",
      () => {
        const finding =
          createMasterArticleCriticFindingV1({
            criticId:
              "INTENT",

            code:
              CODE,

            severity:
              "BLOCK",

            location: {
              scope:
                "ARTICLE",
            },

            message:
              "The relationship between credit monitoring and credit scores is not explained.",

            recommendation:
              "Explain how monitoring relates to credit scores.",

            repairScope:
              "NONE",
          });

        const result =
          classifyMasterArticleCriticFindingRepairabilityV1(
            finding
          );

        expect(
          result.repairability
        ).toBe(
          "NO_REPAIR_REQUESTED"
        );
      }
    );


    it(
      "the same finding anchored to an exact section enters targeted repair",
      () => {
        const finding =
          createMasterArticleCriticFindingV1({
            criticId:
              "INTENT",

            code:
              CODE,

            severity:
              "BLOCK",

            location: {
              scope:
                "SECTION",

              sectionIndex:
                1,

              sectionNumber:
                2,

              heading:
                "What Monitoring Cannot Do",
            },

            message:
              "This section must explain how monitoring relates to credit scores.",

            recommendation:
              "Add the relationship between monitoring and credit scores.",

            repairScope:
              "SECTION",
          });

        const result =
          classifyMasterArticleCriticFindingRepairabilityV1(
            finding
          );

        expect(
          result.repairability
        ).toBe(
          "REPAIRABLE_SECTION"
        );
      }
    );


    it(
      "a SECTION repairScope on an ARTICLE location is rejected, never silently relocated",
      () => {
        expect(
          () =>
            createMasterArticleCriticFindingV1({
              criticId:
                "INTENT",

              code:
                CODE,

              severity:
                "BLOCK",

              location: {
                scope:
                  "ARTICLE",
              },

              message:
                "Topic missing.",

              recommendation:
                "Add topic.",

              repairScope:
                "SECTION",
            })
        ).toThrow(
          "MASTER_CRITIC_SECTION_REPAIR_REQUIRES_SECTION_LOCATION"
        );
      }
    );
  }
);
