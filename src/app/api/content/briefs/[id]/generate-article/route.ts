import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireWebsiteAccess, authErrorResponse } from "@/lib/auth-helpers";
import { getContentBriefById } from "@/lib/content/repository";
import { generateArticleFromBrief } from "@/lib/content/service";
import { geminiGenerator } from "@/lib/content/gemini-generator";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser();

    const brief = await getContentBriefById(id);
    if (!brief) {
      return NextResponse.json({ error: "Content brief not found." }, { status: 404 });
    }

    await requireWebsiteAccess(user.id, brief.websiteId);

    const article = await generateArticleFromBrief(geminiGenerator, id);
    return NextResponse.json({ article }, { status: 201 });
  } catch (err) {
    console.error("content/briefs/[id]/generate-article POST error", err);
    const { status, body: errBody } = authErrorResponse(err);
    return NextResponse.json(errBody, { status });
  }
}
