import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  authErrorResponse,
  requireUser,
  requireWebsiteAccess,
} from "@/lib/auth-helpers";

import {
  prisma,
} from "@/lib/prisma";

import {
  getOpportunityDiagnosis,
  OpportunityDiagnosisError,
} from "@/lib/keywords/opportunity-diagnosis";

import {
  buildOpportunityActionPlan,
} from "@/lib/keywords/opportunity-action-plan";

export async function GET(
  req: NextRequest
) {
  try {
    const user =
      await requireUser();

    const websiteId =
      req.nextUrl.searchParams
        .get(
          "websiteId"
        )
        ?.trim();

    const keyword =
      req.nextUrl.searchParams
        .get(
          "keyword"
        )
        ?.trim();

    const market =
      (
        req.nextUrl.searchParams.get(
          "market"
        ) ??
        "US"
      )
        .trim()
        .toUpperCase();

    if (
      !websiteId ||
      !keyword
    ) {
      return NextResponse.json(
        {
          error:
            "websiteId and keyword are required.",
        },
        {
          status:
            400,
        }
      );
    }

    await requireWebsiteAccess(
      user.id,
      websiteId
    );

    const website =
      await prisma.website.findUnique({
        where: {
          id:
            websiteId,
        },

        select: {
          url:
            true,
        },
      });

    if (
      !website
    ) {
      return NextResponse.json(
        {
          error:
            "Website not found.",
        },
        {
          status:
            404,
        }
      );
    }

    const result =
      await getOpportunityDiagnosis({
        siteUrl:
          website.url,

        keyword,

        market,
      });

    const actionPlan =
      buildOpportunityActionPlan(
        result.diagnosis
      );

    return NextResponse.json({
      diagnosis:
        result.diagnosis,

      actionPlan,

      fromCache:
        result.fromCache,
    });
  } catch (
    err
  ) {
    if (
      err instanceof
      OpportunityDiagnosisError
    ) {
      return NextResponse.json(
        {
          error:
            err.message,
        },
        {
          status:
            err.status,
        }
      );
    }

    console.error(
      "[keywords/opportunity-diagnosis]",
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
