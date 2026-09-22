import {
  describe,
  expect,
  it,
} from "vitest";

import {
  normalizeOutcomeKeyword,
  shouldReuseRecentOutcomeAction,
} from "./outcome-start";

describe(
  "outcome start",
  () => {
    it(
      "normalizes keyword identity",
      () => {
        expect(
          normalizeOutcomeKeyword(
            "  Credit   Monitoring "
          )
        ).toBe(
          "credit monitoring"
        );
      }
    );

    it(
      "reuses a recent planned Growth OS action",
      () => {
        const now =
          Date.now();

        expect(
          shouldReuseRecentOutcomeAction(
            {
              status:
                "PLANNED",

              source:
                "GROWTH_OS_ACTION_PLAN_V1",

              createdAt:
                new Date(
                  now -
                  5_000
                ),
            },
            now
          )
        ).toBe(
          true
        );
      }
    );

    it(
      "does not reuse an old action",
      () => {
        const now =
          Date.now();

        expect(
          shouldReuseRecentOutcomeAction(
            {
              status:
                "PLANNED",

              source:
                "GROWTH_OS_ACTION_PLAN_V1",

              createdAt:
                new Date(
                  now -
                  60_000
                ),
            },
            now
          )
        ).toBe(
          false
        );
      }
    );

    it(
      "does not reuse executed actions",
      () => {
        expect(
          shouldReuseRecentOutcomeAction({
            status:
              "EXECUTED",

            source:
              "GROWTH_OS_ACTION_PLAN_V1",

            createdAt:
              new Date(),
          })
        ).toBe(
          false
        );
      }
    );
  }
);
