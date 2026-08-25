import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireWorkspaceAccess, authErrorResponse } from "@/lib/auth-helpers";
import { createOAuthState } from "@/lib/integrations/google/state";
import { buildGoogleAuthUrl } from "@/lib/integrations/google/oauth-client";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const workspaceId = req.nextUrl.searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
    }
    await requireWorkspaceAccess(user.id, workspaceId);

    const state = createOAuthState(user.id, workspaceId);
    return NextResponse.redirect(buildGoogleAuthUrl(state));
  } catch (err) {
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
