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
  refreshOutcomeActionCompatibility,
} from "@/lib/keywords/outcome-revalidation";

export async function POST(
  req: NextRequest,
  {
    params,
  }: {
    params:
      Promise<{
        id:
          string;
      }>;
  }
) {
  try {
    const user =
      await requireUser();

    const {
      id,
    } =
      await params;

    const body =
      await req.json() as {
        websiteId?:
          string;
      };

    const websiteId =
      body.websiteId?.trim() ??
      "";

    if (
      !websiteId
    ) {
      return NextResponse.json(
        {
          error:
            "websiteId is required.",
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

    const result =
      await refreshOutcomeActionCompatibility({
        workspaceId:
          website.business.workspaceId,

        websiteId,

        actionId:
          id,
      });

    return NextResponse.json({
      action: {
        id:
          result.action.id,

        keywordText:
          result.action.keywordText,

        decision:
          result.action.decision,

        status:
          result.action.status,

        compatibilityStatus:
          result.action.compatibilityStatus,

        compatibilityReason:
          result.action.compatibilityReason,
      },

      changed:
        result.changed,

      reused:
        result.reused,
    });
  } catch (
    err
  ) {
    console.error(
      "outcome refresh compatibility error",
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
