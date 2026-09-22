"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  ExternalLink,
  Eye,
  Hash,
  MousePointerClick,
  RefreshCw,
  Search,
  TrendingUp,
} from "lucide-react";

import type {
  AudienceDays,
} from "./audience-intelligence";

import styles from "./audience-search-queries.module.css";


interface QueryRow {
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;

  avgPosition:
    | number
    | null;

  topPage:
    | string
    | null;
}


type GscState =
  | "DISCONNECTED"
  | "RECONNECT_REQUIRED"
  | "PROPERTY_UNAVAILABLE"
  | "TEMPORARILY_UNAVAILABLE";


interface ResponseData {
  connected: boolean;

  source:
    "GOOGLE_SEARCH_CONSOLE";

  days: number;

  state?:
    GscState;

  message?:
    string;

  connectUrl?:
    string;

  range:
    | {
        start: string;
        end: string;
      }
    | null;

  summary:
    | {
        clicks: number;
        impressions: number;
        ctr: number;

        avgPosition:
          | number
          | null;

        uniqueQueries:
          number;
      }
    | null;

  queries:
    QueryRow[];
}


function formatNumber(
  value: number
): string {
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
  ).format(value);
}


function pageLabel(
  page: string
): string {
  try {
    const url =
      new URL(page);

    return url.pathname === "/"
      ? url.hostname
      : url.pathname;
  } catch {
    return page;
  }
}


export function AudienceSearchQueries({
  websiteId,
  days,
  refreshKey = 0,
}: {
  websiteId: string;
  days: AudienceDays;
  refreshKey?: number;
}) {
  const [
    data,
    setData,
  ] =
    useState<ResponseData | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const [
    retryKey,
    setRetryKey,
  ] =
    useState(0);

  useEffect(() => {
    const controller =
      new AbortController();

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const params =
          new URLSearchParams({
            websiteId,
            days:
              String(days),
          });

        const response =
          await fetch(
            `/api/audience/search-queries?${params.toString()}`,
            {
              cache:
                "no-store",

              signal:
                controller.signal,
            }
          );

        const json:
          | ResponseData
          | {
              error?:
                string;
            } =
          await response.json();

        if (!response.ok) {
          throw new Error(
            "error" in json &&
            json.error
              ? json.error
              : "Search Console request failed."
          );
        }

        setData(
          json as ResponseData
        );
      } catch (loadError) {
        if (
          loadError instanceof DOMException &&
          loadError.name ===
            "AbortError"
        ) {
          return;
        }

        setData(null);

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Search Console request failed."
        );
      } finally {
        if (
          !controller.signal
            .aborted
        ) {
          setLoading(false);
        }
      }
    }

    void load();

    return () =>
      controller.abort();
  }, [
    websiteId,
    days,
    refreshKey,
    retryKey,
  ]);

  const reconnectUrl =
    data?.connectUrl ??
    `/api/integrations/google/connect?websiteId=${encodeURIComponent(
      websiteId
    )}`;

  return (
    <section
      className={
        styles.surface
      }
    >
      <header
        className={
          styles.header
        }
      >
        <div
          className={
            styles.titleLine
          }
        >
          <Search
            size={13}
          />

          <strong>
            Organic search
          </strong>

          <span
            className={
              styles.sourceBadge
            }
          >
            Search Console
          </span>
        </div>

        <div
          className={
            styles.headerRight
          }
        >
          {data?.range && (
            <span
              className={
                styles.range
              }
            >
              {
                data.range
                  .start
              }

              <i>→</i>

              {
                data.range
                  .end
              }
            </span>
          )}

          <button
            type="button"
            className={
              styles.refresh
            }
            aria-label="Refresh Search Console"
            disabled={
              loading
            }
            onClick={() =>
              setRetryKey(
                (value) =>
                  value + 1
              )
            }
          >
            <RefreshCw
              size={11}
              className={
                loading
                  ? styles.spin
                  : undefined
              }
            />
          </button>
        </div>
      </header>

      {loading &&
      !data ? (
        <CompactState
          title="Loading Search Console"
          detail="Fetching real search performance data."
        />
      ) : error ? (
        <CompactState
          tone="error"
          title="Search Console unavailable"
          detail={error}
          href={
            reconnectUrl
          }
          action="Reconnect"
        />
      ) : data?.state ===
        "RECONNECT_REQUIRED" ? (
        <CompactState
          tone="warning"
          title="Search Console needs reconnect"
          detail={
            data.message ??
            "Google authorization needs to be refreshed."
          }
          href={
            reconnectUrl
          }
          action="Reconnect"
        />
      ) : data?.state ===
        "PROPERTY_UNAVAILABLE" ? (
        <CompactState
          tone="warning"
          title="Website property unavailable"
          detail={
            data.message ??
            "The connected Google account cannot access this Search Console property."
          }
          href={
            reconnectUrl
          }
          action="Use another Google account"
        />
      ) : data?.state ===
          "DISCONNECTED" ||
        (
          data &&
          !data.connected
        ) ? (
        <CompactState
          title="Search Console not connected"
          detail="Connect Google Search Console to load real clicks, impressions and queries."
          href={
            reconnectUrl
          }
          action="Connect"
        />
      ) : data?.state ===
        "TEMPORARILY_UNAVAILABLE" ? (
        <CompactState
          tone="warning"
          title="Search Console temporarily unavailable"
          detail={
            data.message ??
            "Google Search Console could not be queried right now."
          }
          onAction={() =>
            setRetryKey(
              (value) =>
                value + 1
            )
          }
          action="Retry"
        />
      ) : data?.summary &&
        data.queries.length ===
          0 ? (
        <CompactState
          title="No search activity"
          detail="Google reported no real query data for the selected period."
        />
      ) : data?.summary ? (
        <>
          <div
            className={
              styles.metrics
            }
          >
            <Metric
              icon={
                MousePointerClick
              }
              label="Clicks"
              value={
                formatNumber(
                  data.summary
                    .clicks
                )
              }
            />

            <Metric
              icon={
                Eye
              }
              label="Impressions"
              value={
                formatNumber(
                  data.summary
                    .impressions
                )
              }
            />

            <Metric
              icon={
                TrendingUp
              }
              label="CTR"
              value={`${data.summary.ctr.toFixed(
                1
              )}%`}
            />

            <Metric
              icon={
                Hash
              }
              label="Avg position"
              value={
                data.summary
                  .avgPosition ===
                null
                  ? "—"
                  : data.summary.avgPosition.toFixed(
                      1
                    )
              }
            />

            <Metric
              icon={
                Search
              }
              label="Queries"
              value={
                formatNumber(
                  data.summary
                    .uniqueQueries
                )
              }
            />
          </div>

          <div
            className={
              styles.tableHeader
            }
          >
            <strong>
              Search queries
            </strong>

            <span>
              Real GSC data ·
              sorted by clicks
            </span>
          </div>

          <div
            className={
              styles.tableViewport
            }
          >
            <table
              className={
                styles.table
              }
            >
              <thead>
                <tr>
                  <th>
                    Query
                  </th>

                  <th>
                    Clicks
                  </th>

                  <th>
                    Impressions
                  </th>

                  <th>
                    CTR
                  </th>

                  <th>
                    Position
                  </th>

                  <th>
                    Landing page
                  </th>
                </tr>
              </thead>

              <tbody>
                {data.queries.map(
                  (
                    query,
                    index
                  ) => (
                    <tr
                      key={`${query.query}-${index}`}
                    >
                      <td>
                        <div
                          className={
                            styles.queryCell
                          }
                        >
                          <span
                            className={
                              styles.rank
                            }
                          >
                            {String(
                              index +
                                1
                            ).padStart(
                              2,
                              "0"
                            )}
                          </span>

                          <strong
                            title={
                              query.query
                            }
                          >
                            {
                              query.query
                            }
                          </strong>
                        </div>
                      </td>

                      <td
                        className={
                          styles.number
                        }
                      >
                        {formatNumber(
                          query.clicks
                        )}
                      </td>

                      <td
                        className={
                          styles.number
                        }
                      >
                        {formatNumber(
                          query.impressions
                        )}
                      </td>

                      <td
                        className={
                          styles.number
                        }
                      >
                        {(
                          query.ctr *
                          100
                        ).toFixed(
                          1
                        )}
                        %
                      </td>

                      <td
                        className={
                          styles.number
                        }
                      >
                        {query.avgPosition ===
                        null
                          ? "—"
                          : query.avgPosition.toFixed(
                              1
                            )}
                      </td>

                      <td>
                        {query.topPage ? (
                          <a
                            className={
                              styles.pageLink
                            }
                            href={
                              query.topPage
                            }
                            target="_blank"
                            rel="noreferrer"
                            title={
                              query.topPage
                            }
                          >
                            <span>
                              {pageLabel(
                                query.topPage
                              )}
                            </span>

                            <ExternalLink
                              size={9}
                            />
                          </a>
                        ) : (
                          <span
                            className={
                              styles.muted
                            }
                          >
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <CompactState
          title="Search Console"
          detail="No Search Console data is available."
          href={
            reconnectUrl
          }
          action="Reconnect"
        />
      )}
    </section>
  );
}


function CompactState({
  title,
  detail,
  tone = "default",
  href,
  action,
  onAction,
}: {
  title: string;
  detail: string;

  tone?:
    | "default"
    | "warning"
    | "error";

  href?:
    string;

  action?:
    string;

  onAction?:
    () => void;
}) {
  return (
    <div
      className={
        styles.compactState
      }
      data-tone={
        tone
      }
    >
      <i />

      <div
        className={
          styles.stateCopy
        }
      >
        <strong>
          {title}
        </strong>

        <span>
          {detail}
        </span>
      </div>

      {href &&
      action ? (
        <a
          href={href}
          className={
            styles.stateAction
          }
        >
          {action}

          <ExternalLink
            size={9}
          />
        </a>
      ) : onAction &&
        action ? (
        <button
          type="button"
          className={
            styles.stateAction
          }
          onClick={
            onAction
          }
        >
          {action}

          <RefreshCw
            size={9}
          />
        </button>
      ) : null}
    </div>
  );
}


function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon:
    typeof Search;

  label:
    string;

  value:
    string;
}) {
  return (
    <div
      className={
        styles.metric
      }
    >
      <span>
        <Icon
          size={10}
        />

        {label}
      </span>

      <strong>
        {value}
      </strong>
    </div>
  );
}
