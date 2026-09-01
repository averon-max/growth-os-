import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { ContentGenerator } from "./generator";
import type { CMSProvider } from "@/lib/cms/provider";
import { ContentGenerationError } from "./generator";
import type { ContentBriefInput } from "./types";

export interface CreateBriefInput {
  websiteId: string;
  opportunityId?: string;
  topic: string;
  reason: string;
  recommendation: string;
  businessName: string;
  websiteUrl: string;
}

export async function createContentBrief(generator: ContentGenerator, input: CreateBriefInput) {
  const briefInput: ContentBriefInput = {
    topic: input.topic,
    reason: input.reason,
    recommendation: input.recommendation,
    businessName: input.businessName,
    websiteUrl: input.websiteUrl,
  };

  const generated = await generator.generateBrief(briefInput);

  return prisma.contentBrief.create({
    data: {
      websiteId: input.websiteId,
      opportunityId: input.opportunityId,
      topic: input.topic,
      searchIntent: generated.searchIntent,
      primaryKeyword: generated.primaryKeyword,
      secondaryKeywords: generated.secondaryKeywords,
      outline: generated.outline as unknown as Prisma.InputJsonValue,
      status: "READY",
      generatedBy: generator.modelName,
    },
  });
}

export async function generateArticleFromBrief(generator: ContentGenerator, briefId: string) {
  const brief = await prisma.contentBrief.findUnique({ where: { id: briefId }, include: { website: { include: { business: true } } } });
  if (!brief) {
    throw new Error("Content brief not found");
  }

  const pendingArticle = await prisma.contentArticle.create({
    data: {
      briefId: brief.id,
      title: "",
      metaDescription: "",
      h1: "",
      bodyMarkdown: "",
      status: "GENERATING",
      generatedBy: generator.modelName,
    },
  });

  try {
    const generated = await generator.generateArticle({
      topic: brief.topic,
      reason: "",
      recommendation: "",
      businessName: brief.website.business.name,
      websiteUrl: brief.website.url,
      searchIntent: brief.searchIntent,
      primaryKeyword: brief.primaryKeyword,
      secondaryKeywords: brief.secondaryKeywords,
      outline: brief.outline as { heading: string; level: 2 | 3; summary: string }[],
    });

    return prisma.contentArticle.update({
      where: { id: pendingArticle.id },
      data: {
        title: generated.title,
        metaDescription: generated.metaDescription,
        h1: generated.h1,
        bodyMarkdown: generated.bodyMarkdown,
        status: "DRAFT",
      },
    });
  } catch (err) {
    const message = err instanceof ContentGenerationError ? err.message : "Article generation failed";
    return prisma.contentArticle.update({
      where: { id: pendingArticle.id },
      data: { status: "REJECTED", publishError: message },
    });
  }
}

export async function approveArticle(articleId: string) {
  return prisma.contentArticle.update({
    where: { id: articleId },
    data: { status: "APPROVED" },
  });
}

export async function publishArticle(provider: CMSProvider, articleId: string) {
  const article = await prisma.contentArticle.findUnique({ where: { id: articleId }, include: { brief: true } });
  if (!article) {
    throw new Error("Article not found");
  }
  if (article.status !== "APPROVED") {
    throw new Error("Only approved articles can be published");
  }

  const result = await provider.publishContent(article.brief.websiteId, {
    title: article.title,
    metaDescription: article.metaDescription,
    h1: article.h1,
    bodyMarkdown: article.bodyMarkdown,
  });

  return prisma.contentArticle.update({
    where: { id: articleId },
    data: {
      status: result.status === "SUCCESS" ? "PUBLISHED" : "PUBLISH_FAILED",
      publishedUrl: result.publishedUrl,
      publishedAt: result.status === "SUCCESS" ? new Date() : null,
      publishError: result.errorMessage,
    },
  });
}
