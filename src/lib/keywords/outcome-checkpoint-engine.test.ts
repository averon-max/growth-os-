import {
  describe,
  expect,
  it,
} from "vitest";

import {
  cachedRankForCheckpoint,
  checkpointTargetAt,
  getDueOutcomeCheckpoints,
  liveRankCacheKey,
} from "./outcome-checkpoint-engine";

describe(
  "outcome checkpoint engine",
  () => {
    const executedAt =
      new Date(
        "2026-09-01T12:00:00.000Z"
      );

    it(
      "does not schedule anything before day 7",
      () => {
        expect(
          getDueOutcomeCheckpoints({
            executedAt,

            now:
              new Date(
                "2026-09-08T11:59:59.000Z"
              ),

            existing:
              [],
          })
        ).toEqual(
          []
        );
      }
    );

    it(
      "schedules day 7 exactly when due",
      () => {
        expect(
          getDueOutcomeCheckpoints({
            executedAt,

            now:
              new Date(
                "2026-09-08T12:00:00.000Z"
              ),

            existing:
              [],
          })
        ).toEqual(
          [
            "DAY_7",
          ]
        );
      }
    );

    it(
      "skips completed checkpoints",
      () => {
        expect(
          getDueOutcomeCheckpoints({
            executedAt,

            now:
              new Date(
                "2026-09-30T12:00:00.000Z"
              ),

            existing: [
              "BASELINE",
              "DAY_7",
            ],
          })
        ).toEqual(
          [
            "DAY_14",
            "DAY_28",
          ]
        );
      }
    );

    it(
      "calculates checkpoint target dates from execution time",
      () => {
        expect(
          checkpointTargetAt(
            executedAt,
            "DAY_14"
          ).toISOString()
        ).toBe(
          "2026-09-15T12:00:00.000Z"
        );
      }
    );

    it(
      "uses exact cached rank when measurement is near checkpoint",
      () => {
        expect(
          cachedRankForCheckpoint({
            keyword:
              "credit monitoring",

            targetAt:
              new Date(
                "2026-09-08T12:00:00.000Z"
              ),

            report: {
              checkedAt:
                "2026-09-08T13:00:00.000Z",

              keywords: [
                {
                  keyword:
                    "credit monitoring",

                  rank:
                    47,

                  rankingUrl:
                    "https://example.com/credit-monitoring",

                  status:
                    "TOP_100",
                },
              ],
            },
          })
        ).toEqual({
          rank:
            47,

          state:
            "FOUND",

          pageUrl:
            "https://example.com/credit-monitoring",
        });
      }
    );

    it(
      "preserves not-top-100 without inventing rank 100",
      () => {
        expect(
          cachedRankForCheckpoint({
            keyword:
              "credit monitoring",

            targetAt:
              new Date(
                "2026-09-08T12:00:00.000Z"
              ),

            report: {
              checkedAt:
                "2026-09-08T12:00:00.000Z",

              keywords: [
                {
                  keyword:
                    "credit monitoring",

                  rank:
                    null,

                  rankingUrl:
                    null,

                  status:
                    "NOT_TOP_100",
                },
              ],
            },
          })
        ).toEqual({
          rank:
            null,

          state:
            "NOT_TOP_100",

          pageUrl:
            null,
        });
      }
    );

    it(
      "treats failed or historically stale cached rank as unavailable",
      () => {
        const failed =
          cachedRankForCheckpoint({
            keyword:
              "credit monitoring",

            targetAt:
              new Date(
                "2026-09-08T12:00:00.000Z"
              ),

            report: {
              checkedAt:
                "2026-09-08T12:00:00.000Z",

              keywords: [
                {
                  keyword:
                    "credit monitoring",

                  rank:
                    null,

                  status:
                    "CHECK_FAILED",
                },
              ],
            },
          });

        const late =
          cachedRankForCheckpoint({
            keyword:
              "credit monitoring",

            targetAt:
              new Date(
                "2026-09-08T12:00:00.000Z"
              ),

            report: {
              checkedAt:
                "2026-09-20T12:00:00.000Z",

              keywords: [
                {
                  keyword:
                    "credit monitoring",

                  rank:
                    12,

                  status:
                    "TOP_100",
                },
              ],
            },
          });

        expect(
          failed.state
        ).toBe(
          "UNAVAILABLE"
        );

        expect(
          failed.rank
        ).toBeNull();

        expect(
          late.state
        ).toBe(
          "UNAVAILABLE"
        );

        expect(
          late.rank
        ).toBeNull();
      }
    );

    it(
      "uses same cache-key scope as live rank reports",
      () => {
        expect(
          liveRankCacheKey({
            siteUrl:
              "https://www.ScanMyCreds.com/",

            keyword:
              "  Credit   Monitoring ",

            market:
              "us",
          })
        ).toBe(
          "scanmycreds.com:US:credit monitoring"
        );
      }
    );
  }
);
