import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  requireUser,
  requireWebsiteAccess,
  authErrorResponse,
} from "@/lib/auth-helpers";

import {
  getOpportunityDiagnosis,
} from "@/lib/keywords/opportunity-diagnosis";

import {
  buildOpportunityActionPlan,
} from "@/lib/keywords/opportunity-action-plan";

import {
  recordOutcomeAction,
} from "@/lib/keywords/outcome-service";

import {
  findLatestOutcomeAction,
} from "@/lib/keywords/outcome-repository";

import {
  normalizeOutcomeKeyword,
  shouldReuseRecentOutcomeAction,
} from "@/lib/keywords/outcome-start";

export async function POST(
  req: NextRequest
) {
  try {
    const user =
      await requireUser();

    const body =
      await req.json() as {
        websiteId?: string;
        keyword?: string;
        market?: string;
      };

    const websiteId =
      body.websiteId?.trim() ??
      "";

    const keyword =
      body.keyword?.trim() ??
      "";

    const market =
      (
        body.market?.trim() ??
        ""
      ).toUpperCase();

    if (
      !websiteId ||
      !keyword ||
      !market
    ) {
      return NextResponse.json(
        {
          error:
            "websiteId, keyword and market are required.",
        },
        {
          status:
            400,
        }
      );
    }

    const website =
      await requireWebsiteAccess(
        user.id,
        websiteId
      );

    const normalizedKeyword =
      normalizeOutcomeKeyword(
        keyword
      );

    const latest =
      await findLatestOutcomeAction({
        workspaceId:
          website.business.workspaceId,

        websiteId,

        normalizedKeyword,

        market,
      });

    if (
      shouldReuseRecentOutcomeAction(
        latest
      )
    ) {
      return NextResponse.json({
        action:
          latest,

        reused:
          true,
      });
    }

    const diagnosisResult =
      await getOpportunityDiagnosis({
        siteUrl:
          website.url,

        keyword,

        market,
      });

    const actionPlan =
      buildOpportunityActionPlan(
        diagnosisResult.diagnosis
      );

    const action =
      await recordOutcomeAction({
        workspaceId:
          website.business.workspaceId,

        websiteId,

        diagnosis:
          diagnosisResult.diagnosis,

        actionPlan,

        source:
          "GROWTH_OS_ACTION_PLAN_V1",
      });

    return NextResponse.json(
      {
        action,

        reused:
          false,
      },
      {
        status:
          201,
      }
    );
  } catch (
    err
  ) {
    console.error(
      "keywords/outcome-actions POST error",
      err
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
