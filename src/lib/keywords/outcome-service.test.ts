import {
  describe,
  expect,
  it,
} from "vitest";

import {
  calculateRankMovement,
  numericDelta,
} from "./outcome-service";

describe(
  "outcome service",
  () => {
    it(
      "records entering the top 100 without inventing a numeric gain",
      () => {
        expect(
          calculateRankMovement({
            baselineState:
              "NOT_TOP_100",

            baselineRank:
              null,

            currentState:
              "FOUND",

            currentRank:
              47,
          })
        ).toEqual({
          movement:
            "ENTERED_TOP_100",

          positionsGained:
            null,
        });
      }
    );

    it(
      "calculates positive positions gained when rank improves",
      () => {
        expect(
          calculateRankMovement({
            baselineState:
              "FOUND",

            baselineRank:
              24,

            currentState:
              "FOUND",

            currentRank:
              11,
          })
        ).toEqual({
          movement:
            "MOVED_UP",

          positionsGained:
            13,
        });
      }
    );

    it(
      "keeps unavailable rank distinct from not top 100",
      () => {
        expect(
          calculateRankMovement({
            baselineState:
              "UNAVAILABLE",

            baselineRank:
              null,

            currentState:
              "NOT_TOP_100",

            currentRank:
              null,
          })
        ).toEqual({
          movement:
            "UNKNOWN",

          positionsGained:
            null,
        });
      }
    );

    it(
      "preserves null when a metric is unavailable",
      () => {
        expect(
          numericDelta(
            null,
            12
          )
        ).toBeNull();

        expect(
          numericDelta(
            10,
            12
          )
        ).toBe(
          2
        );
      }
    );

    it(
      "rejects a numeric rank paired with NOT_TOP_100",
      () => {
        expect(
          () =>
            calculateRankMovement({
              baselineState:
                "NOT_TOP_100",

              baselineRank:
                100,

              currentState:
                "NOT_TOP_100",

              currentRank:
                null,
            })
        ).toThrow();
      }
    );
  }
);
