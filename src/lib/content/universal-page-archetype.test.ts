import {
  describe,
  expect,
  it,
} from "vitest";

import {
  resolveUniversalPageArchetypeV2,
} from "./universal-page-archetype";


describe(
  "Universal Page Archetype V2",
  () => {
    it(
      "detects how-to SERPs without topic-specific rules",
      () => {
        const result =
          resolveUniversalPageArchetypeV2({
            topic:
              "how to clean a coffee maker",

            readerGoal:
              "Clean it safely step by step",

            missionIntent:
              "INFORMATIONAL",

            serpResearch: {
              results: [
                {
                  rank:
                    1,

                  pageType:
                    "GUIDE",

                  title:
                    "How to clean a coffee maker step by step",
                },

                {
                  rank:
                    2,

                  pageType:
                    "ARTICLE",

                  title:
                    "How to clean your coffee machine",
                },

                {
                  rank:
                    3,

                  pageType:
                    "GUIDE",

                  title:
                    "Coffee maker cleaning guide",
                },
              ],
            },
          });

        expect(
          result.archetype
        ).toBe(
          "HOW_TO"
        );

        expect(
          result.source
        ).toBe(
          "SERP_DOMINANT"
        );
      }
    );


    it(
      "detects commercial best-of content",
      () => {
        const result =
          resolveUniversalPageArchetypeV2({
            topic:
              "best password manager",

            readerGoal:
              "Choose the best product",

            missionIntent:
              "COMMERCIAL",

            serpResearch: {
              results: [
                {
                  rank:
                    1,

                  pageType:
                    "ARTICLE",

                  title:
                    "Best Password Managers",
                },

                {
                  rank:
                    2,

                  pageType:
                    "REVIEW",

                  title:
                    "Best Password Managers Tested",
                },

                {
                  rank:
                    3,

                  pageType:
                    "ARTICLE",

                  title:
                    "Top Password Managers",
                },
              ],
            },
          });

        expect(
          [
            "BEST_OF",
            "PRODUCT_REVIEW",
          ]
        ).toContain(
          result.archetype
        );
      }
    );


    it(
      "recognizes category SERPs",
      () => {
        const result =
          resolveUniversalPageArchetypeV2({
            topic:
              "project management software",

            readerGoal:
              "Compare software options",

            missionIntent:
              "COMMERCIAL",

            serpResearch: {
              results: [
                {
                  rank:
                    1,

                  pageType:
                    "CATEGORY",
                },

                {
                  rank:
                    2,

                  pageType:
                    "DIRECTORY",
                },

                {
                  rank:
                    3,

                  pageType:
                    "CATEGORY",
                },
              ],
            },
          });

        expect(
          result.archetype
        ).toBe(
          "B2B_CATEGORY"
        );
      }
    );


    it(
      "uses query semantics only when live SERP evidence is absent",
      () => {
        const result =
          resolveUniversalPageArchetypeV2({
            topic:
              "what is compound interest",

            readerGoal:
              "Understand the concept",

            missionIntent:
              "INFORMATIONAL",

            serpResearch:
              null,
          });

        expect(
          result.archetype
        ).toBe(
          "DEFINITION"
        );

        expect(
          result.source
        ).toBe(
          "QUERY_FALLBACK"
        );
      }
    );
  }
);
