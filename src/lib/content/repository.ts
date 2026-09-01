import { prisma } from "@/lib/prisma";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;

export async function getContentBriefs(websiteId: string, page = 1, limit = DEFAULT_PAGE_SIZE) {
  const boundedLimit = Math.min(MAX_PAGE_SIZE, Math.max(1, limit));
  const skip = (page - 1) * boundedLimit;

  const [items, total] = await Promise.all([
    prisma.contentBrief.findMany({
      where: { websiteId },
      include: { articles: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: boundedLimit,
    }),
    prisma.contentBrief.count({ where: { websiteId } }),
  ]);

  return { items, page, limit: boundedLimit, total, totalPages: Math.max(1, Math.ceil(total / boundedLimit)) };
}

export async function getContentBriefById(id: string) {
  return prisma.contentBrief.findUnique({ where: { id }, include: { website: true, articles: true, opportunity: true } });
}

export async function getContentArticleById(id: string) {
  return prisma.contentArticle.findUnique({ where: { id }, include: { brief: { include: { website: true } } } });
}
