import { prisma } from "@/lib/prisma";
import type { AudienceProvider } from "./provider";
import type { FetchAudienceParams } from "./types";

export async function fetchAndUpsertAudience(
  provider: AudienceProvider,
  params: FetchAudienceParams
) {
  const rawRows = await provider.fetchAudienceData(params);
  const normalized = provider.normalizeSegments(rawRows);

  const result = { segmentsUpserted: 0, snapshotsCreated: 0, snapshotsSkipped: 0 };

  for (const seg of normalized) {
    const segment = await prisma.audienceSegment.upsert({
      where: { websiteId_name: { websiteId: params.websiteId, name: seg.name } },
      create: { websiteId: params.websiteId, name: seg.name, criteria: seg.criteria },
      update: { criteria: seg.criteria },
    });
    result.segmentsUpserted++;

    for (const row of seg.rows) {
      const date = new Date(row.date);
      const existing = await prisma.audienceSnapshot.findUnique({
        where: {
          segmentId_date_source: { segmentId: segment.id, date, source: "GOOGLE_ANALYTICS_4" },
        },
      });

      if (existing) {
        result.snapshotsSkipped++;
        continue;
      }

      await prisma.audienceSnapshot.create({
        data: { segmentId: segment.id, date, userCount: row.userCount, source: "GOOGLE_ANALYTICS_4" },
      });
      result.snapshotsCreated++;
    }
  }

  return result;
}
