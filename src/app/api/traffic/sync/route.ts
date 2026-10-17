import { NextRequest, NextResponse } from "next/server";
import { getCompletedUtcDayRange } from "@/lib/audience/completed-day-range";
import {
  requireUser,
  requireWebsiteAccess,
  authErrorResponse,
} from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { syncCloudflareTraffic } from "@/lib/integrations/cloudflare/sync";

/*
 * Sync the latest 30 complete UTC days from Cloudflare.
 *
 * Each day is persisted as a TrafficSnapshot and the unique
 * connectionId/date constraint makes repeated syncs safe.
 *
 * The Audience 7 / 15 / 30 day views continue reading from the
 * persisted snapshots; this sync backfills the full monthly range.
 */
const CLOUDFLARE_SYNC_WINDOW_DAYS = 30;

export async function POST(
  req: NextRequest
) {
  try {
    const user =
      await requireUser();

    const body =
      (await req.json()) as {
        websiteId?: string;
      };

    const websiteId =
      body.websiteId?.trim();

    if (!websiteId) {
      return NextResponse.json(
        {
          error:
            "websiteId is required",
        },
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
        },
      });

    if (!connection) {
      return NextResponse.json(
        {
          error:
            "Cloudflare is not connected for this website.",
        },
        { status: 404 }
      );
    }

    const { since, until } = getCompletedUtcDayRange(
      CLOUDFLARE_SYNC_WINDOW_DAYS,
      new Date()
    );

    const result =
      await syncCloudflareTraffic({
        websiteId,

        since:
          since.toISOString().slice(0, 10),

        until:
          until.toISOString().slice(0, 10),
      });

    /*
     * Touch connection.updatedAt so UI has a truthful sync timestamp.
     */
    await prisma.cloudflareConnection.update({
      where: {
        websiteId,
      },
      data: {
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,

      source: "CLOUDFLARE",

      syncWindowDays:
        CLOUDFLARE_SYNC_WINDOW_DAYS,

      requestedRange: {
        start:
          since.toISOString().slice(0, 10),

        end:
          until.toISOString().slice(0, 10),
      },

      ...result,
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
      "[traffic sync]",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return NextResponse.json(
      {
        error:
          "Cloudflare sync failed.",
      },
      { status: 502 }
    );
  }
}
