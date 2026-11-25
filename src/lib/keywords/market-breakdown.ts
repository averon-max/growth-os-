import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { fetchKeywordOverview } from "./dataforseo-provider";
import { isFreshFor, keywordKeepDays } from "@/lib/dataforseo/keep-days";
import { normalizeKeyword } from "./normalize";


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

  if (cached && isFreshFor(cached.fetchedAt, await keywordKeepDays())) {
    return cached.payload as unknown as MarketVolume;
  }

  // One Labs overview call (~$0.01) instead of the Google Ads volume call (~$0.075).
  const result = await fetchKeywordOverview(keyword, market.locationName, market.language);

  const value: MarketVolume = {
    market: market.code,
    label: market.label,
    volume: result?.searchVolume ?? null,
    competitionIndex: result?.competition == null ? null : Math.round(result.competition * 100),
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
