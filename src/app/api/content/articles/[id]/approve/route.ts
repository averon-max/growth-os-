import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireWebsiteAccess, authErrorResponse } from "@/lib/auth-helpers";
import { getContentArticleById } from "@/lib/content/repository";
import { approveArticle } from "@/lib/content/service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser();

    const article = await getContentArticleById(id);
    if (!article) {
      return NextResponse.json({ error: "Article not found." }, { status: 404 });
    }

    await requireWebsiteAccess(user.id, article.brief.websiteId);

    if (article.status !== "DRAFT" && article.status !== "IN_REVIEW") {
      return NextResponse.json({ error: `Cannot approve an article with status ${article.status}.` }, { status: 409 });
    }

    const updated = await approveArticle(id);
    return NextResponse.json({ article: updated });
  } catch (err) {
    console.error("content/articles/[id]/approve POST error", err);
    const { status, body: errBody } = authErrorResponse(err);
    return NextResponse.json(errBody, { status });
  }
}
