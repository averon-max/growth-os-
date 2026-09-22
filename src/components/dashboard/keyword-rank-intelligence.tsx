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
    return "Нет данных";
  }

  return `≈ ${value.toFixed(
    1
  )} место`;
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
        "Пока нет сравнения",
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
      "Без сильных изменений",
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
      return "Уже очень высоко — важно не потерять позицию.";

    case "QUICK_WIN":
      return "Вы уже близко к верхним результатам. Это хорошая возможность для роста.";

    case "RISING":
      return "Запрос уже растёт. Стоит усилить страницу, пока есть движение вверх.";

    case "DECLINING":
      return "Позиция падает. Нужно проверить страницу и конкурентов.";

    case "NO_VISIBILITY":
      return "Google пока почти не показывает сайт по этому запросу.";

    default:
      return "Есть потенциал для роста, но сначала нужно понять, что мешает странице.";
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
                "Не удалось загрузить данные из Google."
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
              : "Не удалось загрузить данные из Google."
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
            Поиск Google
          </p>

          <h2
            className={
              styles.title
            }
          >
            Как люди находят ваш сайт
          </h2>

          <p
            className={
              styles.subtitle
            }
          >
            Здесь видно, по каким запросам Google показывает ваш сайт,
            где вы находитесь в результатах и какие запросы проще всего
            поднять выше.
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
                  {value} дней
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
            Загружаем реальные данные Google Search Console…
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
            Пока нет данных для анализа.
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
                  Запросов отслеживаем
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
                  Поисковые запросы, найденные системой
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
                  Показы в Google
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
                  Сколько раз люди видели ваш сайт
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
                  В среднем на запрос
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
                  Среднее число показов одного запроса
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
                  Переходы из Google
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
                  Сколько раз люди открыли ваш сайт
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
                  Среднее место
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
                  Чем меньше число, тем выше сайт
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
                  На первой странице
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
                  Запросы примерно в Top 10
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
                Почти на первой странице{" "}
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
                Поднялись{" "}
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
                Опустились{" "}
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
                      Видимость сайта в Google
                    </h3>

                    <p
                      className={
                        styles.panelCopy
                      }
                    >
                      Сравниваем все ваши показы со средним количеством
                      показов одного поискового запроса.
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
                      Ваши показы
                    </span>

                    <span
                      className={
                        styles.legendSecondary
                      }
                    >
                      Среднее на запрос
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
                        name="Ваши показы"
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
                        name="Среднее на запрос"
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
                    Где проще всего вырасти
                  </h3>

                  <p
                    className={
                      styles.panelCopy
                    }
                  >
                    Сначала показываем запросы, где сайт уже близко к
                    верхним результатам и есть реальный поисковый спрос.
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
                          Что ищут
                        </th>

                        <th
                          style={{
                            width:
                              "16%",
                          }}
                        >
                          Где вы
                        </th>

                        <th
                          style={{
                            width:
                              "13%",
                          }}
                        >
                          7 дней
                        </th>

                        <th
                          style={{
                            width:
                              "12%",
                          }}
                        >
                          Показы
                        </th>

                        <th
                          style={{
                            width:
                              "12%",
                          }}
                        >
                          Ищут/мес
                        </th>

                        <th
                          style={{
                            width:
                              "19%",
                          }}
                        >
                          Что это значит
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
              “Место в Google” здесь — среднее место по реальным данным
              Google Search Console. Оно может отличаться у разных людей,
              устройств и городов. Позже точную проверку конкретной выдачи
              добавим через Live SERP.
            </div>
          </>
        )
      }
    </section>
  );
}
