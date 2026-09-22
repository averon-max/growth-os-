import { prisma } from "@/lib/prisma";
import {
  fetchSearchVolume,
  fetchKeywordDifficulty,
} from "./dataforseo-provider";

const BATCH_SIZE = 1000;

export interface UpdateKeywordVolumesResult {
  updated: number;
  skipped: number;
  requested: number;
}

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

export async function updateKeywordVolumes(
  workspaceId: string,
  forceRefresh = false,
  market = "US",
  language = "English",
): Promise<UpdateKeywordVolumesResult> {
  const locationName =
    market === "CA" ? "Canada" :
    market === "GB" ? "United Kingdom" :
    market === "AU" ? "Australia" :
    "United States";

  const keywords = await prisma.keyword.findMany({
    where: {
      workspaceId,
      ...(forceRefresh ? {} : {
        marketMetrics: {
          none: { market, language },
        },
      }),
    },
    select: { id: true, text: true },
  });

  if (keywords.length === 0) {
    return { updated: 0, skipped: 0, requested: 0 };
  }

  const batches = chunk(keywords, BATCH_SIZE);
  let updated = 0;

  for (const batch of batches) {
    const texts = batch.map((k) => k.text);

    const [volumeResults, difficultyResults] = await Promise.all([
      fetchSearchVolume(texts, locationName, language),
      fetchKeywordDifficulty(texts, locationName, language),
    ]);

    const volumes = new Map(volumeResults.map((r) => [r.keyword, r]));
    const difficulties = new Map(difficultyResults.map((r) => [r.keyword, r]));

    for (const kw of batch) {
      const volume = volumes.get(kw.text);
      const difficulty = difficulties.get(kw.text);

      if (!volume && !difficulty) continue;

      await prisma.keywordMarketMetric.upsert({
        where: {
          keywordId_market_language: {
            keywordId: kw.id,
            market,
            language,
          },
        },
        create: {
          keywordId: kw.id,
          market,
          language,
          volume: volume?.searchVolume ?? null,
          difficulty: difficulty?.keywordDifficulty ?? null,
          cpc: volume?.cpc ?? null,
          competitionIndex: volume?.competitionIndex ?? null,
        },
        update: {
          volume: volume?.searchVolume ?? null,
          difficulty: difficulty?.keywordDifficulty ?? null,
          cpc: volume?.cpc ?? null,
          competitionIndex: volume?.competitionIndex ?? null,
        },
      });

      updated++;
    }
  }

  return {
    updated,
    skipped: keywords.length - updated,
    requested: keywords.length,
  };
}
