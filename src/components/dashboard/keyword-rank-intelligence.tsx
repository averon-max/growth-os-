"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import styles from "./keyword-rank-intelligence.module.css";

type Days =
  | 7
  | 28
  | 90;

type KeywordSignal =
  | "TOP"
  | "QUICK_WIN"
  | "RISING"
  | "DECLINING"
  | "NO_VISIBILITY"
  | "IMPROVE";

type AnalyticsResponse = {
  days: Days;

  stats: {
    trackedKeywords: number;
    keywordsWithData: number;
    impressions: number;
    avgImpressionsPerKeyword: number | null;
    clicks: number;
    ctr: number | null;
    avgPosition: number | null;
    top3: number;
    top10: number;
    top20: number;
    nearFirstPage: number;
    improved: number;
    declined: number;
  };

  chart: Array<{
    date: string;
    impressions: number;
    avgImpressions: number;
    clicks: number;
    avgPosition: number | null;
  }>;

  keywords: Array<{
    id: string;
    keyword: string;
    position: number | null;
    positionDelta7d: number | null;
    positionDelta28d: number | null;
    impressions: number;
    clicks: number;
    ctr: number | null;
    volume: number | null;
    difficulty: number | null;
    rankingUrl: string | null;
    signal: KeywordSignal;
    opportunityScore: number;
  }>;
};

function number(
  value: number | null
): string {
  if (
    value ===
    null
  ) {
    return "—";
  }

  return new Intl.NumberFormat(
    "en-US",
    {
      notation:
        value >=
        10000
          ? "compact"
          : "standard",

      maximumFractionDigits:
        1,
    }
  ).format(
    value
  );
}

function positionText(
  value: number | null
): string {
  if (
    value ===
    null
  ) {
    return "No data";
  }

  return `≈ ${value.toFixed(
    1
  )} pos.`;
}

function changeText(
  value: number | null
): {
  text: string;
  className: string;
} {
  if (
    value ===
    null
  ) {
    return {
      text:
        "No comparison yet",
      className:
        styles.flat,
    };
  }

  if (
    value >=
    1
  ) {
    return {
      text:
        `↑ ${value.toFixed(
          1
        )}`,
      className:
        styles.up,
    };
  }

  if (
    value <=
    -1
  ) {
    return {
      text:
        `↓ ${Math.abs(
          value
        ).toFixed(
          1
        )}`,
      className:
        styles.down,
    };
  }

  return {
    text:
      "No major changes",
    className:
      styles.flat,
  };
}

function meaningText(
  signal: KeywordSignal
): string {
  switch (
    signal
  ) {
    case "TOP":
      return "Already near the top. Focus on holding the position.";

    case "QUICK_WIN":
      return "Close to the top results. A strong growth opportunity.";

    case "RISING":
      return "This query is climbing. Strengthen the page while it moves up.";

    case "DECLINING":
      return "Position is dropping. Review the page and competitors.";

    case "NO_VISIBILITY":
      return "Google rarely shows the site for this query yet.";

    default:
      return "Room to grow. First find what is holding the page back.";
  }
}

function shortDate(
  value: string
): string {
  const date =
    new Date(
      `${value}T00:00:00Z`
    );

  return date.toLocaleDateString(
    "en-US",
    {
      month:
        "short",

      day:
        "numeric",

      timeZone:
        "UTC",
    }
  );
}

export function KeywordRankIntelligence({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const [
    days,
    setDays,
  ] =
    useState<Days>(
      28
    );

  const [
    data,
    setData,
  ] =
    useState<AnalyticsResponse | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const load =
    useCallback(
      async () => {
        setLoading(
          true
        );

        setError(
          null
        );

        try {
          const response =
            await fetch(
              `/api/keywords/analytics?workspaceId=${encodeURIComponent(
                workspaceId
              )}&days=${days}`,
              {
                cache:
                  "no-store",
              }
            );

          const payload =
            await response.json() as AnalyticsResponse & {
              error?: string;
            };

          if (
            !response.ok
          ) {
            throw new Error(
              payload.error ??
                "Could not load data from Google."
            );
          }

          setData(
            payload
          );
        } catch (
          err
        ) {
          setError(
            err instanceof Error
              ? err.message
              : "Could not load data from Google."
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        workspaceId,
        days,
      ]
    );

  useEffect(
    () => {
      void load();
    },
    [
      load,
    ]
  );

  return (
    <section
      className={
        styles.shell
      }
    >
      <div
        className={
          styles.header
        }
      >
        <div>
          <p
            className={
              styles.eyebrow
            }
          >
            Google Search
          </p>

          <h2
            className={
              styles.title
            }
          >
            How people find your site
          </h2>

          <p
            className={
              styles.subtitle
            }
          >
            Which queries Google shows your site for,
            where you rank, and which queries are easiest
            to move up.
          </p>
        </div>

        <div
          className={
            styles.periods
          }
        >
          {
            (
              [
                7,
                28,
                90,
              ] as Days[]
            ).map(
              (
                value
              ) => (
                <button
                  key={
                    value
                  }
                  type="button"
                  className={`${styles.periodButton} ${
                    days ===
                    value
                      ? styles.periodActive
                      : ""
                  }`}
                  onClick={
                    () =>
                      setDays(
                        value
                      )
                  }
                >
                  {value} days
                </button>
              )
            )
          }
        </div>
      </div>

      {
        loading &&
        !data ? (
          <div
            className={
              styles.loading
            }
          >
            Loading real Google Search Console data…
          </div>
        ) : error ? (
          <div
            className={
              styles.error
            }
          >
            {error}
          </div>
        ) : !data ? (
          <div
            className={
              styles.empty
            }
          >
            No data to analyze yet.
          </div>
        ) : (
          <>
            <div
              className={
                styles.metrics
              }
            >
              <div
                className={
                  styles.metric
                }
              >
                <span
                  className={
                    styles.metricLabel
                  }
                >
                  Tracked queries
                </span>

                <strong
                  className={
                    styles.metricValue
                  }
                >
                  {number(
                    data.stats.trackedKeywords
                  )}
                </strong>

                <span
                  className={
                    styles.metricHint
                  }
                >
                  Queries found for this site
                </span>
              </div>

              <div
                className={
                  styles.metric
                }
              >
                <span
                  className={
                    styles.metricLabel
                  }
                >
                  Impressions
                </span>

                <strong
                  className={
                    styles.metricValue
                  }
                >
                  {number(
                    data.stats.impressions
                  )}
                </strong>

                <span
                  className={
                    styles.metricHint
                  }
                >
                  Times your site was shown
                </span>
              </div>

              <div
                className={
                  styles.metric
                }
              >
                <span
                  className={
                    styles.metricLabel
                  }
                >
                  Avg per query
                </span>

                <strong
                  className={
                    styles.metricValue
                  }
                >
                  {number(
                    data.stats.avgImpressionsPerKeyword
                  )}
                </strong>

                <span
                  className={
                    styles.metricHint
                  }
                >
                  Average impressions per query
                </span>
              </div>

              <div
                className={
                  styles.metric
                }
              >
                <span
                  className={
                    styles.metricLabel
                  }
                >
                  Clicks
                </span>

                <strong
                  className={
                    styles.metricValue
                  }
                >
                  {number(
                    data.stats.clicks
                  )}
                </strong>

                <span
                  className={
                    styles.metricHint
                  }
                >
                  Visits from Google search
                </span>
              </div>

              <div
                className={
                  styles.metric
                }
              >
                <span
                  className={
                    styles.metricLabel
                  }
                >
                  Avg position
                </span>

                <strong
                  className={
                    styles.metricValue
                  }
                >
                  {
                    data.stats.avgPosition ===
                    null
                      ? "—"
                      : `≈ ${data.stats.avgPosition.toFixed(
                          1
                        )}`
                  }
                </strong>

                <span
                  className={
                    styles.metricHint
                  }
                >
                  Lower is better
                </span>
              </div>

              <div
                className={
                  styles.metric
                }
              >
                <span
                  className={
                    styles.metricLabel
                  }
                >
                  Page one
                </span>

                <strong
                  className={
                    styles.metricValue
                  }
                >
                  {number(
                    data.stats.top10
                  )}
                </strong>

                <span
                  className={
                    styles.metricHint
                  }
                >
                  Queries in the top 10
                </span>
              </div>
            </div>

            <div
              className={
                styles.summaryStrip
              }
            >
              <div
                className={
                  styles.summaryItem
                }
              >
                Top 3{" "}
                <strong>
                  {
                    data.stats.top3
                  }
                </strong>
              </div>

              <div
                className={
                  styles.summaryItem
                }
              >
                Top 10{" "}
                <strong>
                  {
                    data.stats.top10
                  }
                </strong>
              </div>

              <div
                className={
                  styles.summaryItem
                }
              >
                Top 20{" "}
                <strong>
                  {
                    data.stats.top20
                  }
                </strong>
              </div>

              <div
                className={
                  styles.summaryItem
                }
              >
                Striking distance{" "}
                <strong>
                  {
                    data.stats.nearFirstPage
                  }
                </strong>
              </div>

              <div
                className={
                  styles.summaryItem
                }
              >
                Up{" "}
                <strong>
                  {
                    data.stats.improved
                  }
                </strong>
              </div>

              <div
                className={
                  styles.summaryItem
                }
              >
                Down{" "}
                <strong>
                  {
                    data.stats.declined
                  }
                </strong>
              </div>
            </div>

            <div
              className={
                styles.contentGrid
              }
            >
              <div
                className={
                  styles.chartPanel
                }
              >
                <div
                  className={
                    styles.panelHead
                  }
                >
                  <div>
                    <h3
                      className={
                        styles.panelTitle
                      }
                    >
                      Google visibility
                    </h3>

                    <p
                      className={
                        styles.panelCopy
                      }
                    >
                      Total impressions compared with the average
                      impressions of a single query.
                    </p>
                  </div>

                  <div
                    className={
                      styles.legend
                    }
                  >
                    <span
                      className={
                        styles.legendPrimary
                      }
                    >
                      Your impressions
                    </span>

                    <span
                      className={
                        styles.legendSecondary
                      }
                    >
                      Avg per query
                    </span>
                  </div>
                </div>

                <div
                  className={
                    styles.chart
                  }
                >
                  <ResponsiveContainer
                    width="100%"
                    height="100%"
                  >
                    <LineChart
                      data={
                        data.chart
                      }
                      margin={{
                        top:
                          6,
                        right:
                          8,
                        left:
                          -16,
                        bottom:
                          0,
                      }}
                    >
                      <CartesianGrid
                        stroke="var(--border)"
                        vertical={
                          false
                        }
                      />

                      <XAxis
                        dataKey="date"
                        tickFormatter={
                          shortDate
                        }
                        tick={{
                          fill:
                            "var(--secondary)",
                          fontSize:
                            9,
                        }}
                        axisLine={{
                          stroke:
                            "var(--border)",
                        }}
                        tickLine={
                          false
                        }
                        minTickGap={
                          28
                        }
                      />

                      <YAxis
                        yAxisId="total"
                        tick={{
                          fill:
                            "var(--secondary)",
                          fontSize:
                            9,
                        }}
                        axisLine={
                          false
                        }
                        tickLine={
                          false
                        }
                        width={
                          48
                        }
                      />

                      <YAxis
                        yAxisId="average"
                        orientation="right"
                        tick={{
                          fill:
                            "var(--secondary)",
                          fontSize:
                            9,
                        }}
                        axisLine={
                          false
                        }
                        tickLine={
                          false
                        }
                        width={
                          42
                        }
                      />

                      <Tooltip
                        contentStyle={{
                          background:
                            "var(--elevated)",
                          border:
                            "1px solid var(--border)",
                          borderRadius:
                            6,
                          fontSize:
                            10,
                        }}
                        labelFormatter={
                          (
                            label
                          ) =>
                            shortDate(
                              String(
                                label
                              )
                            )
                        }
                      />

                      <Line
                        yAxisId="total"
                        type="monotone"
                        dataKey="impressions"
                        name="Your impressions"
                        stroke="var(--accent)"
                        strokeWidth={
                          2
                        }
                        dot={
                          false
                        }
                        isAnimationActive={
                          false
                        }
                      />

                      <Line
                        yAxisId="average"
                        type="monotone"
                        dataKey="avgImpressions"
                        name="Avg per query"
                        stroke="var(--secondary)"
                        strokeWidth={
                          1.5
                        }
                        strokeDasharray="4 4"
                        dot={
                          false
                        }
                        isAnimationActive={
                          false
                        }
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div
                className={
                  styles.tablePanel
                }
              >
                <div
                  className={
                    styles.tableHeader
                  }
                >
                  <h3
                    className={
                      styles.panelTitle
                    }
                  >
                    Easiest wins
                  </h3>

                  <p
                    className={
                      styles.panelCopy
                    }
                  >
                    Queries close to the top results with
                    real search demand, shown first.
                  </p>
                </div>

                <div
                  className={
                    styles.tableWrap
                  }
                >
                  <table
                    className={
                      styles.table
                    }
                  >
                    <thead>
                      <tr>
                        <th
                          style={{
                            width:
                              "28%",
                          }}
                        >
                          Query
                        </th>

                        <th
                          style={{
                            width:
                              "16%",
                          }}
                        >
                          Position
                        </th>

                        <th
                          style={{
                            width:
                              "13%",
                          }}
                        >
                          7 days
                        </th>

                        <th
                          style={{
                            width:
                              "12%",
                          }}
                        >
                          Impressions
                        </th>

                        <th
                          style={{
                            width:
                              "12%",
                          }}
                        >
                          Volume/mo
                        </th>

                        <th
                          style={{
                            width:
                              "19%",
                          }}
                        >
                          Insight
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {
                        data.keywords
                          .slice(
                            0,
                            15
                          )
                          .map(
                            (
                              keyword
                            ) => {
                              const change =
                                changeText(
                                  keyword.positionDelta7d
                                );

                              return (
                                <tr
                                  key={
                                    keyword.id
                                  }
                                >
                                  <td>
                                    <div
                                      className={
                                        styles.keyword
                                      }
                                      title={
                                        keyword.keyword
                                      }
                                    >
                                      {
                                        keyword.keyword
                                      }
                                    </div>
                                  </td>

                                  <td>
                                    <span
                                      className={
                                        styles.position
                                      }
                                    >
                                      {
                                        positionText(
                                          keyword.position
                                        )
                                      }
                                    </span>
                                  </td>

                                  <td>
                                    <span
                                      className={
                                        change.className
                                      }
                                    >
                                      {
                                        change.text
                                      }
                                    </span>
                                  </td>

                                  <td>
                                    {
                                      number(
                                        keyword.impressions
                                      )
                                    }
                                  </td>

                                  <td>
                                    {
                                      number(
                                        keyword.volume
                                      )
                                    }
                                  </td>

                                  <td
                                    className={
                                      styles.meaning
                                    }
                                  >
                                    {
                                      meaningText(
                                        keyword.signal
                                      )
                                    }
                                  </td>
                                </tr>
                              );
                            }
                          )
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div
              className={
                styles.notice
              }
            >
              Position is the average position from real
              Google Search Console data. It varies by user,
              device and location. For an exact check of a specific SERP
              use Live SERP.
            </div>
          </>
        )
      }
    </section>
  );
}
