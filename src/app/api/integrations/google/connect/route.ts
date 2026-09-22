import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  requireUser,
  requireWorkspaceAccess,
  requireWebsiteAccess,
  authErrorResponse,
} from "@/lib/auth-helpers";

import {
  prisma,
} from "@/lib/prisma";

import {
  createOAuthState,
} from "@/lib/integrations/google/state";

import {
  buildGoogleAuthUrl,
} from "@/lib/integrations/google/oauth-client";

import {
  GSC_OAUTH_SCOPES,
} from "@/lib/integrations/google/constants";


export async function GET(
  req: NextRequest
) {
  try {
    const user =
      await requireUser();

    const websiteId =
      req.nextUrl.searchParams
        .get("websiteId")
        ?.trim() ||
      null;

    const requestedWorkspaceId =
      req.nextUrl.searchParams
        .get("workspaceId")
        ?.trim() ||
      null;

    let workspaceId:
      string | null =
        requestedWorkspaceId;

    if (websiteId) {
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
            business: {
              select: {
                workspaceId:
                  true,
              },
            },
          },
        });

      if (!website) {
        return NextResponse.json(
          {
            error:
              "Website not found.",
          },
          {
            status: 404,
          }
        );
      }

      workspaceId =
        website.business
          .workspaceId;
    }

    if (!workspaceId) {
      return NextResponse.json(
        {
          error:
            "websiteId or workspaceId is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (!websiteId) {
      await requireWorkspaceAccess(
        user.id,
        workspaceId
      );
    }

    const returnTo =
      websiteId
        ? `/dashboard/audience?websiteId=${encodeURIComponent(
            websiteId
          )}&gsc=connected`
        : "/dashboard/audience?gsc=connected";

    const state =
      createOAuthState(
        user.id,
        workspaceId,
        returnTo
      );

    return NextResponse.redirect(
      buildGoogleAuthUrl(
        state,
        GSC_OAUTH_SCOPES
      )
    );
  } catch (error) {
    const {
      status,
      body,
    } =
      authErrorResponse(
        error
      );

    return NextResponse.json(
      body,
      {
        status,
      }
    );
  }
}
