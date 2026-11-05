import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireWebsiteAccess, authErrorResponse } from "@/lib/auth-helpers";
import { getContentArticleById } from "@/lib/content/repository";
import { prisma } from "@/lib/prisma";
import { getCMSConnection } from "@/lib/cms/repository";
import { getProviderForType } from "@/lib/cms/registry";
import { assertOutcomeActionExecutable, markOutcomeActionExecuted } from "@/lib/keywords/outcome-service";
import { requireArticleReleasable, ReleaseBlockedError } from "@/lib/writer/release";

type OutcomeLink = { status: "EXECUTED" | "NOT_EXECUTED" | "FAILED_TO_RECORD"; actionId: string } | null;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireUser();
    const body = (await req.json().catch(() => ({}))) as { outcomeActionId?: unknown };

    const article = await getContentArticleById(id);
    if (article === null) return NextResponse.json({ error: "Article not found." }, { status: 404 });
    const website = await requireWebsiteAccess(user.id, article.brief.websiteId);

    const actionId = (typeof body.outcomeActionId === "string" ? body.outcomeActionId.trim() : "") || article.brief.outcomeActionId?.trim() || "";
    const actionScope = {
      workspaceId: website.business.workspaceId,
      websiteId: article.brief.websiteId,
      actionId,
      executionKind: "CONTENT_PUBLISH" as const,
      primaryKeyword: article.brief.primaryKeyword,
    };
    if (actionId) {
      try {
        await assertOutcomeActionExecutable(actionScope);
      } catch {
        return NextResponse.json({ error: "This Growth OS action cannot be linked to this content execution." }, { status: 409 });
      }
    }

    const connection = await getCMSConnection(article.brief.websiteId);
    if (connection === null) return NextResponse.json({ error: "CMS is not connected for this website. Connect it in CMS settings." }, { status: 409 });

    const ready = await requireArticleReleasable(id);
    const result = await getProviderForType(connection.cmsType).publishContent(ready.brief.websiteId, {
      title: ready.title,
      metaDescription: ready.metaDescription,
      h1: ready.h1,
      bodyMarkdown: ready.bodyMarkdown,
    });
    const ok = result.status === "SUCCESS";
    const updated = await prisma.contentArticle.update({
      where: { id },
      data: { status: ok ? "PUBLISHED" : "PUBLISH_FAILED", publishedUrl: result.publishedUrl, publishedAt: ok ? new Date() : null, publishError: result.errorMessage },
    });

    let outcomeLink: OutcomeLink = null;
    if (actionId) {
      if (ok) {
        try {
          await markOutcomeActionExecuted({ ...actionScope, contentArticleId: updated.id });
          outcomeLink = { status: "EXECUTED", actionId };
        } catch (linkError) {
          console.error("content publish outcome link error", linkError);
          outcomeLink = { status: "FAILED_TO_RECORD", actionId };
        }
      } else {
        outcomeLink = { status: "NOT_EXECUTED", actionId };
      }
    }
    return NextResponse.json(outcomeLink ? { article: updated, outcomeLink } : { article: updated });
  } catch (err) {
    if (err instanceof ReleaseBlockedError) {
      return NextResponse.json({ error: "Article is not ready for publication.", reasons: err.reasons }, { status: 409 });
    }
    console.error("content/articles/[id]/publish POST error", err);
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
