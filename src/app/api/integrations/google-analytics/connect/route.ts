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
  createOAuthState,
} from "@/lib/integrations/google/state";

import {
  buildGoogleAuthUrl,
} from "@/lib/integrations/google/oauth-client";

import {
  GA4_OAUTH_SCOPES,
} from "@/lib/integrations/google/constants";

function callbackUrl(
  req: NextRequest
): string {
  return (
    process.env
      .GOOGLE_GA4_REDIRECT_URI
      ?.trim() ||
    new URL(
      "/api/integrations/google-analytics/callback",
      req.url
    ).toString()
  );
}

export async function GET(
  req: NextRequest
) {
  try {
    const user =
      await requireUser();

    const workspaceId =
      req.nextUrl
        .searchParams
        .get(
          "workspaceId"
        )
        ?.trim();

    const websiteId =
      req.nextUrl
        .searchParams
        .get(
          "websiteId"
        )
        ?.trim() ||
      null;

    if (!workspaceId) {
      return NextResponse.json(
        {
          error:
            "workspaceId is required.",
        },
        {
          status: 400,
        }
      );
    }

    await requireWorkspaceAccess(
      user.id,
      workspaceId
    );

    if (websiteId) {
      await requireWebsiteAccess(
        user.id,
        websiteId
      );
    }

    const returnTo =
      websiteId
        ? `/dashboard/audience?websiteId=${encodeURIComponent(
            websiteId
          )}&ga4=connected`
        : "/dashboard/audience?ga4=connected";

    const state =
      createOAuthState(
        user.id,
        workspaceId,
        returnTo
      );

    return NextResponse.redirect(
      buildGoogleAuthUrl(
        state,
        GA4_OAUTH_SCOPES,
        callbackUrl(req)
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
