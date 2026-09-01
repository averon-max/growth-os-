import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireWorkspaceAccess, authErrorResponse } from "@/lib/auth-helpers";
import { getAppliedFixesForWorkspace } from "@/lib/cms/repository";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const workspaceId = req.nextUrl.searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId query parameter is required." }, { status: 400 });
    }

    await requireWorkspaceAccess(user.id, workspaceId);

    const page = Number(req.nextUrl.searchParams.get("page") ?? "1");
    const limit = Number(req.nextUrl.searchParams.get("limit") ?? "25");

    const result = await getAppliedFixesForWorkspace(workspaceId, { page, limit });
    return NextResponse.json(result);
  } catch (err) {
    console.error("cms/fixes GET error", err);
    const { status, body: errBody } = authErrorResponse(err);
    return NextResponse.json(errBody, { status });
  }
}
