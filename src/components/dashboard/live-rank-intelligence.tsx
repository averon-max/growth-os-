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
          "Among the most visible results. Hold the position.",
        className:
          styles.good,
      };

    case "FIRST_PAGE":
      return {
        text:
          "On Google's first page. Strengthen the page to move higher.",
        className:
          styles.good,
      };

    case "NEAR_FIRST_PAGE":
      return {
        text:
          "Very close to page one. One of the best growth opportunities.",
        className:
          styles.warn,
      };

    case "BUILDING":
      return {
        text:
          "Google sees the page, but it needs strengthening to reach page one.",
        className:
          styles.warn,
      };

    case "LOW_VISIBILITY":
      return {
        text:
          "The site shows for this query but is far from the top results.",
        className:
          styles.bad,
      };

    case "CHECK_FAILED":
      return {
        text:
          "Could not check this query right now. Other results are still available.",
        className:
          styles.bad,
      };

    default:
      return {
        text:
          "Not in Google's top 100 organic results for this query yet.",
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
    return "Good opportunity";
  }

  if (
    priority === "MEDIUM"
  ) {
    return "Worth a look";
  }

  return "Long term";
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
                "Could not load the rank check."
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
              : "Could not load the rank check."
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
              "Could not check positions."
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
            : "Could not check positions."
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
            Where you rank in Google now
          </h2>

          <p
            className={
              styles.copy
            }
          >
            Hyprlyx takes real search queries for your business
            and checks where the site ranks right now.
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
              ? "Checking Google…"
              : report
                ? "Refresh positions"
                : "Check positions"
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
            Looking for saved results…
          </div>
        ) : !report ? (
          <div
            className={
              styles.state
            }
          >
            Click “Check positions”. Hyprlyx will pick a few
            important queries for your business and check the site
            against Google's top 100 results.
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
                  queries checked
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
                  on page one
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
                  close to page one
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
                  growth opportunities
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
                      Query
                    </th>

                    <th
                      style={{
                        width:
                          "12%",
                      }}
                    >
                      Your position
                    </th>

                    <th
                      style={{
                        width:
                          "10%",
                      }}
                    >
                      Volume/mo
                    </th>

                    <th
                      style={{
                        width:
                          "10%",
                      }}
                    >
                      Difficulty
                    </th>

                    <th
                      style={{
                        width:
                          "47%",
                      }}
                    >
                      Insight
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
                                    ? "Error"
                                    : item.rank ===
                                        null
                                      ? "Not in top 100"
                                      : `#${item.rank}`
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
                                Why not higher?
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
                                      Details
                                    </summary>

                                    <div
                                      className={
                                        styles.detailBody
                                      }
                                    >
                                      {
                                        item.rankingUrl && (
                                          <>
                                            Your ranking page:
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
                                            Ranking above you:
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
                Checked for {report.marketLabel} · desktop · top 100 results.
              </span>

              <span>
                Last check:{" "}
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
