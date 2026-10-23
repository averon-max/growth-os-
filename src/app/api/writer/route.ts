import { NextRequest, NextResponse } from "next/server";
import { requireUser, authErrorResponse } from "@/lib/auth-helpers";
import { runWriter } from "@/lib/writer/orchestrator";
import type { ArticleCategory } from "@/lib/writer/templates";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  let userId: string;
  try {
    const user = await requireUser();
    userId = user.id;
  } catch (error) {
    const authError = authErrorResponse(error);
    return NextResponse.json(authError.body, { status: authError.status });
  }

  try {
    let payload: unknown;
    try {
      payload = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const body = payload as Record<string, unknown>;
    const seedKeyword = typeof body.seedKeyword === "string" ? body.seedKeyword.trim() : "";
    const websiteId = typeof body.websiteId === "string" ? body.websiteId.trim() : "";

    const allowedCategories: readonly ArticleCategory[] = [
      "informational", "comparison", "listicle", "how-to", "review", "landing",
    ];

    if (
      !seedKeyword || seedKeyword.length > 200 ||
      typeof body.category !== "string" ||
      !allowedCategories.includes(body.category as ArticleCategory)
    ) {
      return NextResponse.json(
        { error: "A valid seedKeyword and category are required" },
        { status: 400 }
      );
    }

    const category = body.category as ArticleCategory;
    const dataForSeoLogin = process.env.DATAFORSEO_LOGIN;
    const dataForSeoPassword = process.env.DATAFORSEO_PASSWORD;
    const openAiKey = process.env.OPENAI_API_KEY;

    if (!dataForSeoLogin || !dataForSeoPassword || !openAiKey) {
      return NextResponse.json({ error: "Writer is not configured" }, { status: 503 });
    }

    const result = await runWriter({
      seedKeyword,
      category,
      dataForSeoLogin,
      dataForSeoPassword,
      openAiKey,
    });

    // Save to DB if websiteId provided
    let briefId: string | null = null;
    if (websiteId) {
      try {
        const brief = await prisma.contentBrief.create({
          data: {
            websiteId,
            topic: seedKeyword,
            searchIntent: category,
            primaryKeyword: result.keyword,
            secondaryKeywords: [],
            outline: {},
            status: "DRAFT",
            generatedBy: "gpt-5.6-luna",
            articles: {
              create: {
                title: result.title,
                metaDescription: result.metaDescription,
                h1: result.title,
                bodyMarkdown: result.body,
                status: "DRAFT",
                generatedBy: "gpt-5.6-luna",
              },
            },
          },
          select: { id: true },
        });
        briefId = brief.id;
      } catch (dbErr) {
        console.error("[writer] DB save failed:", dbErr);
        // Don't fail the request if DB save fails
      }
    }

    return NextResponse.json({ ...result, briefId });
  } catch {
    return NextResponse.json({ error: "Writer generation failed" }, { status: 500 });
  }
}
