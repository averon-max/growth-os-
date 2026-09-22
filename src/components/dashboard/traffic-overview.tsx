"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Activity,
  Bot,
  Database,
  Globe2,
  Network,
  Radio,
  TrendingDown,
  TrendingUp,
  Users,
  Wifi,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import type { AudienceDays } from "./audience-intelligence";
import styles from "./traffic-overview.module.css";

interface CountryBreakdownEntry {
  country: string;
  requests: number;
  visits: number;
}

interface DeviceBreakdownEntry {
  device: string;
  requests: number;
  visits: number;
}

interface BotCategoryEntry {
  category: string;
  requests: number;
}

interface Snapshot {
  date: string;
  totalRequests: number;
  unclassifiedRequests: number;
  verifiedBotRequests: number;
  unverifiedBotRequests: number | null;
  threatsBlocked: number | null;
  uniqueVisitors: number;
  bandwidthBytes: string;

  countryBreakdown:
    | CountryBreakdownEntry[]
    | null;

  deviceBreakdown:
    | DeviceBreakdownEntry[]
    | null;

  botCategoryBreakdown:
    | BotCategoryEntry[]
    | null;
}

interface ResponseData {
  connected: boolean;
  source: "CLOUDFLARE";

  days?: number;

  requestedRange?: {
    start: string;
    end: string;
  };

  requestedDays?: number;
  availableDays?: number;
  missingDays?: number;
  availableFrom?: string | null;
  availableTo?: string | null;
  lastSyncedAt?: string | null;
  snapshots: Snapshot[];
}

interface AggregateRow {
  key: string;
  requests: number;
  visits: number;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation:
      Math.abs(value) >= 10000
        ? "compact"
        : "standard",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatBytes(bytes: number) {
  if (
    !Number.isFinite(bytes) ||
    bytes <= 0
  ) {
    return "0 B";
  }

  const units = [
    "B",
    "KB",
    "MB",
    "GB",
    "TB",
  ];

  const index = Math.min(
    Math.floor(
      Math.log(bytes) /
        Math.log(1024)
    ),
    units.length - 1
  );

  return `${(
    bytes /
    1024 ** index
  ).toFixed(index >= 2 ? 1 : 0)} ${
    units[index]
  }`;
}

function shortDate(value: string) {
  const [, month, day] =
    value.split("-");

  return `${month}-${day}`;
}

function readableDate(value: string) {
  const [year, month, day] =
    value.split("-").map(Number);

  return new Intl.DateTimeFormat(
    "en-US",
    {
      month: "short",
      day: "numeric",
    }
  ).format(
    new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    )
  );
}

function formatPercent(value: number) {
  const sign =
    value > 0 ? "+" : "";

  return `${sign}${value.toFixed(1)}%`;
}

export function TrafficOverview({
  websiteId,
  days,
  refreshKey = 0,
}: {
  websiteId: string;
  days: AudienceDays;
  refreshKey?: number;
}) {
  const [data, setData] =
    useState<ResponseData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

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
            days: String(days),
          });

        const response = await fetch(
          `/api/traffic?${params.toString()}`,
          {
            cache: "no-store",
            signal:
              controller.signal,
          }
        );

        const json =
          (await response.json()) as
            | ResponseData
            | { error?: string };

        if (!response.ok) {
          throw new Error(
            "error" in json &&
              json.error
              ? json.error
              : "Could not load traffic."
          );
        }

        setData(
          json as ResponseData
        );
      } catch (err) {
        if (
          err instanceof DOMException &&
          err.name === "AbortError"
        ) {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Could not load traffic."
        );
      } finally {
        if (
          !controller.signal.aborted
        ) {
          setLoading(false);
        }
      }
    }

    void load();

    return () =>
      controller.abort();
  }, [websiteId, days, refreshKey]);

  const snapshots =
    data?.snapshots ?? [];

  const totals = useMemo(() => {
    return snapshots.reduce(
      (acc, snapshot) => {
        acc.requests +=
          snapshot.totalRequests;

        acc.unclassified +=
          snapshot.unclassifiedRequests;

        acc.verifiedBots +=
          snapshot.verifiedBotRequests;

        acc.visitorDays +=
          snapshot.uniqueVisitors;

        acc.bandwidth +=
          Number(
            snapshot.bandwidthBytes
          );

        return acc;
      },
      {
        requests: 0,
        unclassified: 0,
        verifiedBots: 0,
        visitorDays: 0,
        bandwidth: 0,
      }
    );
  }, [snapshots]);

  const analysis = useMemo(() => {
    if (!snapshots.length) {
      return null;
    }

    const averageRequests =
      totals.requests /
      snapshots.length;

    const peak =
      snapshots.reduce(
        (best, current) =>
          current.totalRequests >
          best.totalRequests
            ? current
            : best,
        snapshots[0]
      );

    const first =
      snapshots[0];

    const last =
      snapshots[
        snapshots.length - 1
      ];

    const periodChange =
      first.totalRequests > 0
        ? (
            (
              last.totalRequests -
              first.totalRequests
            ) /
            first.totalRequests
          ) * 100
        : null;

    const verifiedBotShare =
      totals.requests > 0
        ? (
            totals.verifiedBots /
            totals.requests
          ) * 100
        : 0;

    const unclassifiedShare =
      totals.requests > 0
        ? (
            totals.unclassified /
            totals.requests
          ) * 100
        : 0;

    return {
      averageRequests,
      peak,
      first,
      last,
      periodChange,
      verifiedBotShare,
      unclassifiedShare,
    };
  }, [snapshots, totals]);

  const countries = useMemo(() => {
    const map =
      new Map<
        string,
        AggregateRow
      >();

    for (
      const snapshot of
      snapshots
    ) {
      for (
        const row of
          snapshot.countryBreakdown ??
        []
      ) {
        const key =
          row.country ||
          "Unknown";

        const current =
          map.get(key) ?? {
            key,
            requests: 0,
            visits: 0,
          };

        current.requests +=
          Number(
            row.requests ?? 0
          );

        current.visits +=
          Number(
            row.visits ?? 0
          );

        map.set(
          key,
          current
        );
      }
    }

    return [...map.values()]
      .sort(
        (a, b) =>
          b.requests -
          a.requests
      )
      .slice(0, 8);
  }, [snapshots]);

  const devices = useMemo(() => {
    const map =
      new Map<
        string,
        AggregateRow
      >();

    for (
      const snapshot of
      snapshots
    ) {
      for (
        const row of
          snapshot.deviceBreakdown ??
        []
      ) {
        const key =
          row.device ||
          "Unknown";

        const current =
          map.get(key) ?? {
            key,
            requests: 0,
            visits: 0,
          };

        current.requests +=
          Number(
            row.requests ?? 0
          );

        current.visits +=
          Number(
            row.visits ?? 0
          );

        map.set(
          key,
          current
        );
      }
    }

    return [...map.values()]
      .sort(
        (a, b) =>
          b.requests -
          a.requests
      )
      .slice(0, 6);
  }, [snapshots]);

  const bots = useMemo(() => {
    const map =
      new Map<string, number>();

    for (
      const snapshot of
      snapshots
    ) {
      for (
        const row of
          snapshot.botCategoryBreakdown ??
        []
      ) {
        const category =
          row.category?.trim();

        if (!category) {
          continue;
        }

        map.set(
          category,
          (
            map.get(category) ??
            0
          ) +
            Number(
              row.requests ?? 0
            )
        );
      }
    }

    return [...map.entries()]
      .map(
        ([
          category,
          requests,
        ]) => ({
          category,
          requests,
        })
      )
      .sort(
        (a, b) =>
          b.requests -
          a.requests
      )
      .slice(0, 8);
  }, [snapshots]);

  const chartData =
    useMemo(
      () =>
        snapshots.map(
          (snapshot) => ({
            date:
              shortDate(
                snapshot.date
              ),

            unclassified:
              snapshot.unclassifiedRequests,

            verifiedBots:
              snapshot.verifiedBotRequests,

            total:
              snapshot.totalRequests,
          })
        ),
      [snapshots]
    );

  return (
    <section
      className={styles.surface}
    >
      <header
        className={styles.header}
      >
        <div>
          <div
            className={
              styles.titleLine
            }
          >
            <Radio size={13} />

            <h2>
              Traffic
            </h2>

            <span
              className={
                styles.liveBadge
              }
            >
              Cloudflare
            </span>
          </div>

          <p>
            {days} complete days
            of real edge traffic.
          </p>
        </div>

        {data?.requestedRange && (
          <div
            className={
              styles.rangeLabel
            }
          >
            {data.requestedRange.start}
            <span>→</span>
            {data.requestedRange.end}
          </div>
        )}
      </header>

      <div className={styles.body}>
        {loading && !data ? (
          <div
            className={
              styles.fixedState
            }
          >
            <div
              className={
                styles.loader
              }
            />

            <span>
              Loading Cloudflare
              analytics…
            </span>
          </div>
        ) : error ? (
          <div
            className={`${styles.fixedState} ${styles.error}`}
          >
            {error}
          </div>
        ) : data &&
          !data.connected ? (
          <div
            className={
              styles.fixedState
            }
          >
            <Database size={17} />

            <span>
              Cloudflare is not
              connected for this
              website.
            </span>
          </div>
        ) : snapshots.length ===
          0 ? (
          <div
            className={
              styles.fixedState
            }
          >
            No Cloudflare data
            exists for this
            period.
          </div>
        ) : (
          <>
            {data && (
              <div className={styles.coverageBar}>
                <div className={styles.coverageLeft}>
                  <span className={styles.coverageDot} />
                  <strong>
                    {data.availableDays ?? snapshots.length}
                    {" / "}
                    {data.requestedDays ?? days}
                    {" days available"}
                  </strong>

                  {(data.missingDays ?? 0) > 0 && (
                    <span className={styles.coverageWarning}>
                      Historical days that were never stored cannot be reconstructed beyond Cloudflare retention.
                    </span>
                  )}
                </div>

                <div className={styles.coverageRight}>
                  {data.availableFrom && data.availableTo
                    ? `${data.availableFrom} → ${data.availableTo}`
                    : "No stored range"}
                </div>
              </div>
            )}

            <div
              className={
                styles.metrics
              }
            >
              <Metric
                icon={Activity}
                label="Requests"
                value={formatNumber(
                  totals.requests
                )}
                helper="Cloudflare edge requests"
                tone="violet"
              />

              <Metric
                icon={Users}
                label="Visitor-days"
                value={formatNumber(
                  totals.visitorDays
                )}
                helper="Sum of daily unique visitors"
                tone="cyan"
              />

              <Metric
                icon={Wifi}
                label="Bandwidth"
                value={formatBytes(
                  totals.bandwidth
                )}
                helper="Transferred data"
                tone="blue"
              />

              <Metric
                icon={Bot}
                label="Verified bots"
                value={formatNumber(
                  totals.verifiedBots
                )}
                helper="Cloudflare-identified bots"
                tone="amber"
              />

              <Metric
                icon={Network}
                label="Unclassified"
                value={formatNumber(
                  totals.unclassified
                )}
                helper="Not identified as verified bots"
                tone="green"
              />
            </div>

            {analysis && (
              <div
                className={
                  styles.analysisStrip
                }
              >
                <AnalysisItem
                  label="Average / day"
                  value={formatNumber(
                    analysis.averageRequests
                  )}
                  detail="requests"
                />

                <AnalysisItem
                  label="Peak day"
                  value={readableDate(
                    analysis.peak.date
                  )}
                  detail={`${formatNumber(
                    analysis.peak
                      .totalRequests
                  )} requests`}
                />

                <AnalysisItem
                  label="Verified bot share"
                  value={`${analysis.verifiedBotShare.toFixed(
                    1
                  )}%`}
                  detail={`${analysis.unclassifiedShare.toFixed(
                    1
                  )}% unclassified`}
                />

                <AnalysisItem
                  label="First → last day"
                  value={
                    analysis.periodChange ===
                    null
                      ? "—"
                      : formatPercent(
                          analysis.periodChange
                        )
                  }
                  detail={`${formatNumber(
                    analysis.first
                      .totalRequests
                  )} → ${formatNumber(
                    analysis.last
                      .totalRequests
                  )}`}
                  trend={
                    analysis.periodChange
                  }
                />
              </div>
            )}

            <div
              className={
                styles.chartSection
              }
            >
              <div
                className={
                  styles.sectionHeader
                }
              >
                <div>
                  <h3>
                    Request activity
                  </h3>

                  <p>
                    Each bar is one
                    complete UTC day.
                    The dashed line is
                    the selected
                    period's real
                    average request
                    volume.
                  </p>
                </div>

                <div
                  className={
                    styles.legend
                  }
                >
                  <span>
                    <i
                      data-tone="unclassified"
                    />
                    Unclassified
                  </span>

                  <span>
                    <i
                      data-tone="bots"
                    />
                    Verified bots
                  </span>

                  <span>
                    <i
                      data-tone="average"
                    />
                    Period average
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
                  <BarChart
                    data={chartData}
                    margin={{
                      top: 15,
                      right: 8,
                      bottom: 0,
                      left: 0,
                    }}
                    barCategoryGap={
                      days === 30
                        ? "18%"
                        : "28%"
                    }
                  >
                    <CartesianGrid
                      stroke="rgba(255,255,255,.045)"
                      vertical={false}
                    />

                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      minTickGap={
                        days === 30
                          ? 22
                          : 8
                      }
                      tick={{
                        fill:
                          "#62666f",
                        fontSize: 9,
                      }}
                    />

                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      width={48}
                      tick={{
                        fill:
                          "#62666f",
                        fontSize: 9,
                      }}
                    />

                    <Tooltip
                      cursor={{
                        fill:
                          "rgba(255,255,255,.025)",
                      }}
                      contentStyle={{
                        background:
                          "#18191c",
                        border:
                          "1px solid rgba(255,255,255,.09)",
                        borderRadius:
                          8,
                        boxShadow:
                          "0 12px 35px rgba(0,0,0,.28)",
                        fontSize: 10,
                      }}
                      labelStyle={{
                        color:
                          "#d7d8dc",
                        marginBottom:
                          5,
                      }}
                      itemStyle={{
                        color:
                          "#a9acb3",
                      }}
                    />

                    {analysis && (
                      <ReferenceLine
                        y={
                          analysis.averageRequests
                        }
                        stroke="rgba(201,166,68,.55)"
                        strokeDasharray="4 5"
                        ifOverflow="extendDomain"
                      />
                    )}

                    <Bar
                      dataKey="unclassified"
                      name="Unclassified"
                      stackId="traffic"
                      fill="#6668d8"
                      isAnimationActive={
                        false
                      }
                    />

                    <Bar
                      dataKey="verifiedBots"
                      name="Verified bots"
                      stackId="traffic"
                      fill="#3c8e9b"
                      radius={[
                        4,
                        4,
                        0,
                        0,
                      ]}
                      isAnimationActive={
                        false
                      }
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div
              className={
                styles.splitGrid
              }
            >
              <DataPanel
                title="Top countries"
                subtitle={`${days} day request distribution`}
                icon={Globe2}
              >
                {countries.length ? (
                  countries.map(
                    (row) => (
                      <DataRow
                        key={row.key}
                        label={
                          row.key
                        }
                        main={`${formatNumber(
                          row.requests
                        )} requests`}
                        secondary={`${formatNumber(
                          row.visits
                        )} visits`}
                      />
                    )
                  )
                ) : (
                  <EmptyLine />
                )}
              </DataPanel>

              <DataPanel
                title="Devices"
                subtitle="Cloudflare device data"
                icon={Users}
              >
                {devices.length ? (
                  devices.map(
                    (row) => (
                      <DataRow
                        key={row.key}
                        label={
                          row.key
                        }
                        main={`${formatNumber(
                          row.requests
                        )} requests`}
                        secondary={`${formatNumber(
                          row.visits
                        )} visits`}
                      />
                    )
                  )
                ) : (
                  <EmptyLine />
                )}
              </DataPanel>
            </div>

            <div
              className={
                styles.splitGrid
              }
            >
              <DataPanel
                title="Verified bot categories"
                subtitle="Only Cloudflare-identified categories"
                icon={Bot}
              >
                {bots.length ? (
                  bots.map(
                    (row) => (
                      <DataRow
                        key={
                          row.category
                        }
                        label={
                          row.category
                        }
                        main={`${formatNumber(
                          row.requests
                        )} requests`}
                      />
                    )
                  )
                ) : (
                  <EmptyLine />
                )}
              </DataPanel>

              <DataPanel
                title="Daily detail"
                subtitle="Raw daily Cloudflare aggregates"
                icon={Activity}
              >
                {[...snapshots]
                  .reverse()
                  .slice(
                    0,
                    days
                  )
                  .map(
                    (
                      snapshot
                    ) => (
                      <DataRow
                        key={
                          snapshot.date
                        }
                        label={
                          snapshot.date
                        }
                        main={`${formatNumber(
                          snapshot.totalRequests
                        )} requests`}
                        secondary={`${formatNumber(
                          snapshot.uniqueVisitors
                        )} daily uniques · ${formatBytes(
                          Number(
                            snapshot.bandwidthBytes
                          )
                        )}`}
                      />
                    )
                  )}
              </DataPanel>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function AnalysisItem({
  label,
  value,
  detail,
  trend,
}: {
  label: string;
  value: string;
  detail: string;
  trend?: number | null;
}) {
  const positive =
    trend != null &&
    trend > 0;

  const negative =
    trend != null &&
    trend < 0;

  return (
    <div
      className={
        styles.analysisItem
      }
    >
      <span
        className={
          styles.analysisLabel
        }
      >
        {label}
      </span>

      <div
        className={
          styles.analysisValueRow
        }
      >
        <strong
          className={
            positive
              ? styles.trendPositive
              : negative
                ? styles.trendNegative
                : undefined
          }
        >
          {value}
        </strong>

        {positive && (
          <TrendingUp
            size={12}
          />
        )}

        {negative && (
          <TrendingDown
            size={12}
          />
        )}
      </div>

      <span
        className={
          styles.analysisDetail
        }
      >
        {detail}
      </span>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  helper,
  tone,
}: {
  icon: React.ComponentType<{
    size?: number;
  }>;
  label: string;
  value: string;
  helper: string;
  tone:
    | "violet"
    | "cyan"
    | "blue"
    | "amber"
    | "green";
}) {
  return (
    <div
      className={styles.metric}
      data-tone={tone}
    >
      <div
        className={
          styles.metricLabel
        }
      >
        <Icon size={12} />
        {label}
      </div>

      <div
        className={
          styles.metricValue
        }
      >
        {value}
      </div>

      <div
        className={
          styles.metricHelper
        }
      >
        {helper}
      </div>
    </div>
  );
}

function DataPanel({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ComponentType<{
    size?: number;
  }>;
  children:
    React.ReactNode;
}) {
  return (
    <div
      className={styles.panel}
    >
      <div
        className={
          styles.panelHeader
        }
      >
        <div
          className={
            styles.panelTitle
          }
        >
          <Icon size={12} />
          <span>{title}</span>
        </div>

        <span
          className={
            styles.panelSubtitle
          }
        >
          {subtitle}
        </span>
      </div>

      <div>
        {children}
      </div>
    </div>
  );
}

function DataRow({
  label,
  main,
  secondary,
}: {
  label: string;
  main: string;
  secondary?: string;
}) {
  return (
    <div
      className={styles.dataRow}
    >
      <div
        className={
          styles.dataLabel
        }
      >
        <span
          className={
            styles.rowDot
          }
        />

        <span>
          {label}
        </span>
      </div>

      <div
        className={
          styles.dataValues
        }
      >
        <strong>
          {main}
        </strong>

        {secondary && (
          <span>
            {secondary}
          </span>
        )}
      </div>
    </div>
  );
}

function EmptyLine() {
  return (
    <div
      className={
        styles.emptyLine
      }
    >
      No data reported by this
      source.
    </div>
  );
}
