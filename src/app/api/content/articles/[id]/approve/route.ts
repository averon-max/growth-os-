import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireWebsiteAccess, authErrorResponse } from "@/lib/auth-helpers";
import { getContentArticleById } from "@/lib/content/repository";
import { prisma } from "@/lib/prisma";
import { requireArticleReleasable, ReleaseBlockedError } from "@/lib/writer/release";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser();
    const article = await getContentArticleById(id);
    if (article === null) return NextResponse.json({ error: "Article not found." }, { status: 404 });
    await requireWebsiteAccess(user.id, article.brief.websiteId);
    if (article.status === "APPROVED") return NextResponse.json({ article });

    await requireArticleReleasable(id);
    const updated = await prisma.contentArticle.update({ where: { id }, data: { status: "APPROVED", publishError: null } });
    return NextResponse.json({ article: updated });
  } catch (err) {
    if (err instanceof ReleaseBlockedError) {
      return NextResponse.json({ error: "Article is not ready for approval.", reasons: err.reasons }, { status: 409 });
    }
    console.error("content/articles/[id]/approve POST error", err);
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
