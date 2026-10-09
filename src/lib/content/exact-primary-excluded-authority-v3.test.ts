import {
  describe,
  expect,
  it,
} from "vitest";

import {
  ExactPrimaryAuthorityErrorV1,
  applyExactPrimaryAuthorityV1,
} from "./exact-primary-authority-v1";

import type {
  ContentStrategy,
  ContentStrategyKeyword,
} from "./types";


function keyword(
  value:
    string
): ContentStrategyKeyword {
  return {
    keyword:
      value,
  } as unknown as
    ContentStrategyKeyword;
}


function strategy():
ContentStrategy {
  return {
    primary:
      keyword(
        "what is credit monitoring"
      ),

    secondary:
      [],

    supporting: [
      keyword(
        "free credit monitoring"
      ),
    ],

    excluded: [
      keyword(
        "credit monitoring"
      ),

      keyword(
        "best credit monitoring"
      ),
    ],

    decisionIntelligence: {
      ranked: [
        {
          keyword:
            "credit monitoring",

          eligible:
            true,
        },

        {
          keyword:
            "best credit monitoring",

          eligible:
            false,
        },
      ],
    } as unknown as
      NonNullable<
        ContentStrategy[
          "decisionIntelligence"
        ]
      >,
  } as unknown as
    ContentStrategy;
}


describe(
  "Exact Primary eligible excluded authority V3",
  () => {
    it(
      "promotes real excluded candidate only when decision eligible",
      () => {
        const input =
          strategy();

        const exact =
          input.excluded[0];

        const oldPrimary =
          input.primary;

        const oldSupporting =
          input.supporting[0];

        const unrelatedExcluded =
          input.excluded[1];

        const result =
          applyExactPrimaryAuthorityV1({
            strategy:
              input,

            requiredPrimaryKeyword:
              "credit monitoring",
          });

        expect(
          result.primary
        ).toBe(
          exact
        );

        expect(
          result.primary.keyword
        ).toBe(
          "credit monitoring"
        );

        expect(
          result.excluded
        ).toEqual([
          unrelatedExcluded,
        ]);

        expect(
          result.supporting
        ).toContain(
          oldPrimary
        );

        expect(
          result.supporting
        ).toContain(
          oldSupporting
        );

        expect(
          result.supporting
        ).not.toContain(
          unrelatedExcluded
        );
      }
    );


    it(
      "does not allow an ineligible excluded candidate to become exact primary",
      () => {
        const input =
          strategy();

        input.decisionIntelligence =
          {
            ranked: [
              {
                keyword:
                  "credit monitoring",

                eligible:
                  false,
              },
            ],
          } as unknown as
            NonNullable<
              ContentStrategy[
                "decisionIntelligence"
              ]
            >;

        expect(
          () =>
            applyExactPrimaryAuthorityV1({
              strategy:
                input,

              requiredPrimaryKeyword:
                "credit monitoring",
            })
        ).toThrow(
          ExactPrimaryAuthorityErrorV1
        );
      }
    );


    it(
      "still fails when exact keyword does not exist in any typed pool",
      () => {
        expect(
          () =>
            applyExactPrimaryAuthorityV1({
              strategy:
                strategy(),

              requiredPrimaryKeyword:
                "totally unrelated query",
            })
        ).toThrow(
          ExactPrimaryAuthorityErrorV1
        );
      }
    );
  }
);
