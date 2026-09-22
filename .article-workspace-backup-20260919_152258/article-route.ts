import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireWebsiteAccess, authErrorResponse } from "@/lib/auth-helpers";
import { getContentArticleById } from "@/lib/content/repository";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser();

    const article = await getContentArticleById(id);
    if (!article) {
      return NextResponse.json({ error: "Article not found." }, { status: 404 });
    }

    await requireWebsiteAccess(user.id, article.brief.websiteId);

    return NextResponse.json({ article });
  } catch (err) {
    console.error("content/articles/[id] GET error", err);
    const { status, body: errBody } = authErrorResponse(err);
    return NextResponse.json(errBody, { status });
  }
}
