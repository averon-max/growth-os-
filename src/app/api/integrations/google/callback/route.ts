import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  requireUser,
  requireWorkspaceAccess,
  authErrorResponse,
} from "@/lib/auth-helpers";

import {
  verifyOAuthState,
  InvalidStateError,
} from "@/lib/integrations/google/state";

import {
  exchangeCodeForTokens,
} from "@/lib/integrations/google/oauth-client";

import {
  upsertGoogleSearchConsoleConnection,
} from "@/lib/integrations/provider-connection-service";


function safeReturnTo(
  value:
    string | undefined
): string {
  if (
    value &&
    value.startsWith("/") &&
    !value.startsWith("//")
  ) {
    return value;
  }

  return "/dashboard/audience?gsc=connected";
}


export async function GET(
  req: NextRequest
) {
  try {
    const user =
      await requireUser();

    const code =
      req.nextUrl.searchParams
        .get("code");

    const state =
      req.nextUrl.searchParams
        .get("state");

    const oauthError =
      req.nextUrl.searchParams
        .get("error");

    if (oauthError) {
      return NextResponse.json(
        {
          error:
            `Google OAuth error: ${oauthError}`,
        },
        {
          status: 400,
        }
      );
    }

    if (
      !code ||
      !state
    ) {
      return NextResponse.json(
        {
          error:
            "Missing code or state.",
        },
        {
          status: 400,
        }
      );
    }

    let statePayload;

    try {
      statePayload =
        verifyOAuthState(
          state
        );
    } catch (error) {
      if (
        error instanceof
        InvalidStateError
      ) {
        return NextResponse.json(
          {
            error:
              error.message,
          },
          {
            status: 400,
          }
        );
      }

      throw error;
    }

    if (
      statePayload.userId !==
      user.id
    ) {
      return NextResponse.json(
        {
          error:
            "OAuth state does not match authenticated user.",
        },
        {
          status: 403,
        }
      );
    }

    await requireWorkspaceAccess(
      user.id,
      statePayload.workspaceId
    );

    const tokens =
      await exchangeCodeForTokens(
        code
      );

    await upsertGoogleSearchConsoleConnection(
      statePayload.workspaceId,
      tokens
    );

    return NextResponse.redirect(
      new URL(
        safeReturnTo(
          statePayload.returnTo
        ),
        req.url
      )
    );
  } catch (error) {
    console.error(
      "[GSC callback]",
      error instanceof Error
        ? error.message
        : "Unknown Google OAuth error"
    );

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
