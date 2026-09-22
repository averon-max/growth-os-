import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  authErrorResponse,
  requireUser,
  requireWebsiteAccess,
} from "@/lib/auth-helpers";

import {
  getContentArticleById,
} from "@/lib/content/repository";

import {
  prisma,
} from "@/lib/prisma";

const DAY_MS =
  24 *
  60 *
  60 *
  1000;

function startOfUtcDay(
  input:
    Date
) {
  const value =
    new Date(
      input
    );

  value.setUTCHours(
    0,
    0,
    0,
    0
  );

  return value;
}

function dateKey(
  input:
    Date
) {
  return input
    .toISOString()
    .slice(
      0,
      10
    );
}

function round(
  value:
    number,
  digits =
    1
) {
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

function numberOrNull(
  value:
    unknown
) {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return null;
  }

  const result =
    Number(
      value
    );

  return Number.isFinite(
    result
  )
    ? result
    : null;
}

function urlVariants(
  raw:
    string | null
) {
  if (!raw) {
    return [];
  }

  try {
    const parsed =
      new URL(
        raw
      );

    parsed.hash =
      "";

    const exact =
      parsed.toString();

    const withoutSlash =
      exact.endsWith(
        "/"
      )
        ? exact.slice(
            0,
            -1
          )
        : exact;

    const withSlash =
      withoutSlash +
      "/";

    return Array.from(
      new Set([
        exact,
        withoutSlash,
        withSlash,
      ])
    );
  } catch {
    return [
      raw,
    ];
  }
}

function countPhrase(
  text:
    string,
  phrase:
    string
) {
  const clean =
    phrase
      .trim()
      .toLowerCase();

  if (!clean) {
    return 0;
  }

  const haystack =
    text.toLowerCase();

  let count =
    0;

  let from =
    0;

  while (true) {
    const index =
      haystack.indexOf(
        clean,
        from
      );

    if (
      index <
      0
    ) {
      break;
    }

    count +=
      1;

    from =
      index +
      clean.length;
  }

  return count;
}

function addJsonNumbers(
  value:
    unknown,
  totals:
    Map<
      string,
      number
    >,
  prefix =
    ""
) {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return;
  }

  if (
    typeof value ===
    "number" &&
    prefix
  ) {
    totals.set(
      prefix,
      (
        totals.get(
          prefix
        ) ??
        0
      ) +
        value
    );

    return;
  }

  if (
    Array.isArray(
      value
    )
  ) {
    value.forEach(
      (
        item,
        index
      ) => {
        addJsonNumbers(
          item,
          totals,
          prefix
            ? `${prefix}.${index}`
            : String(
                index
              )
        );
      }
    );

    return;
  }

  if (
    typeof value ===
    "object"
  ) {
    for (
      const [
        key,
        child,
      ] of Object.entries(
        value as
          Record<
            string,
            unknown
          >
      )
    ) {
      addJsonNumbers(
        child,
        totals,
        prefix
          ? `${prefix}.${key}`
          : key
      );
    }
  }
}

function botGroup(
  label:
    string
) {
  const value =
    label.toLowerCase();

  if (
    /(^|[^a-z])(ai|llm)([^a-z]|$)|openai|gpt|anthropic|claude|perplexity|generative/.test(
      value
    )
  ) {
    return "AI";
  }

  if (
    /search|googlebot|bingbot|yandex|baidu/.test(
      value
    )
  ) {
    return "SEARCH";
  }

  return "OTHER";
}

export async function GET(
  req: NextRequest,
  {
    params,
  }: {
    params:
      Promise<{
        id: string;
      }>;
  }
) {
  try {
    const {
      id,
    } =
      await params;

    const user =
      await requireUser();

    const article =
      await getContentArticleById(
        id
      );

    if (!article) {
      return NextResponse.json(
        {
          error:
            "Article not found.",
        },
        {
          status:
            404,
        }
      );
    }

    await requireWebsiteAccess(
      user.id,
      article.brief
        .websiteId
    );

    const website =
      await prisma.website.findUnique({
        where: {
          id:
            article.brief
              .websiteId,
        },

        select: {
          business: {
            select: {
              workspaceId:
                true,
            },
          },
        },
      });

    if (!website) {
      return NextResponse.json(
        {
          error:
            "Website not found.",
        },
        {
          status:
            404,
        }
      );
    }

    const requestedDays =
      Number(
        req.nextUrl
          .searchParams
          .get(
            "days"
          ) ??
          "28"
      );

    const days =
      requestedDays ===
        7 ||
      requestedDays ===
        28 ||
      requestedDays ===
        90
        ? requestedDays
        : 28;

    const today =
      startOfUtcDay(
        new Date()
      );

    const currentStart =
      new Date(
        today.getTime() -
          (
            days -
            1
          ) *
            DAY_MS
      );

    const previousEnd =
      new Date(
        currentStart.getTime() -
          DAY_MS
      );

    const previousStart =
      new Date(
        previousEnd.getTime() -
          (
            days -
            1
          ) *
            DAY_MS
      );

    const targetUrl =
      article.publishedUrl ??
      null;

    const variants =
      urlVariants(
        targetUrl
      );

    const snapshots =
      variants.length
        ? await prisma.keywordSnapshot.findMany({
            where: {
              date: {
                gte:
                  previousStart,
              },

              pageUrl: {
                in:
                  variants,
              },

              keyword: {
                workspaceId:
                  website.business
                    .workspaceId,
              },
            },

            select: {
              date:
                true,

              impressions:
                true,

              clicks:
                true,

              ctr:
                true,

              position:
                true,

              pageUrl:
                true,

              keyword: {
                select: {
                  text:
                    true,
                },
              },
            },

            orderBy: {
              date:
                "asc",
            },

            take:
              10000,
          })
        : [];

    const currentRows =
      snapshots.filter(
        (
          row
        ) =>
          row.date >=
          currentStart
      );

    const previousRows =
      snapshots.filter(
        (
          row
        ) =>
          row.date >=
            previousStart &&
          row.date <=
            previousEnd
      );

    function summarizeSearch(
      rows:
        typeof snapshots
    ) {
      let impressions =
        0;

      let clicks =
        0;

      let weightedPosition =
        0;

      let positionWeight =
        0;

      for (
        const row
        of rows
      ) {
        const rowImpressions =
          row.impressions ??
          0;

        impressions +=
          rowImpressions;

        clicks +=
          row.clicks ??
          0;

        const position =
          numberOrNull(
            row.position
          );

        if (
          position !==
          null
        ) {
          const weight =
            rowImpressions >
            0
              ? rowImpressions
              : 1;

          weightedPosition +=
            position *
            weight;

          positionWeight +=
            weight;
        }
      }

      return {
        impressions,
        clicks,

        ctr:
          impressions >
          0
            ? round(
                (
                  clicks /
                  impressions
                ) *
                  100,
                1
              )
            : null,

        avgPosition:
          positionWeight >
          0
            ? round(
                weightedPosition /
                  positionWeight,
                1
              )
            : null,

        avgImpressionsPerDay:
          round(
            impressions /
              days,
            1
          ),

        avgClicksPerDay:
          round(
            clicks /
              days,
            2
          ),
      };
    }

    const currentSummary =
      summarizeSearch(
        currentRows
      );

    const previousSummary =
      summarizeSearch(
        previousRows
      );

    const dailyMap =
      new Map<
        string,
        {
          date: string;
          impressions: number;
          clicks: number;
          weightedPosition: number;
          positionWeight: number;
        }
      >();

    for (
      const row
      of currentRows
    ) {
      const key =
        dateKey(
          row.date
        );

      const bucket =
        dailyMap.get(
          key
        ) ?? {
          date:
            key,

          impressions:
            0,

          clicks:
            0,

          weightedPosition:
            0,

          positionWeight:
            0,
        };

      const impressions =
        row.impressions ??
        0;

      bucket.impressions +=
        impressions;

      bucket.clicks +=
        row.clicks ??
        0;

      const position =
        numberOrNull(
          row.position
        );

      if (
        position !==
        null
      ) {
        const weight =
          impressions >
          0
            ? impressions
            : 1;

        bucket.weightedPosition +=
          position *
          weight;

        bucket.positionWeight +=
          weight;
      }

      dailyMap.set(
        key,
        bucket
      );
    }

    const daily =
      Array.from(
        dailyMap.values()
      ).map(
        (
          bucket
        ) => ({
          date:
            bucket.date,

          impressions:
            bucket.impressions,

          clicks:
            bucket.clicks,

          avgPosition:
            bucket.positionWeight >
            0
              ? round(
                  bucket.weightedPosition /
                    bucket.positionWeight,
                  1
                )
              : null,
        })
      );

    const keywordMap =
      new Map<
        string,
        {
          keyword: string;
          impressions: number;
          clicks: number;
          weightedPosition: number;
          positionWeight: number;
        }
      >();

    for (
      const row
      of currentRows
    ) {
      const key =
        row.keyword.text;

      const bucket =
        keywordMap.get(
          key
        ) ?? {
          keyword:
            key,

          impressions:
            0,

          clicks:
            0,

          weightedPosition:
            0,

          positionWeight:
            0,
        };

      const impressions =
        row.impressions ??
        0;

      bucket.impressions +=
        impressions;

      bucket.clicks +=
        row.clicks ??
        0;

      const position =
        numberOrNull(
          row.position
        );

      if (
        position !==
        null
      ) {
        const weight =
          impressions >
          0
            ? impressions
            : 1;

        bucket.weightedPosition +=
          position *
          weight;

        bucket.positionWeight +=
          weight;
      }

      keywordMap.set(
        key,
        bucket
      );
    }

    const articleText =
      [
        article.title,
        article.h1,
        article.bodyMarkdown,
      ].join(
        "\n"
      );

    const keywords =
      Array.from(
        keywordMap.values()
      )
        .map(
          (
            bucket
          ) => {
            const avgPosition =
              bucket.positionWeight >
              0
                ? round(
                    bucket.weightedPosition /
                      bucket.positionWeight,
                    1
                  )
                : null;

            return {
              keyword:
                bucket.keyword,

              impressions:
                bucket.impressions,

              clicks:
                bucket.clicks,

              ctr:
                bucket.impressions >
                0
                  ? round(
                      (
                        bucket.clicks /
                        bucket.impressions
                      ) *
                        100,
                      1
                    )
                  : null,

              avgPosition,

              mentions:
                countPhrase(
                  articleText,
                  bucket.keyword
                ),
            };
          }
        )
        .sort(
          (
            a,
            b
          ) =>
            b.impressions -
              a.impressions ||
            b.clicks -
              a.clicks
        );

    const positioned =
      keywords.filter(
        (
          item
        ) =>
          item.avgPosition !==
          null
      );

    const search =
      {
        scope:
          targetUrl
            ? "ARTICLE_PAGE"
            : "NOT_PUBLISHED",

        targetUrl,

        days,

        hasData:
          currentRows.length >
          0,

        summary: {
          ...currentSummary,

          trackedQueries:
            keywords.length,

          top3:
            positioned.filter(
              (
                item
              ) =>
                (
                  item.avgPosition ??
                  Infinity
                ) <=
                3
            ).length,

          top10:
            positioned.filter(
              (
                item
              ) =>
                (
                  item.avgPosition ??
                  Infinity
                ) <=
                10
            ).length,

          top20:
            positioned.filter(
              (
                item
              ) =>
                (
                  item.avgPosition ??
                  Infinity
                ) <=
                20
            ).length,
        },

        previous:
          previousSummary,

        daily,

        keywords,
      };

    const trafficConnection =
      await prisma.cloudflareConnection.findUnique({
        where: {
          websiteId:
            article.brief
              .websiteId,
        },

        select: {
          snapshots: {
            where: {
              date: {
                gte:
                  previousStart,
              },
            },

            orderBy: {
              date:
                "asc",
            },

            select: {
              date:
                true,

              totalRequests:
                true,

              uniqueVisitors:
                true,

              verifiedBotRequests:
                true,

              unverifiedBotRequests:
                true,

              unclassifiedRequests:
                true,

              botCategoryBreakdown:
                true,
            },
          },
        },
      });

    const allTraffic =
      trafficConnection
        ?.snapshots ??
      [];

    const currentTraffic =
      allTraffic.filter(
        (
          row
        ) =>
          row.date >=
          currentStart
      );

    const previousTraffic =
      allTraffic.filter(
        (
          row
        ) =>
          row.date >=
            previousStart &&
          row.date <=
            previousEnd
      );

    function summarizeTraffic(
      rows:
        typeof allTraffic
    ) {
      const result =
        rows.reduce(
          (
            total,
            row
          ) => {
            total.totalRequests +=
              row.totalRequests;

            total.uniqueVisitors +=
              row.uniqueVisitors;

            total.verifiedBotRequests +=
              row.verifiedBotRequests;

            total.unverifiedBotRequests +=
              row.unverifiedBotRequests ??
              0;

            total.unclassifiedRequests +=
              row.unclassifiedRequests;

            return total;
          },
          {
            totalRequests:
              0,

            uniqueVisitors:
              0,

            verifiedBotRequests:
              0,

            unverifiedBotRequests:
              0,

            unclassifiedRequests:
              0,
          }
        );

      const observedDays =
        rows.length;

      return {
        ...result,

        observedDays,

        avgRequestsPerObservedDay:
          observedDays
            ? round(
                result.totalRequests /
                  observedDays,
                1
              )
            : null,

        avgVisitorsPerObservedDay:
          observedDays
            ? round(
                result.uniqueVisitors /
                  observedDays,
                1
              )
            : null,

        avgVerifiedBotsPerObservedDay:
          observedDays
            ? round(
                result.verifiedBotRequests /
                  observedDays,
                1
              )
            : null,
      };
    }

    const categoryTotals =
      new Map<
        string,
        number
      >();

    for (
      const row
      of currentTraffic
    ) {
      addJsonNumbers(
        row.botCategoryBreakdown,
        categoryTotals
      );
    }

    const categories =
      Array.from(
        categoryTotals.entries()
      )
        .map(
          ([
            label,
            requests,
          ]) => ({
            label,
            requests:
              round(
                requests,
                0
              ),
            group:
              botGroup(
                label
              ),
          })
        )
        .sort(
          (
            a,
            b
          ) =>
            b.requests -
            a.requests
        );

    const groupedBots =
      categories.reduce(
        (
          total,
          item
        ) => {
          if (
            item.group ===
            "AI"
          ) {
            total.ai +=
              item.requests;
          } else if (
            item.group ===
            "SEARCH"
          ) {
            total.search +=
              item.requests;
          } else {
            total.other +=
              item.requests;
          }

          return total;
        },
        {
          ai:
            0,

          search:
            0,

          other:
            0,
        }
      );

    const traffic =
      {
        scope:
          "SITE_WIDE",

        note:
          "Cloudflare traffic is currently stored for the whole website, not per article. These numbers are site context and are not attributed to this page.",

        hasData:
          currentTraffic.length >
          0,

        days,

        summary:
          summarizeTraffic(
            currentTraffic
          ),

        previous:
          summarizeTraffic(
            previousTraffic
          ),

        botGroups:
          groupedBots,

        categories,

        daily:
          currentTraffic.map(
            (
              row
            ) => ({
              date:
                dateKey(
                  row.date
                ),

              totalRequests:
                row.totalRequests,

              uniqueVisitors:
                row.uniqueVisitors,

              verifiedBotRequests:
                row.verifiedBotRequests,

              unclassifiedRequests:
                row.unclassifiedRequests,
            })
          ),
      };

    const briefLink =
      await prisma.contentBrief.findUnique({
        where: {
          id:
            article.briefId,
        },

        select: {
          outcomeActionId:
            true,
        },
      });

    const observations =
      briefLink
        ?.outcomeActionId
        ? await prisma.keywordOutcomeObservation.findMany({
            where: {
              actionId:
                briefLink.outcomeActionId,
            },

            orderBy: {
              observedAt:
                "asc",
            },

            select: {
              checkpoint:
                true,

              source:
                true,

              liveRank:
                true,

              liveRankState:
                true,

              impressions:
                true,

              clicks:
                true,

              ctr:
                true,

              averagePosition:
                true,

              pageUrl:
                true,

              observedAt:
                true,
            },
          })
        : [];

          // PLANNED_KEYWORDS_V1
      const plannedBrief =
        await prisma.contentBrief.findUnique({
          where: {
            id:
              article.briefId,
          },

          select: {
            primaryKeyword:
              true,

            secondaryKeywords:
              true,
          },
        });

      const plannedKeywords = {
        primary:
          plannedBrief
            ?.primaryKeyword ??
          "",

        secondary:
          plannedBrief
            ?.secondaryKeywords ??
          [],
      };


return NextResponse.json({
      search,

      plannedKeywords,

      traffic,

      outcome: {
        hasData:
          observations.length >
          0,

        observations:
          observations.map(
            (
              observation
            ) => ({
              checkpoint:
                observation.checkpoint,

              source:
                observation.source,

              liveRank:
                observation.liveRank,

              liveRankState:
                observation.liveRankState,

              impressions:
                observation.impressions,

              clicks:
                observation.clicks,

              ctr:
                numberOrNull(
                  observation.ctr
                ),

              averagePosition:
                numberOrNull(
                  observation.averagePosition
                ),

              pageUrl:
                observation.pageUrl,

              observedAt:
                observation.observedAt.toISOString(),
            })
          ),
      },
    });
  } catch (
    error
  ) {
    console.error(
      "content article analytics error",
      error
    );

    const {
      status,
      body,
    } =
      authErrorResponse(
        error
      );

    return NextResponse.json(
      body,
      {
        status,
      }
    );
  }
}
