import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireWorkspaceAccess, authErrorResponse } from "@/lib/auth-helpers";
import { verifyOAuthState, InvalidStateError } from "@/lib/integrations/google/state";
import { exchangeCodeForTokens } from "@/lib/integrations/google/oauth-client";
import { upsertGoogleSearchConsoleConnection } from "@/lib/integrations/provider-connection-service";

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

    // Re-verify workspace membership server-side — never trust the state alone.
    await requireWorkspaceAccess(user.id, statePayload.workspaceId);

    const tokens = await exchangeCodeForTokens(code);
    await upsertGoogleSearchConsoleConnection(statePayload.workspaceId, tokens);

    return NextResponse.redirect(new URL("/settings/integrations?connected=google", req.url));
  } catch (err) {
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
