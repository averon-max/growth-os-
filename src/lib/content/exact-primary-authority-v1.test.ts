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

    secondary: [
      keyword(
        "credit monitoring"
      ),
    ],

    supporting: [
      keyword(
        "free credit monitoring"
      ),
    ],
  } as unknown as
    ContentStrategy;
}


describe(
  "Exact Primary Authority V1",
  () => {
    it(
      "promotes the existing exact candidate without inventing a new keyword object",
      () => {
        const input =
          strategy();

        const exactCandidate =
          input.secondary[0];

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
          exactCandidate
        );

        expect(
          result.primary.keyword
        ).toBe(
          "credit monitoring"
        );
      }
    );


    it(
      "does nothing when no exact authority is requested",
      () => {
        const input =
          strategy();

        expect(
          applyExactPrimaryAuthorityV1({
            strategy:
              input,
          })
        ).toBe(
          input
        );
      }
    );


    it(
      "fails closed when the required query is absent",
      () => {
        expect(
          () =>
            applyExactPrimaryAuthorityV1({
              strategy:
                strategy(),

              requiredPrimaryKeyword:
                "totally missing query",
            })
        ).toThrow(
          ExactPrimaryAuthorityErrorV1
        );
      }
    );
  }
);
