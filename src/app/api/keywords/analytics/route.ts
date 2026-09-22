import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  authErrorResponse,
  requireUser,
  requireWorkspaceAccess,
} from "@/lib/auth-helpers";

import {
  prisma,
} from "@/lib/prisma";

import {
  aggregateRankSnapshots,
  classifyKeyword,
  dateKey,
  opportunityScore,
  positionDelta,
  shiftUtcDays,
  startOfUtcDay,
  type RankSnapshotInput,
} from "@/lib/keywords/rank-intelligence";

function parseDays(
  value: string | null
): 7 | 28 | 90 {
  if (
    value ===
    "7"
  ) {
    return 7;
  }

  if (
    value ===
    "90"
  ) {
    return 90;
  }

  return 28;
}

function round(
  value: number | null,
  digits = 1
): number | null {
  if (
    value ===
    null
  ) {
    return null;
  }

  const factor =
    10 **
    digits;

  return (
    Math.round(
      value *
        factor
    ) /
    factor
  );
}

export async function GET(
  req: NextRequest
) {
  try {
    const user =
      await requireUser();

    const {
      searchParams,
    } =
      new URL(
        req.url
      );

    const workspaceId =
      searchParams
        .get(
          "workspaceId"
        )
        ?.trim();

    if (
      !workspaceId
    ) {
      return NextResponse.json(
        {
          error:
            "workspaceId is required.",
        },
        {
          status:
            400,
        }
      );
    }

    await requireWorkspaceAccess(
      user.id,
      workspaceId
    );

    const days =
      parseDays(
        searchParams.get(
          "days"
        )
      );

    const market =
      searchParams.get(
        "market"
      ) ??
      "US";

    const language =
      searchParams.get(
        "language"
      ) ??
      "English";

    const today =
      startOfUtcDay(
        new Date()
      );

    const selectedStart =
      shiftUtcDays(
        today,
        -(
          days -
          1
        )
      );

    const historyDays =
      Math.max(
        days *
          2,
        56
      );

    const historyStart =
      shiftUtcDays(
        today,
        -(
          historyDays -
          1
        )
      );

    const keywords =
      await prisma.keyword.findMany({
        where: {
          workspaceId,
        },

        select: {
          id:
            true,

          text:
            true,

          volume:
            true,

          difficulty:
            true,

          snapshots: {
            where: {
              source:
                "GOOGLE_SEARCH_CONSOLE",

              date: {
                gte:
                  historyStart,
              },
            },

            orderBy: {
              date:
                "asc",
            },

            select: {
              date:
                true,

              position:
                true,

              impressions:
                true,

              clicks:
                true,

              pageUrl:
                true,
            },
          },

          marketMetrics: {
            where: {
              market,
              language,
            },

            take:
              1,

            select: {
              volume:
                true,

              difficulty:
                true,

              cpc:
                true,

              competitionIndex:
                true,
            },
          },
        },
      });

    const current7Start =
      shiftUtcDays(
        today,
        -6
      );

    const previous7Start =
      shiftUtcDays(
        today,
        -13
      );

    const previous7End =
      shiftUtcDays(
        today,
        -7
      );

    const current28Start =
      shiftUtcDays(
        today,
        -27
      );

    const previous28Start =
      shiftUtcDays(
        today,
        -55
      );

    const previous28End =
      shiftUtcDays(
        today,
        -28
      );

    const rows =
      keywords.map(
        (
          keyword
        ) => {
          const snapshots:
            RankSnapshotInput[] =
            keyword.snapshots.map(
              (
                snapshot
              ) => ({
                date:
                  snapshot.date,

                position:
                  snapshot.position ===
                  null
                    ? null
                    : Number(
                        snapshot.position
                      ),

                impressions:
                  snapshot.impressions,

                clicks:
                  snapshot.clicks,

                pageUrl:
                  snapshot.pageUrl,
              })
            );

          const selected =
            aggregateRankSnapshots(
              snapshots,
              selectedStart,
              today
            );

          const current7 =
            aggregateRankSnapshots(
              snapshots,
              current7Start,
              today
            );

          const previous7 =
            aggregateRankSnapshots(
              snapshots,
              previous7Start,
              previous7End
            );

          const current28 =
            aggregateRankSnapshots(
              snapshots,
              current28Start,
              today
            );

          const previous28 =
            aggregateRankSnapshots(
              snapshots,
              previous28Start,
              previous28End
            );

          const currentPosition =
            current7.position ??
            selected.position;

          const delta7d =
            positionDelta(
              current7.position,
              previous7.position
            );

          const delta28d =
            positionDelta(
              current28.position,
              previous28.position
            );

          const metric =
            keyword.marketMetrics[0];

          const volume =
            metric?.volume ??
            keyword.volume ??
            null;

          const difficulty =
            metric?.difficulty ??
            keyword.difficulty ??
            null;

          const signal =
            classifyKeyword(
              currentPosition,
              delta7d,
              selected.impressions
            );

          return {
            id:
              keyword.id,

            keyword:
              keyword.text,

            position:
              round(
                currentPosition
              ),

            positionDelta7d:
              round(
                delta7d
              ),

            positionDelta28d:
              round(
                delta28d
              ),

            impressions:
              selected.impressions,

            clicks:
              selected.clicks,

            ctr:
              selected.ctr ===
              null
                ? null
                : round(
                    selected.ctr *
                      100,
                    2
                  ),

            volume,

            difficulty,

            rankingUrl:
              selected.rankingUrl,

            signal,

            opportunityScore:
              opportunityScore(
                currentPosition,
                delta7d,
                selected.impressions,
                volume
              ),
          };
        }
      );

    const selectedSnapshots =
      keywords.flatMap(
        (
          keyword
        ) =>
          keyword.snapshots
            .filter(
              (
                snapshot
              ) =>
                snapshot.date >=
                selectedStart
            )
            .map(
              (
                snapshot
              ) => ({
                keywordId:
                  keyword.id,

                date:
                  snapshot.date,

                position:
                  snapshot.position ===
                  null
                    ? null
                    : Number(
                        snapshot.position
                      ),

                impressions:
                  snapshot.impressions ??
                  0,

                clicks:
                  snapshot.clicks ??
                  0,

                pageUrl:
                  snapshot.pageUrl,
              })
            )
      );

    const overall =
      aggregateRankSnapshots(
        selectedSnapshots.map(
          (
            snapshot
          ) => ({
            date:
              snapshot.date,

            position:
              snapshot.position,

            impressions:
              snapshot.impressions,

            clicks:
              snapshot.clicks,

            pageUrl:
              snapshot.pageUrl,
          })
        ),
        selectedStart,
        today
      );

    const keywordsWithData =
      rows.filter(
        (
          row
        ) =>
          row.position !==
            null ||
          row.impressions >
            0
      ).length;

    const currentRows =
      rows.filter(
        (
          row
        ) =>
          row.position !==
          null
      );

    const top3 =
      currentRows.filter(
        (
          row
        ) =>
          (
            row.position ??
            Infinity
          ) <=
          3
      ).length;

    const top10 =
      currentRows.filter(
        (
          row
        ) =>
          (
            row.position ??
            Infinity
          ) <=
          10
      ).length;

    const top20 =
      currentRows.filter(
        (
          row
        ) =>
          (
            row.position ??
            Infinity
          ) <=
          20
      ).length;

    const nearFirstPage =
      currentRows.filter(
        (
          row
        ) => {
          const position =
            row.position ??
            Infinity;

          return (
            position >
              10 &&
            position <=
              20
          );
        }
      ).length;

    const improved =
      rows.filter(
        (
          row
        ) =>
          (
            row.positionDelta7d ??
            0
          ) >=
          1
      ).length;

    const declined =
      rows.filter(
        (
          row
        ) =>
          (
            row.positionDelta7d ??
            0
          ) <=
          -1
      ).length;

    const dailyMap =
      new Map<
        string,
        {
          impressions: number;
          clicks: number;
          weightedPosition: number;
          positionWeight: number;
          keywords: Set<string>;
        }
      >();

    for (
      const snapshot of
      selectedSnapshots
    ) {
      const key =
        dateKey(
          snapshot.date
        );

      const bucket =
        dailyMap.get(
          key
        ) ?? {
          impressions:
            0,

          clicks:
            0,

          weightedPosition:
            0,

          positionWeight:
            0,

          keywords:
            new Set<string>(),
        };

      const impressions =
        Math.max(
          0,
          snapshot.impressions
        );

      bucket.impressions +=
        impressions;

      bucket.clicks +=
        Math.max(
          0,
          snapshot.clicks
        );

      if (
        snapshot.position !==
          null &&
        impressions >
          0
      ) {
        bucket.weightedPosition +=
          snapshot.position *
          impressions;

        bucket.positionWeight +=
          impressions;
      }

      if (
        impressions >
        0
      ) {
        bucket.keywords.add(
          snapshot.keywordId
        );
      }

      dailyMap.set(
        key,
        bucket
      );
    }

    const chart:
      Array<{
        date: string;
        impressions: number;
        avgImpressions: number;
        clicks: number;
        avgPosition: number | null;
      }> =
      [];

    for (
      let cursor =
        selectedStart;
      cursor <=
      today;
      cursor =
        shiftUtcDays(
          cursor,
          1
        )
    ) {
      const key =
        dateKey(
          cursor
        );

      const bucket =
        dailyMap.get(
          key
        );

      const keywordCount =
        bucket?.keywords.size ??
        0;

      chart.push({
        date:
          key,

        impressions:
          bucket?.impressions ??
          0,

        avgImpressions:
          keywordCount >
          0
            ? Math.round(
                (
                  (
                    bucket?.impressions ??
                    0
                  ) /
                  keywordCount
                ) *
                  10
              ) /
              10
            : 0,

        clicks:
          bucket?.clicks ??
          0,

        avgPosition:
          bucket &&
          bucket.positionWeight >
            0
            ? round(
                bucket.weightedPosition /
                  bucket.positionWeight
              )
            : null,
      });
    }

    rows.sort(
      (
        a,
        b
      ) =>
        b.opportunityScore -
          a.opportunityScore ||
        b.impressions -
          a.impressions
    );

    return NextResponse.json({
      days,

      scope:
        "workspace",

      stats: {
        trackedKeywords:
          rows.length,

        keywordsWithData,

        impressions:
          overall.impressions,

        avgImpressionsPerKeyword:
          keywordsWithData >
          0
            ? round(
                overall.impressions /
                  keywordsWithData
              )
            : 0,

        clicks:
          overall.clicks,

        ctr:
          overall.ctr ===
          null
            ? null
            : round(
                overall.ctr *
                  100,
                2
              ),

        avgPosition:
          round(
            overall.position
          ),

        top3,
        top10,
        top20,
        nearFirstPage,
        improved,
        declined,
      },

      chart,

      keywords:
        rows.slice(
          0,
          100
        ),
    });
  } catch (
    err
  ) {
    const {
      status,
      body,
    } =
      authErrorResponse(
        err
      );

    return NextResponse.json(
      body,
      {
        status,
      }
    );
  }
}
