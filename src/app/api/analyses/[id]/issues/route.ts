import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAnalysisAccess, authErrorResponse } from "@/lib/auth-helpers";

const SEVERITY_ORDER: Record<string, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireUser();

    await requireAnalysisAccess(user.id, id);

    const issues = await prisma.sEOIssue.findMany({
      where: { analysisId: id },
      orderBy: { createdAt: "asc" },
    });

    const sorted = issues.sort(
      (a, b) =>
        (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
    );

    return NextResponse.json({ issues: sorted });
  } catch (err) {
    console.error(err);
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
