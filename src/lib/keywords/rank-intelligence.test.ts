import {
  describe,
  expect,
  it,
} from "vitest";

import {
  aggregateRankSnapshots,
  classifyKeyword,
  positionDelta,
} from "./rank-intelligence";

describe(
  "rank intelligence",
  () => {
    it(
      "uses impression weighted Google position",
      () => {
        const result =
          aggregateRankSnapshots(
            [
              {
                date:
                  new Date(
                    "2026-09-10T00:00:00Z"
                  ),
                position:
                  10,
                impressions:
                  100,
                clicks:
                  5,
                pageUrl:
                  "https://example.com/a",
              },
              {
                date:
                  new Date(
                    "2026-09-10T00:00:00Z"
                  ),
                position:
                  20,
                impressions:
                  300,
                clicks:
                  10,
                pageUrl:
                  "https://example.com/b",
              },
            ],
            new Date(
              "2026-09-10T00:00:00Z"
            ),
            new Date(
              "2026-09-10T00:00:00Z"
            )
          );

        expect(
          result.impressions
        ).toBe(
          400
        );

        expect(
          result.clicks
        ).toBe(
          15
        );

        expect(
          result.position
        ).toBe(
          17.5
        );

        expect(
          result.rankingUrl
        ).toBe(
          "https://example.com/b"
        );
      }
    );

    it(
      "positive delta means ranking improved",
      () => {
        expect(
          positionDelta(
            8,
            14
          )
        ).toBe(
          6
        );
      }
    );

    it(
      "recognizes positions 4 through 20 as growth opportunities",
      () => {
        expect(
          classifyKeyword(
            12,
            1,
            500
          )
        ).toBe(
          "QUICK_WIN"
        );
      }
    );
  }
);
