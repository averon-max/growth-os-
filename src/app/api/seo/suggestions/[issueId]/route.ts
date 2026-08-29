import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireWebsiteAccess, authErrorResponse } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { generateSuggestion } from "@/lib/seo/suggestions";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ issueId: string }> }
) {
  try {
    const { issueId } = await params;
    const user = await requireUser();

    const issue = await prisma.sEOIssue.findUnique({
      where: { id: issueId },
      include: { analysis: { include: { website: true } } },
    });

    if (!issue) {
      return NextResponse.json({ error: "Issue not found." }, { status: 404 });
    }

    await requireWebsiteAccess(user.id, issue.analysis.websiteId);

    const suggestion = generateSuggestion(issue);
    if (!suggestion) {
      return NextResponse.json(
        { error: "No automated suggestion available for this issue type." },
        { status: 422 }
      );
    }

    return NextResponse.json({ issueId, suggestion });
  } catch (err) {
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
