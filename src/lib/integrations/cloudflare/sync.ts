import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  fetchCloudflareTraffic,
  type SkippedDay,
} from "./client";

import {
  fetchCloudflarePageTraffic,
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

  for (
    const row of
    pageTraffic.rows
  ) {
    const snapshotDate =
      utcDate(
        row.date
      );

    await prisma.pageTrafficSnapshot.upsert({
      where: {
        connectionId_date_path: {
          connectionId:
            connection.id,

          date:
            snapshotDate,

          path:
            row.path,
        },
      },

      create: {
        connectionId:
          connection.id,

        date:
          snapshotDate,

        path:
          row.path,

        totalRequests:
          row.totalRequests,

        visits:
          Math.round(
            row.visits
          ),

        verifiedBotRequests:
          row.verifiedBotRequests,

        unclassifiedRequests:
          row.unclassifiedRequests,

        botCategoryBreakdown:
          row.botCategoryBreakdown.length
            ? (
                row.botCategoryBreakdown as unknown as Prisma.InputJsonValue
              )
            : Prisma.JsonNull,
      },

      update: {
        totalRequests:
          row.totalRequests,

        visits:
          Math.round(
            row.visits
          ),

        verifiedBotRequests:
          row.verifiedBotRequests,

        unclassifiedRequests:
          row.unclassifiedRequests,

        botCategoryBreakdown:
          row.botCategoryBreakdown.length
            ? (
                row.botCategoryBreakdown as unknown as Prisma.InputJsonValue
              )
            : Prisma.JsonNull,
      },
    });
  }

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
