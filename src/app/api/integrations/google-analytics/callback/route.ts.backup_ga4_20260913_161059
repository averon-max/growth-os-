import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireWorkspaceAccess, authErrorResponse } from "@/lib/auth-helpers";
import { verifyOAuthState, InvalidStateError } from "@/lib/integrations/google/state";
import { exchangeCodeForTokens } from "@/lib/integrations/google/oauth-client";
import { upsertGoogleAnalyticsConnection } from "@/lib/integrations/provider-connection-service";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();

    const code = req.nextUrl.searchParams.get("code");
    const state = req.nextUrl.searchParams.get("state");
    const oauthError = req.nextUrl.searchParams.get("error");

    if (oauthError) {
      return NextResponse.json({ error: `Google OAuth error: ${oauthError}` }, { status: 400 });
    }
    if (!code || !state) {
      return NextResponse.json({ error: "Missing code or state." }, { status: 400 });
    }

    let statePayload;
    try {
      statePayload = verifyOAuthState(state);
    } catch (err) {
      if (err instanceof InvalidStateError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }

    if (statePayload.userId !== user.id) {
      return NextResponse.json({ error: "State does not match authenticated user." }, { status: 403 });
    }

    await requireWorkspaceAccess(user.id, statePayload.workspaceId);

    const tokens = await exchangeCodeForTokens(code);
    await upsertGoogleAnalyticsConnection(statePayload.workspaceId, tokens);

    return NextResponse.redirect(new URL("/dashboard?connected=ga4", req.url));
  } catch (err) {
    console.error("[GA4 callback error]", err);
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
