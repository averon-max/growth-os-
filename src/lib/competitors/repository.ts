import { prisma } from "@/lib/prisma";

export async function addCompetitor(websiteId: string, domain: string, name?: string) {
  return prisma.competitor.upsert({
    where: { websiteId_domain: { websiteId, domain } },
    create: { websiteId, domain, name },
    update: { name },
  });
}

export async function listCompetitors(websiteId: string) {
  return prisma.competitor.findMany({
    where: { websiteId },
    orderBy: { addedAt: "asc" },
    include: {
      snapshots: {
        orderBy: { capturedAt: "desc" },
        take: 1,
      },
    },
  });
}

export async function getCompetitor(competitorId: string) {
  return prisma.competitor.findUnique({
    where: { id: competitorId },
    include: { website: { include: { business: true } } },
  });
}

export interface CreateSnapshotInput {
  competitorId: string;
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  wordCount: number | null;
  imagesCount: number | null;
  imagesWithoutAlt: number | null;
  hasJsonLd: boolean | null;
  rankedKeywordsCount: number | null;
  topKeywords: unknown;
  gapKeywords: unknown;
  fromCache: boolean;
}

export async function createSnapshot(input: CreateSnapshotInput) {
  return prisma.competitorSnapshot.create({ data: input as never });
}
