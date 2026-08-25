import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireAnalysisAccess, authErrorResponse } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireUser();

    await requireAnalysisAccess(user.id, id);

    const analysis = await prisma.analysis.findUnique({
      where: { id },
      include: {
        website: { include: { business: true } },
        _count: {
          select: { pages: true, issues: true, opportunities: true },
        },
      },
    });

    if (!analysis) {
      return NextResponse.json({ error: "Analysis not found." }, { status: 404 });
    }

    return NextResponse.json({ analysis });
  } catch (err) {
    console.error(err);
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
