import { NextRequest, NextResponse } from "next/server";
import {
  requireUser,
  requireWebsiteAccess,
  authErrorResponse,
} from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  gscProvider,
  ProviderNotConnectedError,
  SitePermissionError,
} from "@/lib/keywords/gsc-provider";
import type { KeywordProvenance } from "@/lib/keywords/types";

const ALLOWED_DAYS =
  new Set([7, 15, 30]);

const MAX_RESULTS = 50;

interface Bucket {
  query: string;
  clicks: number;
  impressions: number;
  weightedPosition: number;
  positionWeight: number;
  pages: Map<
    string,
    {
      page: string;
      clicks: number;
      impressions: number;
    }
  >;
}

function round(
  value: number,
  digits = 1
) {
  const factor = 10 ** digits;

  return (
    Math.round(value * factor) /
    factor
  );
}

export async function GET(
  req: NextRequest
) {
  try {
    const user = await requireUser();

    const websiteId =
      req.nextUrl.searchParams.get(
        "websiteId"
      );

    const days = Number(
      req.nextUrl.searchParams.get(
        "days"
      ) ?? "7"
    );

    if (!websiteId) {
      return NextResponse.json(
        {
          error:
            "websiteId is required",
        },
        { status: 400 }
      );
    }

    if (!ALLOWED_DAYS.has(days)) {
      return NextResponse.json(
        {
          error:
            "days must be 7, 15, or 30",
        },
        { status: 400 }
      );
    }

    await requireWebsiteAccess(
      user.id,
      websiteId
    );

    const website =
      await prisma.website.findUnique({
        where: {
          id: websiteId,
        },
        select: {
          url: true,
          business: {
            select: {
              workspaceId: true,
            },
          },
        },
      });

    if (!website) {
      return NextResponse.json(
        {
          error:
            "Website not found",
        },
        { status: 404 }
      );
    }

    const workspaceId =
      website.business.workspaceId;

    const connection =
      await gscProvider.getConnectionStatus(
        workspaceId
      );

    if (
      connection.status !==
      "CONNECTED"
    ) {
      return NextResponse.json({
        connected: false,
        source:
          "GOOGLE_SEARCH_CONSOLE",
        days,
        range: null,
        summary: null,
        queries: [],

        state:
          "DISCONNECTED",

        connectUrl:
          `/api/integrations/google/connect?workspaceId=${encodeURIComponent(
            workspaceId
          )}&websiteId=${encodeURIComponent(
            websiteId
          )}`,
      });
    }

    const now = new Date();

    const endDate = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate()
      )
    );

    endDate.setUTCDate(
      endDate.getUTCDate() - 1
    );

    const startDate =
      new Date(endDate);

    startDate.setUTCDate(
      startDate.getUTCDate() -
        (days - 1)
    );

    const performanceResult =
      await (async () => {
        try {
          const rows =
            await gscProvider.fetchSearchPerformance({
              workspaceId,
              siteUrl:
                website.url,
              startDate,
              endDate,
            });

          return {
            ok:
              true as const,
            rows,
          };
        } catch (error) {
          return {
            ok:
              false as const,
            error,
          };
        }
      })();

    if (
      !performanceResult.ok
    ) {
      const providerError =
        performanceResult.error;

      const connectUrl =
        `/api/integrations/google/connect?workspaceId=${encodeURIComponent(
          workspaceId
        )}&websiteId=${encodeURIComponent(
          websiteId
        )}`;

      if (
        providerError instanceof
        SitePermissionError
      ) {
        return NextResponse.json({
          connected:
            true,

          source:
            "GOOGLE_SEARCH_CONSOLE",

          days,

          range: {
            start:
              startDate
                .toISOString()
                .slice(0, 10),

            end:
              endDate
                .toISOString()
                .slice(0, 10),
          },

          summary:
            null,

          queries:
            [],

          state:
            "PROPERTY_UNAVAILABLE",

          message:
            "The connected Google account does not have Search Console access to this website.",

          connectUrl,
        });
      }

      const providerMessage =
        providerError instanceof Error
          ? providerError.message
          : "";

      const reconnectRequired =
        providerError instanceof
          ProviderNotConnectedError ||
        /invalid_grant|invalid credentials|unauthorized|authentication|refresh token|token has been expired|token has been revoked/i.test(
          providerMessage
        );

      if (
        reconnectRequired
      ) {
        return NextResponse.json({
          connected:
            false,

          source:
            "GOOGLE_SEARCH_CONSOLE",

          days,

          range:
            null,

          summary:
            null,

          queries:
            [],

          state:
            "RECONNECT_REQUIRED",

          message:
            "Google Search Console authorization needs to be refreshed.",

          connectUrl,
        });
      }

      console.error(
        "[audience search queries provider]",
        providerMessage ||
          "Unknown Search Console provider error"
      );

      return NextResponse.json({
        connected:
          true,

        source:
          "GOOGLE_SEARCH_CONSOLE",

        days,

        range: {
          start:
            startDate
              .toISOString()
              .slice(0, 10),

          end:
            endDate
              .toISOString()
              .slice(0, 10),
        },

        summary:
          null,

        queries:
          [],

        state:
          "TEMPORARILY_UNAVAILABLE",

        message:
          "Search Console is temporarily unavailable.",

        connectUrl,
      });
    }

    const rawRows =
      performanceResult.rows;

    const provenance:
      KeywordProvenance = {
        provider:
          "GOOGLE_SEARCH_CONSOLE",
        retrievedAt: new Date(),
        dateRangeStart:
          startDate,
        dateRangeEnd:
          endDate,
        country: "us",
        device: "DESKTOP",
      };

    const normalized =
      gscProvider.normalizeRows(
        rawRows,
        provenance
      );

    const buckets =
      new Map<string, Bucket>();

    for (
      const {
        keyword,
        snapshot,
      } of normalized
    ) {
      const query =
        keyword.text.trim();

      if (!query) continue;

      const clicks =
        Math.max(
          0,
          Number(
            snapshot.clicks ?? 0
          )
        );

      const impressions =
        Math.max(
          0,
          Number(
            snapshot.impressions ?? 0
          )
        );

      const position =
        snapshot.position == null
          ? null
          : Number(
              snapshot.position
            );

      const page =
        snapshot.pageUrl?.trim() ??
        "";

      let bucket =
        buckets.get(query);

      if (!bucket) {
        bucket = {
          query,
          clicks: 0,
          impressions: 0,
          weightedPosition: 0,
          positionWeight: 0,
          pages: new Map(),
        };

        buckets.set(
          query,
          bucket
        );
      }

      bucket.clicks += clicks;
      bucket.impressions +=
        impressions;

      if (
        position !== null &&
        Number.isFinite(position)
      ) {
        const weight =
          Math.max(
            1,
            impressions
          );

        bucket.weightedPosition +=
          position * weight;

        bucket.positionWeight +=
          weight;
      }

      if (page) {
        const existing =
          bucket.pages.get(page) ?? {
            page,
            clicks: 0,
            impressions: 0,
          };

        existing.clicks +=
          clicks;

        existing.impressions +=
          impressions;

        bucket.pages.set(
          page,
          existing
        );
      }
    }

    const queries =
      [...buckets.values()]
        .map((bucket) => {
          const topPage =
            [...bucket.pages.values()]
              .sort(
                (a, b) =>
                  b.clicks -
                    a.clicks ||
                  b.impressions -
                    a.impressions
              )[0]?.page ?? null;

          const ctr =
            bucket.impressions > 0
              ? (
                  bucket.clicks /
                  bucket.impressions
                ) * 100
              : 0;

          const avgPosition =
            bucket.positionWeight > 0
              ? (
                  bucket.weightedPosition /
                  bucket.positionWeight
                )
              : null;

          return {
            query:
              bucket.query,

            clicks:
              bucket.clicks,

            impressions:
              bucket.impressions,

            ctr:
              round(ctr, 1),

            avgPosition:
              avgPosition === null
                ? null
                : round(
                    avgPosition,
                    1
                  ),

            topPage,
          };
        })
        .sort(
          (a, b) =>
            b.clicks -
              a.clicks ||
            b.impressions -
              a.impressions ||
            (a.avgPosition ??
              999) -
              (b.avgPosition ??
                999)
        );

    const clicks =
      queries.reduce(
        (sum, row) =>
          sum + row.clicks,
        0
      );

    const impressions =
      queries.reduce(
        (sum, row) =>
          sum +
          row.impressions,
        0
      );

    const weighted =
      [...buckets.values()]
        .reduce(
          (acc, bucket) => {
            acc.total +=
              bucket.weightedPosition;

            acc.weight +=
              bucket.positionWeight;

            return acc;
          },
          {
            total: 0,
            weight: 0,
          }
        );

    return NextResponse.json({
      connected: true,

      source:
        "GOOGLE_SEARCH_CONSOLE",

      days,

      range: {
        start:
          startDate
            .toISOString()
            .slice(0, 10),

        end:
          endDate
            .toISOString()
            .slice(0, 10),
      },

      summary: {
        clicks,

        impressions,

        ctr:
          impressions > 0
            ? round(
                (
                  clicks /
                  impressions
                ) * 100,
                1
              )
            : 0,

        avgPosition:
          weighted.weight > 0
            ? round(
                weighted.total /
                  weighted.weight,
                1
              )
            : null,

        uniqueQueries:
          queries.length,
      },

      queries:
        queries.slice(
          0,
          MAX_RESULTS
        ),
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
      "[audience/search-queries]",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return NextResponse.json(
      {
        error:
          "Could not load Google Search Console data.",
      },
      { status: 502 }
    );
  }
}
