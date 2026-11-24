import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  fetchCloudflareTraffic,
  type SkippedDay,
} from "./client";

import {
  fetchCloudflarePageTraffic,
  type PageTrafficRow,
} from "./page-traffic";
import {
  getCloudflareConnectionWithToken,
} from "./connection-service";

interface SyncParams {
  websiteId: string;
  since: string;
  until: string;
}

export interface SyncResult {
  connectionId: string;
  requestedDays: number;
  syncedDays: number;
  detailDays: number;
  skippedDays: SkippedDay[];
  availableFrom: string | null;
  availableTo: string | null;
}

function utcDate(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

/**
 * Saves page rows 500 at a time in one statement each, instead of one database round trip per row
 * (a month of a busy site is thousands of rows, which made "Sync now" crawl). Falls back to one row
 * at a time if the batch statement is ever rejected, so a sync never loses data.
 */
async function savePageRows(connectionId: string, rows: PageTrafficRow[]): Promise<void> {
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    try {
      await prisma.$executeRaw`
        INSERT INTO "PageTrafficSnapshot"
          ("id", "connectionId", "date", "path", "totalRequests", "visits", "verifiedBotRequests", "unclassifiedRequests", "botCategoryBreakdown", "createdAt", "updatedAt")
        SELECT r.id, ${connectionId}, r.date, r.path, r.total, r.visits, r.verified, r.unclassified, r.bots, NOW(), NOW()
        FROM UNNEST(
          ${chunk.map(() => randomUUID())}::text[],
          ${chunk.map((r) => r.date)}::date[],
          ${chunk.map((r) => r.path)}::text[],
          ${chunk.map((r) => r.totalRequests)}::int[],
          ${chunk.map((r) => Math.round(r.visits))}::int[],
          ${chunk.map((r) => r.verifiedBotRequests)}::int[],
          ${chunk.map((r) => r.unclassifiedRequests)}::int[],
          ${chunk.map((r) => (r.botCategoryBreakdown.length ? JSON.stringify(r.botCategoryBreakdown) : null))}::jsonb[]
        ) AS r(id, date, path, total, visits, verified, unclassified, bots)
        ON CONFLICT ("connectionId", "date", "path") DO UPDATE SET
          "totalRequests" = EXCLUDED."totalRequests",
          "visits" = EXCLUDED."visits",
          "verifiedBotRequests" = EXCLUDED."verifiedBotRequests",
          "unclassifiedRequests" = EXCLUDED."unclassifiedRequests",
          "botCategoryBreakdown" = EXCLUDED."botCategoryBreakdown",
          "updatedAt" = NOW()`;
    } catch (error) {
      console.warn("[cloudflare page traffic sync] batch save failed, saving row by row", error instanceof Error ? error.message : error);
      for (const row of chunk) {
        const date = utcDate(row.date);
        const data = {
          totalRequests: row.totalRequests,
          visits: Math.round(row.visits),
          verifiedBotRequests: row.verifiedBotRequests,
          unclassifiedRequests: row.unclassifiedRequests,
          botCategoryBreakdown: row.botCategoryBreakdown.length
            ? (row.botCategoryBreakdown as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        };
        await prisma.pageTrafficSnapshot.upsert({
          where: { connectionId_date_path: { connectionId, date, path: row.path } },
          create: { connectionId, date, path: row.path, ...data },
          update: data,
        });
      }
    }
  }
}

export async function syncCloudflareTraffic({
  websiteId,
  since,
  until,
}: SyncParams): Promise<SyncResult> {
  const connection =
    await getCloudflareConnectionWithToken(
      websiteId
    );

  if (!connection) {
    throw new Error(
      "NO_CONNECTION: Cloudflare is not connected for this website"
    );
  }

  const {
    days: dailyTraffic,
    skippedDays,
  } = await fetchCloudflareTraffic({
    zoneId: connection.zoneId,
    apiToken: connection.apiToken,
    since,
    until,
  });

  const pageTraffic =
    await fetchCloudflarePageTraffic({
      zoneId:
        connection.zoneId,

      apiToken:
        connection.apiToken,

      since,
      until,
    });

  // PAGE_TRAFFIC_SYNC_V1

  for (const day of dailyTraffic) {
    const sortedCountries =
      [...day.byCountry].sort(
        (a, b) =>
          b.requests - a.requests
      );

    const sortedDevices =
      [...day.byDevice].sort(
        (a, b) =>
          b.requests - a.requests
      );

    const sortedBotCategories =
      [...day.byBotCategory].sort(
        (a, b) =>
          b.requests - a.requests
      );

    const verifiedBotRequests =
      day.detailAvailable
        ? sortedBotCategories
            .filter(
              (bot) =>
                bot.category !== ""
            )
            .reduce(
              (sum, bot) =>
                sum + bot.requests,
              0
            )
        : 0;

    const unclassifiedRequests =
      day.detailAvailable
        ? Math.max(
            0,
            day.detailTotalRequests -
              verifiedBotRequests
          )
        : 0;

    const snapshotDate =
      utcDate(day.date);

    const createData:
      Prisma.TrafficSnapshotUncheckedCreateInput =
      {
        connectionId:
          connection.id,

        date:
          snapshotDate,

        totalRequests:
          day.totalRequests,

        unclassifiedRequests,

        verifiedBotRequests,

        unverifiedBotRequests:
          null,

        threatsBlocked:
          null,

        bandwidthBytes:
          BigInt(
            Math.round(
              day.bandwidthBytes
            )
          ),

        uniqueVisitors:
          day.uniqueVisitors,

        countryBreakdown:
          day.detailAvailable
            ? (
                sortedCountries as unknown as Prisma.InputJsonValue
              )
            : Prisma.JsonNull,

        deviceBreakdown:
          day.detailAvailable
            ? (
                sortedDevices as unknown as Prisma.InputJsonValue
              )
            : Prisma.JsonNull,

        botCategoryBreakdown:
          day.detailAvailable
            ? (
                sortedBotCategories as unknown as Prisma.InputJsonValue
              )
            : Prisma.JsonNull,
      };

    const updateData:
      Prisma.TrafficSnapshotUncheckedUpdateInput =
      {
        totalRequests:
          day.totalRequests,

        bandwidthBytes:
          BigInt(
            Math.round(
              day.bandwidthBytes
            )
          ),

        uniqueVisitors:
          day.uniqueVisitors,
      };

    if (day.detailAvailable) {
      updateData.unclassifiedRequests =
        unclassifiedRequests;

      updateData.verifiedBotRequests =
        verifiedBotRequests;

      updateData.unverifiedBotRequests =
        null;

      updateData.threatsBlocked =
        null;

      updateData.countryBreakdown =
        sortedCountries as unknown as Prisma.InputJsonValue;

      updateData.deviceBreakdown =
        sortedDevices as unknown as Prisma.InputJsonValue;

      updateData.botCategoryBreakdown =
        sortedBotCategories as unknown as Prisma.InputJsonValue;
    }

    await prisma.trafficSnapshot.upsert({
      where: {
        connectionId_date: {
          connectionId:
            connection.id,

          date:
            snapshotDate,
        },
      },

      create:
        createData,

      update:
        updateData,
    });
  }

  await savePageRows(connection.id, pageTraffic.rows);

  console.info(
    "[cloudflare page traffic sync]",
    {
      websiteId,
      rows:
        pageTraffic.rows.length,
      skippedDays:
        pageTraffic.skippedDays.length,
    }
  );

  const syncedDates =
    dailyTraffic
      .map((day) => day.date)
      .sort();

  const requestedDays =
    Math.round(
      (
        utcDate(until).getTime() -
        utcDate(since).getTime()
      ) /
        86_400_000
    ) + 1;

  return {
    connectionId:
      connection.id,

    requestedDays,

    syncedDays:
      dailyTraffic.length,

    detailDays:
      dailyTraffic.filter(
        (day) =>
          day.detailAvailable
      ).length,

    skippedDays,

    availableFrom:
      syncedDates[0] ?? null,

    availableTo:
      syncedDates.length > 0
        ? syncedDates[
            syncedDates.length - 1
          ]
        : null,
  };
}
