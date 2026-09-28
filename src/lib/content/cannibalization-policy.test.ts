import {
  describe,
  expect,
  it,
} from "vitest";

import {
  evaluateCannibalizationPolicyV2,
} from "./cannibalization-policy";


describe(
  "Cannibalization Policy V2",
  () => {
    const confirmed = {
      status:
        "MULTIPLE_OWNERS",

      cannibalization:
        "CONFIRMED",

      actionHint:
        "MERGE_INVESTIGATION",

      primaryOwnerUrl:
        "https://example.com/a",
    };


    it(
      "uses SMART by default and blocks duplicate ownership",
      () => {
        const decision =
          evaluateCannibalizationPolicyV2({
            ownership:
              confirmed,
          });

        expect(
          decision.mode
        ).toBe(
          "SMART"
        );

        expect(
          decision.recommendedAction
        ).toBe(
          "MERGE"
        );

        expect(
          decision.blockingNewUrl
        ).toBe(
          true
        );
      }
    );


    it(
      "allows separate URLs when intent is different in SMART mode",
      () => {
        const decision =
          evaluateCannibalizationPolicyV2({
            ownership: {
              status:
                "INTENT_CONFLICT",

              cannibalization:
                "NONE",

              actionHint:
                "REPOSITION_INVESTIGATION",
            },
          });

        expect(
          decision.recommendedAction
        ).toBe(
          "CREATE"
        );

        expect(
          decision.blockingNewUrl
        ).toBe(
          false
        );
      }
    );


    it(
      "supports explicit overlap",
      () => {
        const decision =
          evaluateCannibalizationPolicyV2({
            ownership:
              confirmed,

            mode:
              "ALLOW",
          });

        expect(
          decision.recommendedAction
        ).toBe(
          "KEEP_BOTH"
        );

        expect(
          decision.blockingNewUrl
        ).toBe(
          false
        );
      }
    );


    it(
      "supports ignore mode",
      () => {
        const decision =
          evaluateCannibalizationPolicyV2({
            ownership:
              confirmed,

            mode:
              "IGNORE",
          });

        expect(
          decision.recommendedAction
        ).toBe(
          "NO_CHANGE"
        );

        expect(
          decision.blockingNewUrl
        ).toBe(
          false
        );
      }
    );


    it(
      "aggressively prevents a second URL when requested",
      () => {
        const decision =
          evaluateCannibalizationPolicyV2({
            ownership: {
              status:
                "SINGLE_OWNER",

              cannibalization:
                "NONE",

              actionHint:
                "UPDATE_CANDIDATE",

              primaryOwnerUrl:
                "https://example.com/current",
            },

            mode:
              "PREVENT",
          });

        expect(
          decision.recommendedAction
        ).toBe(
          "UPDATE"
        );

        expect(
          decision.blockingNewUrl
        ).toBe(
          true
        );
      }
    );
  }
);
