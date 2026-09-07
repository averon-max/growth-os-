import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireWorkspaceAccess, authErrorResponse } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getKeywordSnapshots } from "@/lib/keywords/repository";

function parsePositiveInt(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ keywordId: string }> }) {
  try {
    const user = await requireUser();
    const { keywordId } = await params;
    const workspaceId = req.nextUrl.searchParams.get("workspaceId");
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
    }
    await requireWorkspaceAccess(user.id, workspaceId);

    // Ownership check -- never trust a keywordId from the browser alone.
    const keyword = await prisma.keyword.findUnique({ where: { id: keywordId } });
    if (!keyword || keyword.workspaceId !== workspaceId) {
      return NextResponse.json({ error: "Keyword not found." }, { status: 404 });
    }

    const days = parsePositiveInt(req.nextUrl.searchParams.get("days")) ?? 90;
    const snapshots = await getKeywordSnapshots(keywordId, days);

    return NextResponse.json({
      keyword: keyword.text,
      snapshots: snapshots.map((s) => ({
        date: s.date.toISOString().slice(0, 10),
        position: s.position !== null ? Number(s.position) : null,
        clicks: s.clicks,
        impressions: s.impressions,
        ctr: s.ctr !== null ? Number(s.ctr) : null,
      })),
    });
  } catch (err) {
    console.error("[keywords/snapshots error]", err);
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
