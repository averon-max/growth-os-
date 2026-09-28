import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { authErrorResponse, requireUser, requireWebsiteAccess } from "@/lib/auth-helpers";
import { getContentArticleById } from "@/lib/content/repository";
import { prisma } from "@/lib/prisma";

const UpdateArticleSchema = z.object({
  title: z.string().trim().min(1, "Title cannot be empty.").optional(),
  metaDescription: z.string().optional(),
  h1: z.string().trim().min(1, "H1 cannot be empty.").optional(),
  bodyMarkdown: z.string().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireUser();
    const article = await getContentArticleById(id);

    if (!article) {
      return NextResponse.json({ error: "Article not found." }, { status: 404 });
    }

    await requireWebsiteAccess(user.id, article.brief.websiteId);

    return NextResponse.json({ article });
  } catch (error) {
    const { status, body } = authErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireUser();
    const article = await getContentArticleById(id);

    if (!article) {
      return NextResponse.json({ error: "Article not found." }, { status: 404 });
    }

    await requireWebsiteAccess(user.id, article.brief.websiteId);

    if (article.status === "PUBLISHED") {
      return NextResponse.json(
        { error: "Published articles cannot be edited here. Create a new revision instead." },
        { status: 409 }
      );
    }

    if (article.status === "GENERATING") {
      return NextResponse.json({ error: "This article is still being generated." }, { status: 409 });
    }

    const parsed = UpdateArticleSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data: {
      title?: string;
      metaDescription?: string;
      h1?: string;
      bodyMarkdown?: string;
      status?: "DRAFT";
    } = {};

    if (parsed.data.title !== undefined) {
      data.title = parsed.data.title.trim();
    }
    if (parsed.data.metaDescription !== undefined) {
      data.metaDescription = parsed.data.metaDescription.trim();
    }
    if (parsed.data.h1 !== undefined) {
      data.h1 = parsed.data.h1.trim();
    }
    if (parsed.data.bodyMarkdown !== undefined) {
      data.bodyMarkdown = parsed.data.bodyMarkdown;
    }

    const hasChanges = Object.keys(data).length > 0;

    if (!hasChanges) {
      return NextResponse.json({ error: "No article changes were supplied." }, { status: 400 });
    }

    data.status = "DRAFT";

    const updated = await prisma.contentArticle.update({
      where: { id },
      data,
    });

    return NextResponse.json({ article: updated });
  } catch (error) {
    console.error("content/articles/[id] PATCH error", error);
    const { status, body } = authErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}
