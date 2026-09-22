import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  runOutcomeCheckpointEngine,
} from "@/lib/keywords/outcome-checkpoint-engine";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

export const maxDuration =
  60;

export async function GET(
  request:
    NextRequest
) {
  const secret =
    process.env.CRON_SECRET
      ?.trim();

  if (
    !secret
  ) {
    console.error(
      "Outcome checkpoint cron is missing CRON_SECRET."
    );

    return NextResponse.json(
      {
        ok:
          false,

        error:
          "Scheduler is not configured.",
      },
      {
        status:
          503,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  const authorization =
    request.headers.get(
      "authorization"
    );

  if (
    authorization !==
    `Bearer ${secret}`
  ) {
    return NextResponse.json(
      {
        ok:
          false,

        error:
          "Unauthorized.",
      },
      {
        status:
          401,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }

  try {
    const result =
      await runOutcomeCheckpointEngine({
        limit:
          100,
      });

    return NextResponse.json(
      {
        ok:
          true,

        result,
      },
      {
        status:
          200,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  } catch (
    error
  ) {
    console.error(
      "Outcome checkpoint cron failed.",
      error
    );

    return NextResponse.json(
      {
        ok:
          false,

        error:
          "Checkpoint run failed.",
      },
      {
        status:
          500,

        headers: {
          "Cache-Control":
            "no-store",
        },
      }
    );
  }
}
