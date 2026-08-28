import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireWorkspaceAccess, authErrorResponse } from "@/lib/auth-helpers";
import { fetchAndUpsertKeywords } from "@/lib/keywords/ingestion";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { workspaceId, siteUrl } = body as { workspaceId?: string; siteUrl?: string };

    if (!workspaceId || !siteUrl) {
      return NextResponse.json({ error: "workspaceId and siteUrl are required." }, { status: 400 });
    }

    await requireWorkspaceAccess(user.id, workspaceId);

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 28);

    const count = await fetchAndUpsertKeywords(workspaceId, siteUrl, {
      startDate,
      endDate,
    });

    return NextResponse.json({ success: true, imported: count });
  } catch (err) {
    console.error("[keywords/sync error]", err);
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
