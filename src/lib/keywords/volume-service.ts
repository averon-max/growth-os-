import { prisma } from "@/lib/prisma";
import { fetchSearchVolume } from "./dataforseo-provider";

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

export async function updateKeywordVolumes(workspaceId: string, forceRefresh = false): Promise<UpdateKeywordVolumesResult> {
  const keywords = await prisma.keyword.findMany({
    where: {
      workspaceId,
      ...(forceRefresh ? {} : { volume: null }),
    },
    select: { id: true, text: true },
  });

  if (keywords.length === 0) {
    return { updated: 0, skipped: 0, requested: 0 };
  }

  const batches = chunk(keywords, BATCH_SIZE);
  let updated = 0;

  for (const batch of batches) {
    const results = await fetchSearchVolume(batch.map((k) => k.text));
    const byKeyword = new Map(results.map((r) => [r.keyword, r]));

    for (const kw of batch) {
      const result = byKeyword.get(kw.text);
      if (!result) continue;

      await prisma.keyword.update({
        where: { id: kw.id },
        data: {
          volume: result.searchVolume,
          difficulty: result.competitionIndex,
          cpc: result.cpc,
        },
      });
      updated++;
    }
  }

  return { updated, skipped: keywords.length - updated, requested: keywords.length };
}
