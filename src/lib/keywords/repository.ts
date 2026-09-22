import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { KeywordIntent, ProviderType } from "./types";

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;
const SNAPSHOT_LOOKBACK_MAX_DAYS = 365;

export type KeywordSortField = "text" | "position" | "volume" | "difficulty" | "cpc" | "impressions" | "clicks";
export type SortDir = "asc" | "desc";

export interface GetKeywordsOptions {
  page?: number;
  limit?: number;
  filter?: string;
  intent?: KeywordIntent;
  minPosition?: number;
  maxPosition?: number;
  market?: string;
  language?: string;
  sortBy?: KeywordSortField;
  sortDir?: SortDir;
  minVolume?: number;
  maxVolume?: number;
  minKd?: number;
  maxKd?: number;
  hasVolume?: boolean;
  minCpc?: number;
  maxCpc?: number;
  minCompetition?: number;
  maxCompetition?: number;
}

export async function getKeywords(workspaceId: string, options: GetKeywordsOptions = {}) {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, options.limit ?? DEFAULT_PAGE_SIZE));
  const market = options.market ?? "US";
  const language = options.language ?? "English";
  const sortBy = options.sortBy ?? "text";
  const sortDir = options.sortDir ?? "asc";

  const hasPositionFilter = options.minPosition !== undefined || options.maxPosition !== undefined;
  const hasMarketFilter =
    options.minVolume !== undefined ||
    options.maxVolume !== undefined ||
    options.minKd !== undefined ||
    options.maxKd !== undefined ||
    options.hasVolume ||
    options.minCpc !== undefined ||
    options.maxCpc !== undefined;

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
    ...(hasMarketFilter
      ? {
          marketMetrics: {
            some: {
              market,
              language,
              ...(options.hasVolume ? { volume: { not: null } } : {}),
              ...(options.minVolume !== undefined || options.maxVolume !== undefined
                ? {
                    volume: {
                      ...(options.minVolume !== undefined ? { gte: options.minVolume } : {}),
                      ...(options.maxVolume !== undefined ? { lte: options.maxVolume } : {}),
                    },
                  }
                : {}),
              ...(options.minKd !== undefined || options.maxKd !== undefined
                ? {
                    difficulty: {
                      ...(options.minKd !== undefined ? { gte: options.minKd } : {}),
                      ...(options.maxKd !== undefined ? { lte: options.maxKd } : {}),
                    },
                  }
                : {}),
              ...(options.minCpc !== undefined || options.maxCpc !== undefined
                ? {
                    cpc: {
                      ...(options.minCpc !== undefined ? { gte: options.minCpc } : {}),
                      ...(options.maxCpc !== undefined ? { lte: options.maxCpc } : {}),
                    },
                  }
                : {}),
            },
          },
        }
      : {}),
  };

  // For text/intent sorting we can use Prisma orderBy directly.
  // For metric-based sorting (volume, difficulty, cpc, position, impressions, clicks)
  // we fetch all matching IDs with their sort value, sort in JS, then paginate.
  // This avoids complex raw SQL while keeping the API clean.
  const needsMetricSort = ["volume", "difficulty", "cpc", "position", "impressions", "clicks"].includes(sortBy);

  if (needsMetricSort) {
    // Fetch all matching keywords with their metric + snapshot for sorting
    const all = await prisma.keyword.findMany({
      where,
      select: {
        id: true,
        text: true,
        intent: true,
        snapshots: { orderBy: { date: "desc" }, take: 1, select: { position: true, impressions: true, clicks: true, ctr: true } },
        marketMetrics: { where: { market, language }, take: 1, select: { volume: true, difficulty: true, cpc: true, competitionIndex: true } },
      },
    });

    const getValue = (kw: typeof all[0]): number => {
      const snap = kw.snapshots[0];
      const m = kw.marketMetrics[0];
      if (sortBy === "volume") return m?.volume ?? -1;
      if (sortBy === "difficulty") return m?.difficulty ?? -1;
      if (sortBy === "cpc") return m?.cpc ? Number(m.cpc) : -1;
      if (sortBy === "position") return snap?.position ? Number(snap.position) : 9999;
      if (sortBy === "impressions") return snap?.impressions ?? -1;
      if (sortBy === "clicks") return snap?.clicks ?? -1;
      return 0;
    };

    all.sort((a, b) => {
      const av = getValue(a);
      const bv = getValue(b);
      // position: lower is better, so asc = best first means smallest number first
      // but for volume/clicks/impressions: desc = highest first
      return sortDir === "asc" ? av - bv : bv - av;
    });

    const total = all.length;
    const sliced = all.slice((page - 1) * limit, page * limit);

    // Now fetch full rows for the sliced IDs to get complete data
    const ids = sliced.map((k) => k.id);
    const items = await prisma.keyword.findMany({
      where: { id: { in: ids } },
      include: {
        snapshots: { orderBy: { date: "desc" }, take: 1 },
        marketMetrics: { where: { market, language }, take: 1 },
      },
    });

    // Preserve sort order
    const itemMap = new Map(items.map((i) => [i.id, i]));
    const ordered = ids.map((id) => itemMap.get(id)).filter(Boolean) as typeof items;

    return { items: ordered, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  // Text/default sort — use Prisma orderBy
  const orderBy: Prisma.KeywordOrderByWithRelationInput =
    sortBy === "text" ? { text: sortDir } : { text: "asc" };

  const [items, total] = await Promise.all([
    prisma.keyword.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        snapshots: { orderBy: { date: "desc" }, take: 1 },
        marketMetrics: { where: { market, language }, take: 1 },
      },
    }),
    prisma.keyword.count({ where }),
  ]);

  return { items, page, limit, total, totalPages: Math.ceil(total / limit) };
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
