import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { crawlWebsite } from "@/lib/crawler/crawler";
import { runSEORules } from "@/lib/seo-engine/rules";
import { calculateScore, getSeverityCounts } from "@/lib/seo-engine/scoring";
import { generateOpportunities } from "@/lib/opportunities";
import { requireUser, requireWebsiteAccess, authErrorResponse } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const body = await req.json();
    const { websiteId } = body as { websiteId?: string };

    if (!websiteId || typeof websiteId !== "string") {
      return NextResponse.json({ error: "websiteId is required." }, { status: 400 });
    }

    const website = await requireWebsiteAccess(user.id, websiteId);

    const analysis = await prisma.analysis.create({
      data: { websiteId, status: "RUNNING", startedAt: new Date() },
    });

    console.log(`[analysis] Started: ${analysis.id} for ${website.url}`);

    runAnalysis(analysis.id, website.url).catch(console.error);

    return NextResponse.json({ analysisId: analysis.id }, { status: 201 });
  } catch (err) {
    console.error("[analysis] POST error:", err);
    const { status, body: errBody } = authErrorResponse(err);
    return NextResponse.json(errBody, { status });
  }
}

async function runAnalysis(analysisId: string, url: string) {
  try {
    console.log(`[analysis] Crawling: ${url}`);
    const crawledPages = await crawlWebsite(url, { maxPages: 25, concurrency: 3 });
    console.log(`[analysis] Crawled ${crawledPages.length} pages`);

    for (const page of crawledPages) {
      try {
        await prisma.page.create({
          data: {
            url: page.url,
            statusCode: page.statusCode,
            title: page.parsed?.title ?? null,
            metaDescription: page.parsed?.metaDescription ?? null,
            h1: page.parsed?.h1 ?? null,
            h2s: page.parsed?.h2s ?? [],
            canonical: page.parsed?.canonical ?? null,
            robots: page.parsed?.robots ?? null,
            wordCount: page.parsed?.wordCount ?? null,
            internalLinks: page.parsed?.internalLinks?.length ?? null,
            externalLinks: page.parsed?.externalLinks?.length ?? null,
            imagesCount: page.parsed?.imagesCount ?? null,
            imagesWithoutAlt: page.parsed?.imagesWithoutAlt ?? null,
            hasJsonLd: page.parsed?.hasJsonLd ?? false,
            responseTime: page.responseTime,
            depth: page.depth,
            analysisId,
          },
        });
      } catch (err) {
        console.error(`[analysis] Failed to store page ${page.url}:`, err);
      }
    }

    const issues = runSEORules(crawledPages);
    const score = calculateScore(issues);
    const counts = getSeverityCounts(issues);
    const opportunities = generateOpportunities(issues);

    console.log(`[analysis] Issues: ${issues.length} (CRITICAL:${counts.CRITICAL} HIGH:${counts.HIGH} MEDIUM:${counts.MEDIUM} LOW:${counts.LOW})`);
    console.log(`[analysis] Score: ${score.overallScore}`);
    console.log(`[analysis] Opportunities: ${opportunities.length}`);

    for (const issue of issues) {
      try {
        await prisma.sEOIssue.create({
          data: {
            type: issue.type,
            severity: issue.severity,
            pageUrl: issue.pageUrl,
            description: issue.description,
            evidence: issue.evidence,
            recommendation: issue.recommendation,
            analysisId,
          },
        });
      } catch (err) {
        console.error(`[analysis] Failed to store issue:`, err);
      }
    }

    for (const opp of opportunities) {
      try {
        await prisma.opportunity.create({
          data: {
            title: opp.title,
            type: opp.type,
            priority: opp.priority,
            score: opp.score,
            reason: opp.reason,
            recommendation: opp.recommendation,
            affectedPages: opp.affectedPages,
            analysisId,
          },
        });
      } catch (err) {
        console.error(`[analysis] Failed to store opportunity:`, err);
      }
    }

    await prisma.analysis.update({
      where: { id: analysisId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        overallScore: score.overallScore,
        technicalScore: score.technicalScore,
        contentScore: score.contentScore,
        structureScore: score.structureScore,
        indexabilityScore: score.indexabilityScore,
        pagesCount: crawledPages.length,
      },
    });

    console.log(`[analysis] Completed: ${analysisId}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[analysis] Failed: ${analysisId}`, err);
    await prisma.analysis.update({
      where: { id: analysisId },
      data: { status: "FAILED", errorMessage: message },
    });
  }
}
