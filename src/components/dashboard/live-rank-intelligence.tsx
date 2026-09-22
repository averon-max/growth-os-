"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  SearchCheck,
} from "lucide-react";

import { KeywordOpportunityDiagnosis } from "./keyword-opportunity-diagnosis";
import styles from "./live-rank-intelligence.module.css";

type LiveRankStatus =
  | "TOP_3"
  | "FIRST_PAGE"
  | "NEAR_FIRST_PAGE"
  | "BUILDING"
  | "LOW_VISIBILITY"
  | "NOT_TOP_100"
  | "CHECK_FAILED";

type LiveRankPriority =
  | "HIGH"
  | "MEDIUM"
  | "LOW";

type LiveRankReport = {
  domain: string;
  market: string;
  marketLabel: string;
  seed: string;
  checkedAt: string;
  device: "desktop";
  depth: 100;

  keywords: Array<{
    keyword: string;
    rank: number | null;
    rankingUrl: string | null;
    searchVolume: number | null;
    difficulty: number | null;
    status: LiveRankStatus;
    priority: LiveRankPriority;

    competitors: Array<{
      rank: number;
      domain: string;
      url: string;
      title: string;
    }>;
  }>;
};

function metric(
  value: number | null
): string {
  if (
    value === null
  ) {
    return "—";
  }

  return new Intl.NumberFormat(
    "en-US",
    {
      notation:
        value >= 10000
          ? "compact"
          : "standard",

      maximumFractionDigits:
        1,
    }
  ).format(
    value
  );
}

function statusCopy(
  status: LiveRankStatus
): {
  text: string;
  className: string;
} {
  switch (
    status
  ) {
    case "TOP_3":
      return {
        text:
          "Вы уже среди самых заметных результатов. Главное — удержать позицию.",
        className:
          styles.good,
      };

    case "FIRST_PAGE":
      return {
        text:
          "Вы уже на первой странице Google. Есть смысл усилить страницу и двигаться выше.",
        className:
          styles.good,
      };

    case "NEAR_FIRST_PAGE":
      return {
        text:
          "Вы очень близко к первой странице. Это одна из лучших возможностей для роста.",
        className:
          styles.warn,
      };

    case "BUILDING":
      return {
        text:
          "Google уже видит вашу страницу, но ей ещё нужно усиление, чтобы приблизиться к первой странице.",
        className:
          styles.warn,
      };

    case "LOW_VISIBILITY":
      return {
        text:
          "Сайт показывается по этому запросу, но пока находится далеко от верхних результатов.",
        className:
          styles.bad,
      };

    case "CHECK_FAILED":
      return {
        text:
          "Не удалось проверить этот запрос сейчас. Остальные результаты всё равно доступны.",
        className:
          styles.bad,
      };

    default:
      return {
        text:
          "Ваш сайт пока не найден среди первых 100 обычных результатов Google по этому запросу.",
        className:
          styles.bad,
      };
  }
}

function priorityCopy(
  priority: LiveRankPriority
): string {
  if (
    priority === "HIGH"
  ) {
    return "Хорошая возможность";
  }

  if (
    priority === "MEDIUM"
  ) {
    return "Стоит изучить";
  }

  return "Долгосрочно";
}

export function LiveRankIntelligence({
  workspaceId,
  websiteId,
  market,
}: {
  workspaceId: string;
  websiteId: string;
  market: string;
}) {
  const [
    report,
    setReport,
  ] =
    useState<LiveRankReport | null>(
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
    refreshing,
    setRefreshing,
  ] =
    useState(
      false
    );

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const [
    diagnosisKeyword,
    setDiagnosisKeyword,
  ] =
    useState<string | null>(
      null
    );

  const params =
    useMemo(
      () =>
        new URLSearchParams({
          workspaceId,
          websiteId,
          market,
        }).toString(),
      [
        workspaceId,
        websiteId,
        market,
      ]
    );

  const loadCached =
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
              `/api/keywords/live-rank?${params}`,
              {
                cache:
                  "no-store",
              }
            );

          const data =
            await response.json() as {
              report?: LiveRankReport | null;
              error?: string;
            };

          if (
            !response.ok
          ) {
            throw new Error(
              data.error ??
                "Не удалось загрузить проверку позиций."
            );
          }

          setReport(
            data.report ??
              null
          );
        } catch (
          err
        ) {
          setError(
            err instanceof Error
              ? err.message
              : "Не удалось загрузить проверку позиций."
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        params,
      ]
    );

  useEffect(
    () => {
      void loadCached();
    },
    [
      loadCached,
    ]
  );

  const refresh =
    async () => {
      setRefreshing(
        true
      );

      setError(
        null
      );

      try {
        const response =
          await fetch(
            `/api/keywords/live-rank?${params}`,
            {
              method:
                "POST",

              cache:
                "no-store",

              credentials:
                "same-origin",
            }
          );

        const data =
          await response.json() as {
            report?: LiveRankReport;
            error?: string;
          };

        if (
          !response.ok ||
          !data.report
        ) {
          throw new Error(
            data.error ??
              "Не удалось проверить позиции."
          );
        }

        setReport(
          data.report
        );
      } catch (
        err
      ) {
        setError(
          err instanceof Error
            ? err.message
            : "Не удалось проверить позиции."
        );
      } finally {
        setRefreshing(
          false
        );
      }
    };

  const stats =
    useMemo(
      () => {
        const keywords =
          report?.keywords ??
          [];

        return {
          checked:
            keywords.length,

          firstPage:
            keywords.filter(
              (
                item
              ) =>
                item.rank !== null &&
                item.rank <= 10
            ).length,

          close:
            keywords.filter(
              (
                item
              ) =>
                item.rank !== null &&
                item.rank >= 11 &&
                item.rank <= 20
            ).length,

          opportunities:
            keywords.filter(
              (
                item
              ) =>
                item.priority ===
                "HIGH"
            ).length,
        };
      },
      [
        report,
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
            Live Google check
          </p>

          <h2
            className={
              styles.title
            }
          >
            <SearchCheck
              size={
                13
              }
              style={{
                marginRight:
                  6,
                verticalAlign:
                  -2,
              }}
            />
            Где вы сейчас в Google
          </h2>

          <p
            className={
              styles.copy
            }
          >
            Growth OS берёт реальные поисковые запросы для вашего бизнеса
            и проверяет, на каком месте сайт находится прямо сейчас.
          </p>
        </div>

        <button
          type="button"
          className={
            styles.button
          }
          disabled={
            refreshing
          }
          onClick={
            () =>
              void refresh()
          }
        >
          {
            refreshing
              ? "Проверяем Google…"
              : report
                ? "Обновить позиции"
                : "Проверить позиции"
          }
        </button>
      </div>

      {
        error && (
          <div
            className={
              styles.error
            }
          >
            {error}
          </div>
        )
      }

      {
        loading ? (
          <div
            className={
              styles.state
            }
          >
            Проверяем, есть ли сохранённые результаты…
          </div>
        ) : !report ? (
          <div
            className={
              styles.state
            }
          >
            Нажмите «Проверить позиции». Growth OS найдёт несколько
            важных поисковых запросов для вашего бизнеса и проверит сайт
            среди первых 100 результатов Google.
          </div>
        ) : (
          <>
            <div
              className={
                styles.summary
              }
            >
              <div
                className={
                  styles.stat
                }
              >
                <strong
                  className={
                    styles.statValue
                  }
                >
                  {
                    stats.checked
                  }
                </strong>

                <span
                  className={
                    styles.statLabel
                  }
                >
                  запросов проверено
                </span>
              </div>

              <div
                className={
                  styles.stat
                }
              >
                <strong
                  className={
                    styles.statValue
                  }
                >
                  {
                    stats.firstPage
                  }
                </strong>

                <span
                  className={
                    styles.statLabel
                  }
                >
                  уже на первой странице
                </span>
              </div>

              <div
                className={
                  styles.stat
                }
              >
                <strong
                  className={
                    styles.statValue
                  }
                >
                  {
                    stats.close
                  }
                </strong>

                <span
                  className={
                    styles.statLabel
                  }
                >
                  очень близко к первой странице
                </span>
              </div>

              <div
                className={
                  styles.stat
                }
              >
                <strong
                  className={
                    styles.statValue
                  }
                >
                  {
                    stats.opportunities
                  }
                </strong>

                <span
                  className={
                    styles.statLabel
                  }
                >
                  хорошие возможности для роста
                </span>
              </div>
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
                          "21%",
                      }}
                    >
                      Что ищут
                    </th>

                    <th
                      style={{
                        width:
                          "12%",
                      }}
                    >
                      Ваше место
                    </th>

                    <th
                      style={{
                        width:
                          "10%",
                      }}
                    >
                      Ищут/мес
                    </th>

                    <th
                      style={{
                        width:
                          "10%",
                      }}
                    >
                      Сложность
                    </th>

                    <th
                      style={{
                        width:
                          "47%",
                      }}
                    >
                      Что это значит
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {
                    report.keywords.map(
                      (
                        item
                      ) => {
                        const status =
                          statusCopy(
                            item.status
                          );

                        return (
                          <tr
                            key={
                              item.keyword
                            }
                          >
                            <td>
                              <div
                                className={
                                  styles.keyword
                                }
                              >
                                {
                                  item.keyword
                                }
                              </div>

                              <span
                                className={
                                  styles.priority
                                }
                              >
                                {
                                  priorityCopy(
                                    item.priority
                                  )
                                }
                              </span>
                            </td>

                            <td>
                              <span
                                className={
                                  styles.rank
                                }
                              >
                                {
                                  item.status ===
                                  "CHECK_FAILED"
                                    ? "Ошибка"
                                    : item.rank ===
                                        null
                                      ? "Не в Top 100"
                                      : `${item.rank} место`
                                }
                              </span>
                            </td>

                            <td>
                              {
                                metric(
                                  item.searchVolume
                                )
                              }
                            </td>

                            <td>
                              {
                                metric(
                                  item.difficulty
                                )
                              }
                            </td>

                            <td>
                              <div
                                className={`${styles.explanation} ${status.className}`}
                              >
                                {
                                  status.text
                                }
                              </div>

                              <button
                                type="button"
                                className={
                                  styles.diagnoseButton
                                }
                                onClick={
                                  () =>
                                    setDiagnosisKeyword(
                                      item.keyword
                                    )
                                }
                              >
                                Почему я не выше?
                              </button>

                              {
                                (
                                  item.rankingUrl ||
                                  item.competitors.length >
                                    0
                                ) && (
                                  <details
                                    className={
                                      styles.details
                                    }
                                  >
                                    <summary>
                                      Детали
                                    </summary>

                                    <div
                                      className={
                                        styles.detailBody
                                      }
                                    >
                                      {
                                        item.rankingUrl && (
                                          <>
                                            В Google ранжируется ваша страница:
                                            <span
                                              className={
                                                styles.url
                                              }
                                            >
                                              {
                                                item.rankingUrl
                                              }
                                            </span>
                                          </>
                                        )
                                      }

                                      {
                                        item.competitors.length >
                                          0 && (
                                          <div
                                            style={{
                                              marginTop:
                                                7,
                                            }}
                                          >
                                            Выше в результатах:
                                            {
                                              item.competitors
                                                .slice(
                                                  0,
                                                  3
                                                )
                                                .map(
                                                  (
                                                    competitor
                                                  ) => (
                                                    <div
                                                      key={`${competitor.rank}-${competitor.url}`}
                                                      className={
                                                        styles.url
                                                      }
                                                    >
                                                      #{competitor.rank}{" "}
                                                      {
                                                        competitor.domain
                                                      }
                                                    </div>
                                                  )
                                                )
                                            }
                                          </div>
                                        )
                                      }
                                    </div>
                                  </details>
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

            {
              diagnosisKeyword && (
                <KeywordOpportunityDiagnosis
                  websiteId={websiteId}
                  keyword={diagnosisKeyword}
                  market={market}
                  onClose={
                    () =>
                      setDiagnosisKeyword(
                        null
                      )
                  }
                />
              )
            }

            <div
              className={
                styles.footer
              }
            >
              <span>
                Проверено для {report.marketLabel} · desktop · первые 100 результатов.
              </span>

              <span>
                Последняя проверка:{" "}
                {
                  new Date(
                    report.checkedAt
                  ).toLocaleString()
                }
              </span>
            </div>
          </>
        )
      }
    </section>
  );
}
