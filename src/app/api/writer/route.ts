import { asContent } from "@/lib/billing/data-budget";
import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireWebsiteAccess, authErrorResponse } from "@/lib/auth-helpers";
import { runWriter } from "@/lib/writer/orchestrator";
import { extractArticleHeadings } from "@/lib/content/article-analyzer";
import type { ArticleCategory } from "@/lib/writer/templates";
import { prisma } from "@/lib/prisma";
import { cleanExtraKeywords, keywordCoverage } from "@/lib/writer/extra-keywords";
import { bestPlanForUser } from "@/lib/billing/api-gate";
import { PLANS } from "@/lib/billing/plans";
import { articleKey, countUsage, usageCount } from "@/lib/billing/usage";

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
    const seedKeyword = typeof body.keyword === "string" ? body.keyword.trim() : typeof body.seedKeyword === "string" ? body.seedKeyword.trim() : "";
    const exactKeyword = body.exactKeyword === true;
    const websiteId = typeof body.websiteId === "string" ? body.websiteId.trim() : "";
    const extraKeywords = cleanExtraKeywords(body.keywords, seedKeyword);
    // Never read or write another account's website: its articles feed internal links and the new article is saved into it.
    if (websiteId) {
      try {
        await requireWebsiteAccess(userId, websiteId);
      } catch (error) {
        const denied = authErrorResponse(error);
        return NextResponse.json(denied.body, { status: denied.status });
      }
    }

    const allowedCategories: readonly ArticleCategory[] = [
      "definition","how-it-works","how-to","troubleshooting","comparison",
      "best-options","alternatives","review","pricing","benefits-risks",
      "beginners-guide","checklist","case-study","statistics","industry-analysis",
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

    // Monthly AI draft allowance of the plan. Checked before any paid call; counted only after a draft is made.
    const plan = await bestPlanForUser(userId);
    const allowance = PLANS[plan].limits.articlesPerMonth;
    if ((await usageCount(articleKey(userId))) >= allowance) {
      return NextResponse.json(
        { error: `You've used all ${allowance} AI drafts included this month. More are available on a higher plan or next month.`, upgrade: "/dashboard/settings/billing" },
        { status: 402 }
      );
    }

    // Fetch internal links from existing articles
    const internalLinks = websiteId
      ? (await prisma.contentBrief.findMany({
          where: {
            websiteId,
            NOT: { primaryKeyword: seedKeyword },
            articles: { some: {} },
          },
          select: {
            primaryKeyword: true,
            articles: { select: { h1: true, publishedUrl: true }, take: 1 },
          },
          orderBy: { createdAt: "desc" },
          take: 20,
        }))
          .map((b) => ({
            anchor: b.articles[0]?.h1 ?? b.primaryKeyword,
            url: b.articles[0]?.publishedUrl ?? "",
            topic: b.primaryKeyword,
          }))
      : [];

    console.log("[WRITER] internalLinks count:", internalLinks.length, JSON.stringify(internalLinks.slice(0,2)));
    // Counted for the workspace, but never cut off halfway by the daily data allowance (see asContent).
    const result = await asContent(() => runWriter({
      seedKeyword,
      category,
      exactKeyword,
      dataForSeoLogin,
      dataForSeoPassword,
      openAiKey,
      internalLinks,
      extraKeywords,
    }));

    const generatedBodyMarkdown =
      result.article?.bodyMarkdown ?? "";

    if (
      extractArticleHeadings(generatedBodyMarkdown).some(
        (heading) => heading.level === 1
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Writer generated an H1 inside bodyMarkdown. The article was not saved.",
        },
        { status: 502 }
      );
    }

    await countUsage(articleKey(userId)).catch((e) => console.error("[writer] usage count failed", e));

    // Save to DB if websiteId provided
    let briefId: string | null = null;
    if (websiteId) {
      try {
        const brief = await prisma.contentBrief.create({
          data: {
            websiteId,
            topic: seedKeyword,
            searchIntent: category,
            primaryKeyword: result.article?.keyword ?? seedKeyword,
            secondaryKeywords: extraKeywords,
            outline: {},
            status: "DRAFT",
            generatedBy: "gpt-5.6-luna",
            articles: {
              create: {
                title: result.article?.title ?? "",
                metaDescription: result.article?.metaDescription ?? "",
                h1: result.article?.h1 ?? "",
                bodyMarkdown: result.article?.bodyMarkdown ?? "",
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

    return NextResponse.json({ title: result.article.title, metaDescription: result.article.metaDescription, body: result.article.body, wordCount: result.article.totalWordCount, keyword: result.article.keyword, briefId, keywords: keywordCoverage(generatedBodyMarkdown, extraKeywords) });
  } catch {
    return NextResponse.json({ error: "Writer generation failed" }, { status: 500 });
  }
}
