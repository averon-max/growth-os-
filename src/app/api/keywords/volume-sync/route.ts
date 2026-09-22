import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireWorkspaceAccess, authErrorResponse } from "@/lib/auth-helpers";
import { updateKeywordVolumes } from "@/lib/keywords/volume-service";
import { DataForSEOError } from "@/lib/keywords/dataforseo-provider";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { workspaceId, forceRefresh, market, language } = body as {
      workspaceId?: string;
      forceRefresh?: boolean;
      market?: string;
      language?: string;
    };

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
    }

    await requireWorkspaceAccess(user.id, workspaceId);

    const result = await updateKeywordVolumes(
      workspaceId,
      forceRefresh ?? false,
      market ?? "US",
      language ?? "English",
    );
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof DataForSEOError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    console.error("[keywords/volume-sync error]", err);
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
