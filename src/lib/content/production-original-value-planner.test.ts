import {
  describe,
  expect,
  it,
} from "vitest";

import {
  planProductionOriginalValue,
} from "./production-original-value-planner";


const serpCoverage = {
  version:
    "SERP_COMPETITIVE_COVERAGE_V1" as const,

  analyzedResults:
    8,

  uniqueDomains:
    7,

  governmentResults:
    1,

  academicResults:
    0,

  featuredSnippetPresent:
    true,

  dominantTitleTerms:
    [],

  observedQuestions: [
    "Is credit monitoring worth it?",
  ],

  topResults:
    [],
};


describe(
  "Production Original Value Planner",
  () => {
    it(
      "creates a planned SERP-gap asset instead of an empty original-value plan",
      () => {
        const result =
          planProductionOriginalValue({
            topic:
              "credit monitoring",

            serpCoverage,

            opportunities: [
              {
                topic:
                  "limitations and false expectations",

                originalValueOpportunity:
                  true,
              },
            ],
          });


        expect(
          result.input.assets
        ).toHaveLength(
          1
        );


        expect(
          result.input.assets[0]
            ?.type
        ).toBe(
          "COMPARISON_MATRIX"
        );


        expect(
          result.input.assets[0]
            ?.verified
        ).toBe(
          false
        );


        expect(
          result.input.assets[0]
            ?.firstParty
        ).toBe(
          false
        );


        expect(
          result.input
            .commoditySignals
            ?.newSynthesis
        ).toBe(
          1
        );
      }
    );


    it(
      "fails closed when there is no live SERP and no observed original-value opportunity",
      () => {
        const result =
          planProductionOriginalValue({
            topic:
              "unknown topic",

            serpCoverage: {
              ...serpCoverage,

              analyzedResults:
                0,

              uniqueDomains:
                0,

              governmentResults:
                0,

              featuredSnippetPresent:
                false,

              observedQuestions:
                [],
            },

            opportunities:
              [],
          });


        expect(
          result.input.assets
        ).toEqual(
          []
        );
      }
    );


    it(
      "never marks a planned SERP synthesis as verified evidence",
      () => {
        const result =
          planProductionOriginalValue({
            topic:
              "credit monitoring",

            serpCoverage,

            opportunities:
              [],
          });


        expect(
          result.input.assets.every(
            (
              asset
            ) =>
              asset.verified ===
              false
          )
        ).toBe(
          true
        );
      }
    );
  }
);
