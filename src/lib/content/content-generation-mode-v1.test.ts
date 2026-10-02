import {
  describe,
  expect,
  it,
} from "vitest";

import {
  ContentGenerationPolicyErrorV1,
  assertExactKeywordDidNotDriftV1,
  parseContentGenerationPolicyV1,
} from "./content-generation-mode-v1";


describe(
  "ContentGenerationModeV1",
  () => {
    it(
      "defaults to EXACT_KEYWORD",
      () => {
        const result =
          parseContentGenerationPolicyV1({
            topic:
              "canonical tags",
          });

        expect(
          result.mode
        ).toBe(
          "EXACT_KEYWORD"
        );

        expect(
          result.exactKeyword
        ).toBe(
          "canonical tags"
        );
      }
    );


    it(
      "BEST_OPPORTUNITY treats topic as seed",
      () => {
        const result =
          parseContentGenerationPolicyV1({
            generationMode:
              "BEST_OPPORTUNITY",

            topic:
              "credit monitoring",
          });

        expect(
          result.mode
        ).toBe(
          "BEST_OPPORTUNITY"
        );

        expect(
          result.exactKeyword
        ).toBeNull();
      }
    );


    it(
      "blocks exact keyword drift",
      () => {
        const policy =
          parseContentGenerationPolicyV1({
            generationMode:
              "EXACT_KEYWORD",

            exactKeyword:
              "canonical tags",
          });

        expect(
          () =>
            assertExactKeywordDidNotDriftV1({
              policy,

              productionPrimary:
                "canonical tag generator",
            })
        ).toThrow(
          ContentGenerationPolicyErrorV1
        );
      }
    );


    it(
      "allows BEST_OPPORTUNITY winner to differ from seed",
      () => {
        const policy =
          parseContentGenerationPolicyV1({
            generationMode:
              "BEST_OPPORTUNITY",

            topic:
              "crm for plumbers",
          });

        expect(
          () =>
            assertExactKeywordDidNotDriftV1({
              policy,

              productionPrimary:
                "best crm for plumbers",
            })
        ).not.toThrow();
      }
    );
  }
);
