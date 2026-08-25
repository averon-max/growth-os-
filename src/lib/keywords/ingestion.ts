import { prisma } from "@/lib/prisma";
import { gscProvider } from "./gsc-provider";
import type { KeywordProvenance } from "./types";

export interface IngestionResult {
  keywordsUpserted: number;
  snapshotsUpserted: number;
}

/**
 * Fetches GSC performance data and idempotently upserts it into
 * Keyword + KeywordSnapshot. Safe to run twice with the same data:
 * keywords are upserted by [workspaceId, normalized]; snapshots are
 * upserted by [keywordId, date, device, country, source] and are
 * append-only — an existing snapshot for a given day is never
 * overwritten, only newly-absent days get inserted.
 */
export async function fetchAndUpsertKeywords(
  workspaceId: string,
  siteUrl: string,
  dateRange: { startDate: Date; endDate: Date },
  options?: { device?: string; country?: string }
): Promise<IngestionResult> {
  const retrievedAt = new Date();

  const rawRows = await gscProvider.fetchSearchPerformance({
    workspaceId,
    siteUrl,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    device: options?.device,
    country: options?.country,
  });

  const provenance: KeywordProvenance = {
    provider: "GOOGLE_SEARCH_CONSOLE",
    retrievedAt,
    dateRangeStart: dateRange.startDate,
    dateRangeEnd: dateRange.endDate,
    country: options?.country ?? "us",
    device: options?.device ?? "DESKTOP",
  };

  const pairs = gscProvider.normalizeRows(rawRows, provenance);

  let keywordsUpserted = 0;
  let snapshotsUpserted = 0;

  // Sequential on purpose: avoids unique-constraint races within a single
  // run and keeps failure/retry behavior easy to reason about. Batching
  // is a known future optimization for large sites (see NOT DONE).
  for (const { keyword, snapshot } of pairs) {
    const keywordRecord = await prisma.keyword.upsert({
      where: { workspaceId_normalized: { workspaceId, normalized: keyword.normalized } },
      create: {
        workspaceId,
        text: keyword.text,
        normalized: keyword.normalized,
        intent: keyword.intent,
        cluster: keyword.cluster,
        volume: keyword.volume,
        difficulty: keyword.difficulty,
        cpc: keyword.cpc,
      },
      update: {
        text: keyword.text,
        ...(keyword.intent ? { intent: keyword.intent } : {}),
        ...(keyword.cluster ? { cluster: keyword.cluster } : {}),
        ...(keyword.volume !== undefined ? { volume: keyword.volume } : {}),
        ...(keyword.difficulty !== undefined ? { difficulty: keyword.difficulty } : {}),
        ...(keyword.cpc !== undefined ? { cpc: keyword.cpc } : {}),
      },
    });
    keywordsUpserted += 1;

    await prisma.keywordSnapshot.upsert({
      where: {
        keywordId_date_device_country_source: {
          keywordId: keywordRecord.id,
          date: snapshot.date,
          device: snapshot.device,
          country: snapshot.country,
          source: snapshot.source,
        },
      },
      create: {
        keywordId: keywordRecord.id,
        date: snapshot.date,
        position: snapshot.position,
        clicks: snapshot.clicks,
        impressions: snapshot.impressions,
        ctr: snapshot.ctr,
        device: snapshot.device,
        country: snapshot.country,
        source: snapshot.source,
        retrievedAt: snapshot.retrievedAt,
      },
      // Historical snapshots are append-only — never overwrite an
      // existing day's data on re-ingestion.
      update: {},
    });
    snapshotsUpserted += 1;
  }

  return { keywordsUpserted, snapshotsUpserted };
}
