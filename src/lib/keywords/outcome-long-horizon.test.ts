import {
  describe,
  expect,
  it,
} from "vitest";

import {
  checkpointTargetAt,
  getDueOutcomeCheckpoints,
} from "./outcome-checkpoint-engine";

describe(
  "outcome long-horizon checkpoints",
  () => {
    const executedAt =
      new Date(
        "2026-01-01T12:00:00.000Z"
      );

    it(
      "calculates exact D60 and D90 targets",
      () => {
        expect(
          checkpointTargetAt(
            executedAt,
            "DAY_60"
          ).toISOString()
        ).toBe(
          "2026-03-02T12:00:00.000Z"
        );

        expect(
          checkpointTargetAt(
            executedAt,
            "DAY_90"
          ).toISOString()
        ).toBe(
          "2026-04-01T12:00:00.000Z"
        );
      }
    );

    it(
      "schedules only D60 when earlier checkpoints are complete",
      () => {
        expect(
          getDueOutcomeCheckpoints({
            executedAt,

            now:
              new Date(
                "2026-03-02T12:00:00.000Z"
              ),

            existing: [
              "DAY_7",
              "DAY_14",
              "DAY_28",
            ],
          })
        ).toEqual([
          "DAY_60",
        ]);
      }
    );

    it(
      "schedules only D90 after D60 is complete",
      () => {
        expect(
          getDueOutcomeCheckpoints({
            executedAt,

            now:
              new Date(
                "2026-04-01T12:00:00.000Z"
              ),

            existing: [
              "DAY_7",
              "DAY_14",
              "DAY_28",
              "DAY_60",
            ],
          })
        ).toEqual([
          "DAY_90",
        ]);
      }
    );

    it(
      "does not reschedule completed long-horizon checkpoints",
      () => {
        expect(
          getDueOutcomeCheckpoints({
            executedAt,

            now:
              new Date(
                "2026-04-15T12:00:00.000Z"
              ),

            existing: [
              "DAY_7",
              "DAY_14",
              "DAY_28",
              "DAY_60",
              "DAY_90",
            ],
          })
        ).toEqual([]);
      }
    );
  }
);
