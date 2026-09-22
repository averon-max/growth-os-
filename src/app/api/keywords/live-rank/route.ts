import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  authErrorResponse,
  requireUser,
  requireWorkspaceAccess,
} from "@/lib/auth-helpers";

import {
  prisma,
} from "@/lib/prisma";

import {
  deriveSearchSeed,
} from "@/lib/keywords/seed-utils";

import {
  getCachedLiveRankReport,
  LiveRankRateLimitError,
  refreshLiveRankReport,
} from "@/lib/keywords/live-rank-service";

async function loadContext(
  req: NextRequest
) {
  const user =
    await requireUser();

  const workspaceId =
    req.nextUrl.searchParams
      .get(
        "workspaceId"
      )
      ?.trim();

  const websiteId =
    req.nextUrl.searchParams
      .get(
        "websiteId"
      )
      ?.trim();

  const market =
    (
      req.nextUrl.searchParams.get(
        "market"
      ) ??
      "US"
    ).toUpperCase();

  if (
    !workspaceId ||
    !websiteId
  ) {
    return {
      error:
        NextResponse.json(
          {
            error:
              "workspaceId and websiteId are required.",
          },
          {
            status:
              400,
          }
        ),
    };
  }

  await requireWorkspaceAccess(
    user.id,
    workspaceId
  );

  const website =
    await prisma.website.findFirst({
      where: {
        id:
          websiteId,

        business: {
          workspaceId,
        },
      },

      include: {
        business:
          true,
      },
    });

  if (!website) {
    return {
      error:
        NextResponse.json(
          {
            error:
              "Website not found.",
          },
          {
            status:
              404,
          }
        ),
    };
  }

  const industry =
    website.business.industry?.trim() ??
    "";

  const seed =
    industry &&
    !industry.startsWith(
      "http"
    )
      ? deriveSearchSeed(
          industry
        )
      : "";

  if (!seed) {
    return {
      error:
        NextResponse.json(
          {
            error:
              "Add your business industry before checking search positions.",
          },
          {
            status:
              400,
          }
        ),
    };
  }

  return {
    workspaceId,
    website,
    seed,
    market,
  };
}

export async function GET(
  req: NextRequest
) {
  try {
    const context =
      await loadContext(
        req
      );

    if (
      "error" in
      context
    ) {
      return context.error;
    }

    const report =
      await getCachedLiveRankReport({
        siteUrl:
          context.website.url,
        seed:
          context.seed,
        market:
          context.market,
      });

    return NextResponse.json({
      report,
      cached:
        Boolean(
          report
        ),
    });
  } catch (
    err
  ) {
    const {
      status,
      body,
    } =
      authErrorResponse(
        err
      );

    return NextResponse.json(
      body,
      {
        status,
      }
    );
  }
}

export async function POST(
  req: NextRequest
) {
  try {
    const context =
      await loadContext(
        req
      );

    if (
      "error" in
      context
    ) {
      return context.error;
    }

    const report =
      await refreshLiveRankReport({
        workspaceId:
          context.workspaceId,
        siteUrl:
          context.website.url,
        seed:
          context.seed,
        market:
          context.market,
      });

    return NextResponse.json({
      report,
      cached:
        false,
    });
  } catch (
    err
  ) {
    if (
      err instanceof
      LiveRankRateLimitError
    ) {
      return NextResponse.json(
        {
          error:
            "You have already refreshed live positions 3 times today. Try again tomorrow.",
        },
        {
          status:
            429,
        }
      );
    }

    console.error(
      "[keywords/live-rank]",
      err instanceof Error
        ? err.message
        : err
    );

    const {
      status,
      body,
    } =
      authErrorResponse(
        err
      );

    return NextResponse.json(
      body,
      {
        status,
      }
    );
  }
}
