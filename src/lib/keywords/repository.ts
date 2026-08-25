import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { KeywordIntent, ProviderType } from "./types";

const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const SNAPSHOT_LOOKBACK_MAX_DAYS = 365;

export interface GetKeywordsOptions {
  page?: number;
  limit?: number;
  filter?: string;
  intent?: KeywordIntent;
  minPosition?: number;
  maxPosition?: number;
}

export async function getKeywords(workspaceId: string, options: GetKeywordsOptions = {}) {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, options.limit ?? DEFAULT_PAGE_SIZE));

  const hasPositionFilter = options.minPosition !== undefined || options.maxPosition !== undefined;

  const where: Prisma.KeywordWhereInput = {
    workspaceId,
    ...(options.filter ? { text: { contains: options.filter, mode: "insensitive" } } : {}),
    ...(options.intent ? { intent: options.intent } : {}),
    ...(hasPositionFilter
      ? {
          snapshots: {
            some: {
              position: {
                ...(options.minPosition !== undefined ? { gte: options.minPosition } : {}),
                ...(options.maxPosition !== undefined ? { lte: options.maxPosition } : {}),
              },
            },
          },
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.keyword.findMany({
      where,
      orderBy: { text: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.keyword.count({ where }),
  ]);

  return {
    items,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getKeywordSnapshots(keywordId: string, days: number) {
  const boundedDays = Math.min(SNAPSHOT_LOOKBACK_MAX_DAYS, Math.max(1, days));
  const since = new Date();
  since.setDate(since.getDate() - boundedDays);

  return prisma.keywordSnapshot.findMany({
    where: { keywordId, date: { gte: since } },
    orderBy: { date: "desc" },
  });
}

export async function getProviderConnection(workspaceId: string, provider: ProviderType) {
  return prisma.providerConnection.findUnique({
    where: { workspaceId_provider: { workspaceId, provider } },
  });
}
