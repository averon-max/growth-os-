import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { fetchSearchVolume } from "./dataforseo-provider";
import { normalizeKeyword } from "./normalize";

const CACHE_TTL_DAYS = 30;

export const MARKETS = [
  {
    code: "US",
    label: "United States",
    locationName: "United States",
    language: "English",
  },
  {
    code: "CA",
    label: "Canada",
    locationName: "Canada",
    language: "English",
  },
  {
    code: "GB",
    label: "United Kingdom",
    locationName: "United Kingdom",
    language: "English",
  },
  {
    code: "AU",
    label: "Australia",
    locationName: "Australia",
    language: "English",
  },
] as const;

export interface MarketVolume {
  market: string;
  label: string;
  volume: number | null;
  competitionIndex: number | null;
  cpc: number | null;
}

function isFresh(fetchedAt: Date): boolean {
  return Date.now() - fetchedAt.getTime() < CACHE_TTL_DAYS * 86400000;
}

async function getOneMarket(
  keyword: string,
  normalized: string,
  market: (typeof MARKETS)[number],
): Promise<MarketVolume> {
  const source = `MARKET_BREAKDOWN_${market.code}`;

  const cached = await prisma.keywordSuggestionCache.findUnique({
    where: {
      normalized_source: {
        normalized,
        source,
      },
    },
  });

  if (cached && isFresh(cached.fetchedAt)) {
    return cached.payload as unknown as MarketVolume;
  }

  const [result] = await fetchSearchVolume(
    [keyword],
    market.locationName,
    market.language,
  );

  const value: MarketVolume = {
    market: market.code,
    label: market.label,
    volume: result?.searchVolume ?? null,
    competitionIndex: result?.competitionIndex ?? null,
    cpc: result?.cpc ?? null,
  };

  await prisma.keywordSuggestionCache.upsert({
    where: {
      normalized_source: {
        normalized,
        source,
      },
    },
    create: {
      normalized,
      source,
      payload: value as unknown as Prisma.InputJsonValue,
    },
    update: {
      payload: value as unknown as Prisma.InputJsonValue,
      fetchedAt: new Date(),
    },
  });

  return value;
}

export async function getMarketBreakdown(
  keyword: string,
): Promise<MarketVolume[]> {
  const normalized = normalizeKeyword(keyword);

  return Promise.all(
    MARKETS.map(market =>
      getOneMarket(keyword, normalized, market),
    ),
  );
}
