import { NextRequest, NextResponse } from "next/server";
import {
  requireUser,
  requireWebsiteAccess,
  authErrorResponse,
} from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const ALLOWED_DAYS = new Set([7, 15, 30]);

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();

    const websiteId =
      req.nextUrl.searchParams.get("websiteId");

    const days = Number(
      req.nextUrl.searchParams.get("days") ?? "7"
    );

    if (!websiteId) {
      return NextResponse.json(
        { error: "websiteId is required" },
        { status: 400 }
      );
    }

    if (!ALLOWED_DAYS.has(days)) {
      return NextResponse.json(
        { error: "days must be 7, 15, or 30" },
        { status: 400 }
      );
    }

    await requireWebsiteAccess(
      user.id,
      websiteId
    );

    const connection =
      await prisma.cloudflareConnection.findUnique({
        where: { websiteId },
        select: {
          id: true,
          updatedAt: true,
        },
      });

    if (!connection) {
      return NextResponse.json({
        connected: false,
        source: "CLOUDFLARE",
        days,
        requestedDays: days,
        availableDays: 0,
        missingDays: days,
        availableFrom: null,
        availableTo: null,
        lastSyncedAt: null,
        snapshots: [],
      });
    }

    /*
     * IMPORTANT:
     * GET never contacts Cloudflare.
     *
     * Range buttons only read accumulated snapshots from PostgreSQL.
     * This makes 7 / 15 / 30 stable and avoids Cloudflare retention
     * failures when the user selects a longer period.
     */

    const todayUtc = new Date();

    const until = new Date(
      Date.UTC(
        todayUtc.getUTCFullYear(),
        todayUtc.getUTCMonth(),
        todayUtc.getUTCDate()
      )
    );

    // Only complete days.
    until.setUTCDate(
      until.getUTCDate() - 1
    );

    const since = new Date(until);

    since.setUTCDate(
      since.getUTCDate() - (days - 1)
    );

    const snapshots =
      await prisma.trafficSnapshot.findMany({
        where: {
          connectionId: connection.id,
          date: {
            gte: since,
            lte: until,
          },
        },
        orderBy: {
          date: "asc",
        },
      });

    const availableDays =
      snapshots.length;

    return NextResponse.json({
      connected: true,

      source: "CLOUDFLARE",

      days,

      requestedDays: days,

      availableDays,

      missingDays:
        Math.max(
          0,
          days - availableDays
        ),

      requestedRange: {
        start:
          since.toISOString().slice(0, 10),

        end:
          until.toISOString().slice(0, 10),
      },

      availableFrom:
        snapshots[0]?.date
          .toISOString()
          .slice(0, 10) ?? null,

      availableTo:
        snapshots[
          snapshots.length - 1
        ]?.date
          .toISOString()
          .slice(0, 10) ?? null,

      lastSyncedAt:
        connection.updatedAt.toISOString(),

      snapshots:
        snapshots.map((snapshot) => ({
          date:
            snapshot.date
              .toISOString()
              .slice(0, 10),

          totalRequests:
            snapshot.totalRequests,

          unclassifiedRequests:
            snapshot.unclassifiedRequests,

          verifiedBotRequests:
            snapshot.verifiedBotRequests,

          unverifiedBotRequests:
            snapshot.unverifiedBotRequests,

          threatsBlocked:
            snapshot.threatsBlocked,

          uniqueVisitors:
            snapshot.uniqueVisitors,

          bandwidthBytes:
            snapshot.bandwidthBytes.toString(),

          countryBreakdown:
            snapshot.countryBreakdown,

          deviceBreakdown:
            snapshot.deviceBreakdown,

          botCategoryBreakdown:
            snapshot.botCategoryBreakdown,
        })),
    });
  } catch (error) {
    const { status, body } =
      authErrorResponse(error);

    if (status !== 500) {
      return NextResponse.json(
        body,
        { status }
      );
    }

    console.error(
      "[traffic GET]",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return NextResponse.json(
      {
        error:
          "Could not load stored traffic data.",
      },
      { status: 500 }
    );
  }
}
