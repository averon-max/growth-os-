import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  NextRequest,
} from "next/server";

vi.mock(
  "@/lib/keywords/outcome-checkpoint-engine",
  () => ({
    runOutcomeCheckpointEngine:
      vi.fn(),
  })
);

import {
  runOutcomeCheckpointEngine,
} from "@/lib/keywords/outcome-checkpoint-engine";

import {
  GET,
} from "./route";

const ORIGINAL_SECRET =
  process.env.CRON_SECRET;

function request(
  authorization?:
    string
) {
  return new NextRequest(
    "http://localhost/api/internal/outcome-checkpoints",
    {
      method:
        "GET",

      headers:
        authorization
          ? {
              authorization,
            }
          : undefined,
    }
  );
}

afterEach(
  () => {
    vi.clearAllMocks();

    if (
      ORIGINAL_SECRET ===
      undefined
    ) {
      delete process.env
        .CRON_SECRET;
    } else {
      process.env.CRON_SECRET =
        ORIGINAL_SECRET;
    }
  }
);

describe(
  "outcome checkpoint cron route",
  () => {
    it(
      "fails closed when CRON_SECRET is missing",
      async () => {
        delete process.env
          .CRON_SECRET;

        const response =
          await GET(
            request()
          );

        expect(
          response.status
        ).toBe(
          503
        );

        expect(
          runOutcomeCheckpointEngine
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects an invalid bearer secret",
      async () => {
        process.env.CRON_SECRET =
          "correct-secret-value";

        const response =
          await GET(
            request(
              "Bearer wrong-secret"
            )
          );

        expect(
          response.status
        ).toBe(
          401
        );

        expect(
          runOutcomeCheckpointEngine
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "runs the engine once with the correct secret",
      async () => {
        process.env.CRON_SECRET =
          "correct-secret-value";

        vi.mocked(
          runOutcomeCheckpointEngine
        ).mockResolvedValue(
          {
            scannedActions:
              4,

            due:
              2,

            created:
              2,

            duplicates:
              0,

            failures:
              0,
          }
        );

        const response =
          await GET(
            request(
              "Bearer correct-secret-value"
            )
          );

        const payload =
          await response.json();

        expect(
          response.status
        ).toBe(
          200
        );

        expect(
          payload.ok
        ).toBe(
          true
        );

        expect(
          payload.result.created
        ).toBe(
          2
        );

        expect(
          runOutcomeCheckpointEngine
        ).toHaveBeenCalledTimes(
          1
        );

        expect(
          runOutcomeCheckpointEngine
        ).toHaveBeenCalledWith({
          limit:
            100,
        });
      }
    );

    it(
      "does not leak engine errors",
      async () => {
        process.env.CRON_SECRET =
          "correct-secret-value";

        vi.mocked(
          runOutcomeCheckpointEngine
        ).mockRejectedValue(
          new Error(
            "sensitive provider detail"
          )
        );

        const response =
          await GET(
            request(
              "Bearer correct-secret-value"
            )
          );

        const payload =
          await response.json();

        expect(
          response.status
        ).toBe(
          500
        );

        expect(
          payload.error
        ).toBe(
          "Checkpoint run failed."
        );

        expect(
          JSON.stringify(
            payload
          )
        ).not.toContain(
          "sensitive provider detail"
        );
      }
    );
  }
);
