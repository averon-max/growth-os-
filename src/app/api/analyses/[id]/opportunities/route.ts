import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireAnalysisAccess, authErrorResponse } from "@/lib/auth-helpers";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireUser();

    await requireAnalysisAccess(user.id, id);

    const opportunities = await prisma.opportunity.findMany({
      where: { analysisId: id },
      orderBy: { score: "desc" },
    });
    return NextResponse.json({ opportunities });
  } catch (err) {
    console.error(err);
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
