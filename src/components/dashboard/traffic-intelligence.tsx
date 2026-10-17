"use client";

import {
  formatNumber,
  formatBytes,
  percentage,
  median,
  shortTime,
  shortDate,
} from "./traffic-intelligence-formatters";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Bot,
  Clock3,
  Globe2,
  Laptop2,
  MapPin,
  Radio,
  RefreshCw,
  Route,
  Server,
  Smartphone,
  Tablet,
  Wifi,
  Zap,
} from "lucide-react";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type {
  AudienceDays,
} from "./audience-intelligence";

import styles from "./traffic-intelligence.module.css";
import { AudienceGeoIntelligence } from "./audience-geo-intelligence";


type ViewMode =
  | "live"
  | "24h"
  | "history";


interface CountryEntry {
  country: string;
  requests: number;
  visits?: number;
  bandwidthBytes?: number;
}


interface DeviceEntry {
  device: string;
  requests: number;
}


interface BotEntry {
  category: string;
  requests: number;
}


interface PathEntry {
  path: string;
  requests: number;
}


interface ReferrerEntry {
  referrer: string;
  requests: number;
}


interface StatusEntry {
  status: number;
  requests: number;
}


interface LivePoint {
  time: string;
  requests: number;
  bandwidthBytes: number;
}


interface HourPoint {
  time: string;
  requests: number;
  visits: number;
  bandwidthBytes: number;
}


interface LiveData {
  connected: boolean;
  source: "CLOUDFLARE";
  mode: "NEAR_REAL_TIME";
  refreshedAt: string;

  range: {
    start: string;
    end: string;
  };

  summary: {
    requests24h: number;
    requests60m: number;
    requests15m: number;
    visits24h: number;
    bandwidth24h: number;
    verifiedBotRequests: number;
  };

  timeline: LivePoint[];
  hourly: HourPoint[];
  countries: CountryEntry[];
  devices: DeviceEntry[];
  verifiedBots: BotEntry[];
  paths: PathEntry[];
  referrers: ReferrerEntry[];
  statuses: StatusEntry[];
}


interface HistoricalCountry {
  country: string;
  requests: number;
  visits: number;
}


interface HistoricalDevice {
  device: string;
  requests: number;
  visits: number;
}


interface HistoricalBot {
  category: string;
  requests: number;
}


interface HistoricalSnapshot {
  date: string;
  totalRequests: number;
  unclassifiedRequests: number;
  verifiedBotRequests: number;
  uniqueVisitors: number;
  bandwidthBytes: string;

  countryBreakdown:
    | HistoricalCountry[]
    | null;

  deviceBreakdown:
    | HistoricalDevice[]
    | null;

  botCategoryBreakdown:
    | HistoricalBot[]
    | null;
}


interface HistoricalData {
  connected: boolean;
  source: "CLOUDFLARE";
  requestedDays?: number;
  availableDays?: number;
  missingDays?: number;
  availableFrom?: string | null;
  availableTo?: string | null;
  snapshots: HistoricalSnapshot[];
}


interface Signal {
  tone:
    | "success"
    | "warning"
    | "danger"
    | "accent"
    | "muted";

  title: string;
  detail: string;
}


const COUNTRY_META: Record<
  string,
  {
    flag: string;
    x: number;
    y: number;
  }
> = {
  Canada: {
    flag: "🇨🇦",
    x: 238,
    y: 125,
  },

  "United States": {
    flag: "🇺🇸",
    x: 238,
    y: 170,
  },

  Mexico: {
    flag: "🇲🇽",
    x: 250,
    y: 225,
  },

  Brazil: {
    flag: "🇧🇷",
    x: 350,
    y: 325,
  },

  Argentina: {
    flag: "🇦🇷",
    x: 335,
    y: 395,
  },

  "United Kingdom": {
    flag: "🇬🇧",
    x: 478,
    y: 145,
  },

  Ireland: {
    flag: "🇮🇪",
    x: 458,
    y: 150,
  },

  France: {
    flag: "🇫🇷",
    x: 493,
    y: 180,
  },

  Germany: {
    flag: "🇩🇪",
    x: 515,
    y: 165,
  },

  Spain: {
    flag: "🇪🇸",
    x: 480,
    y: 205,
  },

  Italy: {
    flag: "🇮🇹",
    x: 520,
    y: 205,
  },

  Netherlands: {
    flag: "🇳🇱",
    x: 505,
    y: 150,
  },

  Poland: {
    flag: "🇵🇱",
    x: 545,
    y: 165,
  },

  Ukraine: {
    flag: "🇺🇦",
    x: 575,
    y: 175,
  },

  Sweden: {
    flag: "🇸🇪",
    x: 525,
    y: 115,
  },

  Norway: {
    flag: "🇳🇴",
    x: 505,
    y: 105,
  },

  Finland: {
    flag: "🇫🇮",
    x: 550,
    y: 105,
  },

  Turkey: {
    flag: "🇹🇷",
    x: 580,
    y: 215,
  },

  Israel: {
    flag: "🇮🇱",
    x: 588,
    y: 245,
  },

  "United Arab Emirates": {
    flag: "🇦🇪",
    x: 630,
    y: 260,
  },

  India: {
    flag: "🇮🇳",
    x: 685,
    y: 270,
  },

  Singapore: {
    flag: "🇸🇬",
    x: 748,
    y: 330,
  },

  China: {
    flag: "🇨🇳",
    x: 740,
    y: 220,
  },

  Japan: {
    flag: "🇯🇵",
    x: 830,
    y: 215,
  },

  "South Korea": {
    flag: "🇰🇷",
    x: 800,
    y: 220,
  },

  Indonesia: {
    flag: "🇮🇩",
    x: 760,
    y: 350,
  },

  Australia: {
    flag: "🇦🇺",
    x: 830,
    y: 380,
  },

  "New Zealand": {
    flag: "🇳🇿",
    x: 900,
    y: 415,
  },

  "South Africa": {
    flag: "🇿🇦",
    x: 545,
    y: 390,
  },

  Egypt: {
    flag: "🇪🇬",
    x: 555,
    y: 260,
  },

  Nigeria: {
    flag: "🇳🇬",
    x: 500,
    y: 300,
  },
};


function flagForCountry(
  country: string
): string {
  return (
    COUNTRY_META[country]?.flag ??
    "🌐"
  );
}


export function TrafficIntelligence({
  websiteId,
  days,
  refreshKey,
}: {
  websiteId: string;
  days: AudienceDays;
  refreshKey:
    | number
    | string;
}) {
  const [
    mode,
    setMode,
  ] = useState<ViewMode>(
    "live"
  );

  const [
    live,
    setLive,
  ] =
    useState<LiveData | null>(
      null
    );

  const [
    history,
    setHistory,
  ] =
    useState<HistoricalData | null>(
      null
    );

  const [
    loadingLive,
    setLoadingLive,
  ] = useState(false);

  const [
    loadingHistory,
    setLoadingHistory,
  ] = useState(false);

  const [
    liveError,
    setLiveError,
  ] =
    useState<string | null>(
      null
    );

  const [
    historyError,
    setHistoryError,
  ] =
    useState<string | null>(
      null
    );

  const previousDays =
    useRef(days);


  const loadLive =
    useCallback(
      async () => {
        setLoadingLive(true);

        try {
          const params =
            new URLSearchParams({
              websiteId,
            });

          const response =
            await fetch(
              `/api/traffic/live?${params.toString()}`,
              {
                cache:
                  "no-store",
              }
            );

          const json =
            await response.json();

          if (!response.ok) {
            throw new Error(
              json.error ??
              "Could not load live traffic."
            );
          }

          setLive(
            json as LiveData
          );

          setLiveError(null);
        } catch (error) {
          setLiveError(
            error instanceof Error
              ? error.message
              : "Could not load live traffic."
          );
        } finally {
          setLoadingLive(false);
        }
      },
      [websiteId]
    );


  const loadHistory =
    useCallback(
      async () => {
        setLoadingHistory(true);

        try {
          const params =
            new URLSearchParams({
              websiteId,
              days:
                String(days),
            });

          const response =
            await fetch(
              `/api/traffic?${params.toString()}`,
              {
                cache:
                  "no-store",
              }
            );

          const json =
            await response.json();

          if (!response.ok) {
            throw new Error(
              json.error ??
              "Could not load traffic history."
            );
          }

          setHistory(
            json as HistoricalData
          );

          setHistoryError(null);
        } catch (error) {
          setHistoryError(
            error instanceof Error
              ? error.message
              : "Could not load traffic history."
          );
        } finally {
          setLoadingHistory(false);
        }
      },
      [
        websiteId,
        days,
      ]
    );


  useEffect(() => {
    if (
      previousDays.current !==
      days
    ) {
      previousDays.current =
        days;

      setMode(
        "history"
      );
    }
  }, [days]);


  useEffect(() => {
    void loadHistory();
  }, [
    loadHistory,
    refreshKey,
  ]);


  useEffect(() => {
    if (
      mode === "history"
    ) {
      return;
    }

    void loadLive();

    const timer =
      window.setInterval(
        () => {
          void loadLive();
        },
        30000
      );

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, [
    mode,
    loadLive,
    refreshKey,
  ]);


  const snapshots =
    history?.snapshots ?? [];


  const historyTotals =
    useMemo(() => {
      return snapshots.reduce(
        (
          total,
          snapshot
        ) => {
          total.requests +=
            snapshot.totalRequests;

          total.visitors +=
            snapshot.uniqueVisitors;

          total.bandwidth +=
            Number(
              snapshot.bandwidthBytes
            );

          return total;
        },
        {
          requests: 0,
          visitors: 0,
          bandwidth: 0,
        }
      );
    }, [snapshots]);


  const detailSnapshots =
    useMemo(
      () =>
        snapshots.filter(
          (snapshot) =>
            snapshot
              .botCategoryBreakdown !==
            null
        ),
      [snapshots]
    );


  const botCoverage =
    detailSnapshots.length;


  const verifiedBots =
    useMemo(
      () =>
        detailSnapshots.reduce(
          (
            total,
            snapshot
          ) =>
            total +
            snapshot
              .verifiedBotRequests,
          0
        ),
      [detailSnapshots]
    );


  const detailRequests =
    useMemo(
      () =>
        detailSnapshots.reduce(
          (
            total,
            snapshot
          ) =>
            total +
            snapshot
              .verifiedBotRequests +
            snapshot
              .unclassifiedRequests,
          0
        ),
      [detailSnapshots]
    );


  const historicalCountries =
    useMemo(() => {
      const map =
        new Map<
          string,
          CountryEntry
        >();

      for (
        const snapshot of
        snapshots
      ) {
        for (
          const row of
          snapshot
            .countryBreakdown ??
          []
        ) {
          const current =
            map.get(
              row.country
            ) ?? {
              country:
                row.country,
              requests: 0,
              visits: 0,
              bandwidthBytes:
                0,
            };

          current.requests +=
            row.requests;

          current.visits =
            (current.visits ??
              0) +
            row.visits;

          map.set(
            row.country,
            current
          );
        }
      }

      return Array.from(
        map.values()
      ).sort(
        (a, b) =>
          b.requests -
          a.requests
      );
    }, [snapshots]);


  const historicalDevices =
    useMemo(() => {
      const map =
        new Map<
          string,
          DeviceEntry
        >();

      for (
        const snapshot of
        snapshots
      ) {
        for (
          const row of
          snapshot
            .deviceBreakdown ??
          []
        ) {
          const current =
            map.get(
              row.device
            ) ?? {
              device:
                row.device,
              requests: 0,
            };

          current.requests +=
            row.requests;

          map.set(
            row.device,
            current
          );
        }
      }

      return Array.from(
        map.values()
      ).sort(
        (a, b) =>
          b.requests -
          a.requests
      );
    }, [snapshots]);


  const historySignals =
    useMemo<Signal[]>(
      () => {
        if (
          snapshots.length < 2
        ) {
          return [];
        }

        const signals:
          Signal[] = [];

        const requests =
          snapshots.map(
            (snapshot) =>
              snapshot
                .totalRequests
          );

        const latest =
          requests[
            requests.length - 1
          ];

        const baseline =
          median(
            requests.slice(
              0,
              -1
            )
          );

        if (
          baseline > 0 &&
          latest >=
            baseline * 1.5
        ) {
          signals.push({
            tone: "accent",
            title:
              "Traffic spike",
            detail:
              `${formatNumber(
                latest
              )} requests on the latest complete day versus ${formatNumber(
                baseline
              )} median baseline.`,
          });
        }

        if (
          baseline > 0 &&
          latest <=
            baseline * 0.6
        ) {
          signals.push({
            tone: "danger",
            title:
              "Traffic drop",
            detail:
              `${formatNumber(
                latest
              )} requests on the latest complete day versus ${formatNumber(
                baseline
              )} median baseline.`,
          });
        }

        if (
          requests.length >= 14
        ) {
          const last7 =
            requests
              .slice(-7)
              .reduce(
                (a, b) =>
                  a + b,
                0
              ) / 7;

          const prev7 =
            requests
              .slice(-14, -7)
              .reduce(
                (a, b) =>
                  a + b,
                0
              ) / 7;

          if (prev7 > 0) {
            const change =
              (
                last7 /
                prev7 -
                1
              ) * 100;

            if (
              Math.abs(change) >=
              15
            ) {
              signals.push({
                tone:
                  change > 0
                    ? "success"
                    : "warning",

                title:
                  change > 0
                    ? "Sustained growth"
                    : "Sustained decline",

                detail:
                  `7-day average is ${Math.abs(
                    change
                  ).toFixed(
                    1
                  )}% ${
                    change > 0
                      ? "above"
                      : "below"
                  } the previous 7-day period.`,
              });
            }
          }
        }

        if (
          detailRequests > 0
        ) {
          const botShare =
            verifiedBots /
            detailRequests *
            100;

          if (
            botShare >= 20
          ) {
            signals.push({
              tone: "warning",
              title:
                "Automation concentration",
              detail:
                `${botShare.toFixed(
                  1
                )}% verified automation across ${botCoverage} detail-covered day${
                  botCoverage === 1
                    ? ""
                    : "s"
                }.`,
            });
          }
        }

        const top =
          historicalCountries[0];

        const classified =
          historicalCountries.reduce(
            (
              total,
              country
            ) =>
              total +
              country.requests,
            0
          );

        if (
          top &&
          classified > 0 &&
          top.requests /
            classified >
            0.4
        ) {
          signals.push({
            tone: "muted",
            title:
              "Geographic concentration",
            detail:
              `${top.country} represents ${percentage(
                top.requests,
                classified
              )} of geographically classified requests.`,
          });
        }

        return signals.slice(
          0,
          4
        );
      },
      [
        snapshots,
        detailRequests,
        verifiedBots,
        botCoverage,
        historicalCountries,
      ]
    );


  const liveSignals =
    useMemo<Signal[]>(
      () => {
        if (!live) {
          return [];
        }

        const signals:
          Signal[] = [];

        const hourlyBaseline =
          live.summary
            .requests24h /
          24;

        if (
          hourlyBaseline > 0 &&
          live.summary
            .requests60m >
            hourlyBaseline *
              1.5
        ) {
          signals.push({
            tone: "accent",
            title:
              "Live traffic acceleration",
            detail:
              `The last 60 minutes are ${(
                live.summary
                  .requests60m /
                hourlyBaseline
              ).toFixed(
                1
              )}× the 24-hour hourly average.`,
          });
        }

        const statusTotal =
          live.statuses.reduce(
            (
              total,
              row
            ) =>
              total +
              row.requests,
            0
          );

        const serverErrors =
          live.statuses
            .filter(
              (row) =>
                row.status >=
                500
            )
            .reduce(
              (
                total,
                row
              ) =>
                total +
                row.requests,
              0
            );

        if (
          statusTotal > 0 &&
          serverErrors /
            statusTotal >=
            0.01
        ) {
          signals.push({
            tone: "danger",
            title:
              "Server error activity",
            detail:
              `${percentage(
                serverErrors,
                statusTotal
              )} of classified edge responses are 5xx in the current 24-hour window.`,
          });
        }

        const topCountry =
          live.countries[0];

        const countryTotal =
          live.countries.reduce(
            (
              total,
              row
            ) =>
              total +
              row.requests,
            0
          );

        if (
          topCountry &&
          countryTotal > 0
        ) {
          signals.push({
            tone: "muted",
            title:
              "Top market right now",
            detail:
              `${topCountry.country} leads with ${formatNumber(
                topCountry.requests
              )} requests (${percentage(
                topCountry.requests,
                countryTotal
              )}).`,
          });
        }

        if (
          live.summary
            .verifiedBotRequests >
          0
        ) {
          signals.push({
            tone: "warning",
            title:
              "Verified automation active",
            detail:
              `${formatNumber(
                live.summary
                  .verifiedBotRequests
              )} requests are attributed to Cloudflare-verified bot categories in the current detail window.`,
          });
        }

        return signals.slice(
          0,
          4
        );
      },
      [live]
    );


  const liveChart =
    useMemo(() => {
      if (!live) {
        return [];
      }

      if (
        mode === "live"
      ) {
        return live.timeline
          .slice(-60)
          .map(
            (point) => ({
              label:
                shortTime(
                  point.time
                ),

              requests:
                point.requests,
            })
          );
      }

      return live.hourly.map(
        (point) => ({
          label:
            shortTime(
              point.time
            ),

          requests:
            point.requests,
        })
      );
    }, [
      live,
      mode,
    ]);


  const historyChart =
    useMemo(
      () =>
        snapshots.map(
          (snapshot) => ({
            label:
              shortDate(
                snapshot.date
              ),

            requests:
              snapshot
                .totalRequests,
          })
        ),
      [snapshots]
    );


  const activeCountries =
    mode === "history"
      ? historicalCountries
      : live?.countries ?? [];


  const activeDevices =
    mode === "history"
      ? historicalDevices
      : live?.devices ?? [];


  const activeSignals =
    mode === "history"
      ? historySignals
      : liveSignals;


  const activeChart =
    mode === "history"
      ? historyChart
      : liveChart;


  const isLoading =
    mode === "history"
      ? loadingHistory
      : loadingLive;


  const activeError =
    mode === "history"
      ? historyError
      : liveError;


  return (
    <section
      className={
        styles.shell
      }
    >
      <div
        className={
          styles.commandBar
        }
      >
        <div
          className={
            styles.modeSwitch
          }
        >
          <button
            type="button"
            data-active={
              mode === "live"
            }
            onClick={() =>
              setMode("live")
            }
          >
            <span
              className={
                styles.liveDot
              }
            />
            Live
          </button>

          <button
            type="button"
            data-active={
              mode === "24h"
            }
            onClick={() =>
              setMode("24h")
            }
          >
            24h
          </button>

          <button
            type="button"
            data-active={
              mode ===
              "history"
            }
            onClick={() =>
              setMode(
                "history"
              )
            }
          >
            {days}d history
          </button>
        </div>

        <div
          className={
            styles.freshness
          }
        >
          {mode !==
            "history" &&
            live?.refreshedAt && (
              <>
                <Radio
                  size={12}
                />

                Updated{" "}
                {shortTime(
                  live.refreshedAt
                )}
              </>
            )}

          <button
            type="button"
            onClick={() => {
              if (
                mode ===
                "history"
              ) {
                void loadHistory();
              } else {
                void loadLive();
              }
            }}
            disabled={
              isLoading
            }
            aria-label="Refresh traffic"
          >
            <RefreshCw
              size={12}
              className={
                isLoading
                  ? styles.spin
                  : undefined
              }
            />
          </button>
        </div>
      </div>


      {activeError && (
        <div
          className={
            styles.error
          }
        >
          {activeError}
        </div>
      )}


      <div
        className={
          styles.metrics
        }
      >
        {mode === "live" ? (
          <>
            <Metric
              icon={
                <Zap
                  size={13}
                />
              }
              label="Last 15 min"
              value={
                live
                  ? formatNumber(
                      live.summary
                        .requests15m
                    )
                  : "—"
              }
              detail="Edge requests"
              tone="accent"
            />

            <Metric
              icon={
                <Activity
                  size={13}
                />
              }
              label="Last 60 min"
              value={
                live
                  ? formatNumber(
                      live.summary
                        .requests60m
                    )
                  : "—"
              }
              detail="Near-real-time"
            />

            <Metric
              icon={
                <Clock3
                  size={13}
                />
              }
              label="24h requests"
              value={
                live
                  ? formatNumber(
                      live.summary
                        .requests24h
                    )
                  : "—"
              }
              detail="Rolling window"
            />

            <Metric
              icon={
                <Bot
                  size={13}
                />
              }
              label="Verified automation"
              value={
                live
                  ? formatNumber(
                      live.summary
                        .verifiedBotRequests
                    )
                  : "—"
              }
              detail="Cloudflare verified"
              tone="warning"
            />
          </>
        ) : mode ===
          "24h" ? (
          <>
            <Metric
              icon={
                <Activity
                  size={13}
                />
              }
              label="Requests"
              value={
                live
                  ? formatNumber(
                      live.summary
                        .requests24h
                    )
                  : "—"
              }
              detail="Last 24 hours"
            />

            <Metric
              icon={
                <Wifi
                  size={13}
                />
              }
              label="Visits"
              value={
                live
                  ? formatNumber(
                      live.summary
                        .visits24h
                    )
                  : "—"
              }
              detail="Cloudflare visits"
            />

            <Metric
              icon={
                <Server
                  size={13}
                />
              }
              label="Bandwidth"
              value={
                live
                  ? formatBytes(
                      live.summary
                        .bandwidth24h
                    )
                  : "—"
              }
              detail="Transferred"
            />

            <Metric
              icon={
                <Bot
                  size={13}
                />
              }
              label="Verified automation"
              value={
                live
                  ? formatNumber(
                      live.summary
                        .verifiedBotRequests
                    )
                  : "—"
              }
              detail="Known automation"
              tone="warning"
            />
          </>
        ) : (
          <>
            <Metric
              icon={
                <Activity
                  size={13}
                />
              }
              label="Requests"
              value={
                formatNumber(
                  historyTotals
                    .requests
                )
              }
              detail={`${history?.availableDays ?? snapshots.length} / ${history?.requestedDays ?? days} days`}
            />

            <Metric
              icon={
                <Wifi
                  size={13}
                />
              }
              label="Visitor-days"
              value={
                formatNumber(
                  historyTotals
                    .visitors
                )
              }
              detail="Daily unique sum"
            />

            <Metric
              icon={
                <Server
                  size={13}
                />
              }
              label="Bandwidth"
              value={
                formatBytes(
                  historyTotals
                    .bandwidth
                )
              }
              detail="Transferred"
            />

            <Metric
              icon={
                <Bot
                  size={13}
                />
              }
              label="Verified automation"
              value={
                botCoverage > 0
                  ? percentage(
                      verifiedBots,
                      detailRequests
                    )
                  : "—"
              }
              detail={
                botCoverage > 0
                  ? `${botCoverage} / ${snapshots.length} detail days`
                  : "No detail coverage"
              }
              tone="warning"
            />
          </>
        )}
      </div>


      <div
        className={
          styles.primaryGrid
        }
      >
        <div
          className={
            styles.chartPanel
          }
        >
          <PanelHeading
            icon={
              <Activity
                size={13}
              />
            }
            title={
              mode === "live"
                ? "Live request activity"
                : mode ===
                    "24h"
                  ? "24-hour traffic"
                  : `${days}-day traffic`
            }
            meta={
              mode === "live"
                ? "Last 60 minutes"
                : mode ===
                    "24h"
                  ? "Hourly"
                  : "Complete UTC days"
            }
          />

          <div
            className={
              styles.chart
            }
          >
            {activeChart.length >
            0 ? (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <AreaChart
                  data={
                    activeChart
                  }
                  margin={{
                    top: 12,
                    right: 8,
                    bottom: 0,
                    left: -12,
                  }}
                >
                  <defs>
                    <linearGradient
                      id="traffic-fill"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="var(--accent)"
                        stopOpacity={0.28}
                      />

                      <stop
                        offset="100%"
                        stopColor="var(--accent)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    vertical={false}
                    stroke="rgba(255,255,255,.045)"
                  />

                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    minTickGap={28}
                    tick={{
                      fill:
                        "var(--secondary)",
                      fontSize: 10,
                    }}
                  />

                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    width={44}
                    tick={{
                      fill:
                        "var(--secondary)",
                      fontSize: 10,
                    }}
                  />

                  <Tooltip
                    cursor={{
                      stroke:
                        "rgba(255,255,255,.08)",
                    }}
                    contentStyle={{
                      background:
                        "#111315",
                      border:
                        "1px solid rgba(255,255,255,.08)",
                      borderRadius:
                        6,
                      fontSize: 11,
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey="requests"
                    stroke="var(--accent)"
                    fill="url(#traffic-fill)"
                    strokeWidth={1.7}
                    dot={false}
                    activeDot={{
                      r: 3,
                    }}
                    isAnimationActive={
                      false
                    }
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyLine
                text={
                  isLoading
                    ? "Loading traffic…"
                    : "No traffic points available."
                }
              />
            )}
          </div>
        </div>


        <div
          className={
            styles.signalPanel
          }
        >
          <PanelHeading
            icon={
              <Zap
                size={13}
              />
            }
            title="Traffic signals"
            meta="Deterministic"
          />

          <div
            className={
              styles.signalList
            }
          >
            {activeSignals.length >
            0 ? (
              activeSignals.map(
                (
                  signal,
                  index
                ) => (
                  <SignalRow
                    key={`${signal.title}-${index}`}
                    signal={
                      signal
                    }
                  />
                )
              )
            ) : (
              <EmptyLine
                text="No significant traffic signals right now."
              />
            )}
          </div>
        </div>
      </div>


      <div
        className={
          styles.geoGrid
        }
      >
        <div
          className={
            styles.mapPanel
          }
        >
          <PanelHeading
            icon={
              <Globe2
                size={13}
              />
            }
            title="World traffic"
            meta={
              mode === "history"
                ? `${botCoverage} detail-covered days`
                : "Current detail window"
            }
          />

          <WorldMap
            countries={
              activeCountries
            }
          />
        </div>


        <div
          className={
            styles.countryPanel
          }
        >
          <PanelHeading
            icon={
              <MapPin
                size={13}
              />
            }
            title="Top countries"
            meta="Requests"
          />

          <CountryTable
            countries={
              activeCountries
            }
          />
        </div>
      </div>


      <AudienceGeoIntelligence
        websiteId={websiteId}
        days={days}
        mode={mode}
        cloudflareCountries={activeCountries}
      />

      <div
        className={
          styles.detailGrid
        }
      >
        <RankPanel
          title="Devices"
          icon={
            <Laptop2
              size={13}
            />
          }
          rows={
            activeDevices.map(
              (row) => ({
                name:
                  prettyDevice(
                    row.device
                  ),
                value:
                  row.requests,
                icon:
                  deviceIcon(
                    row.device
                  ),
              })
            )
          }
        />

        {mode !==
        "history" ? (
          <>
            <RankPanel
              title="Top pages"
              icon={
                <Route
                  size={13}
                />
              }
              rows={
                (
                  live?.paths ??
                  []
                ).map(
                  (row) => ({
                    name:
                      row.path ||
                      "/",
                    value:
                      row.requests,
                  })
                )
              }
            />

            <RankPanel
              title="Referrers"
              icon={
                <ArrowDownRight
                  size={13}
                />
              }
              rows={
                (
                  live?.referrers ??
                  []
                ).map(
                  (row) => ({
                    name:
                      row.referrer ||
                      "Direct / none",
                    value:
                      row.requests,
                  })
                )
              }
            />

            <StatusPanel
              rows={
                live?.statuses ??
                []
              }
            />
          </>
        ) : (
          <>
            <RankPanel
              title="Top countries"
              icon={
                <Globe2
                  size={13}
                />
              }
              rows={
                historicalCountries.map(
                  (row) => ({
                    name:
                      `${flagForCountry(
                        row.country
                      )} ${row.country}`,
                    value:
                      row.requests,
                  })
                )
              }
            />

            <CoveragePanel
              coverage={
                botCoverage
              }
              total={
                snapshots.length
              }
            />

            <DailyDetail
              snapshots={
                snapshots
              }
            />
          </>
        )}
      </div>
    </section>
  );
}


function Metric({
  icon,
  label,
  value,
  detail,
  tone = "default",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  tone?:
    | "default"
    | "accent"
    | "warning";
}) {
  return (
    <div
      className={
        styles.metric
      }
      data-tone={tone}
    >
      <div
        className={
          styles.metricLabel
        }
      >
        {icon}
        {label}
      </div>

      <strong>
        {value}
      </strong>

      <span>
        {detail}
      </span>
    </div>
  );
}


function PanelHeading({
  icon,
  title,
  meta,
}: {
  icon: ReactNode;
  title: string;
  meta: string;
}) {
  return (
    <div
      className={
        styles.panelHeading
      }
    >
      <div>
        {icon}
        <strong>
          {title}
        </strong>
      </div>

      <span>
        {meta}
      </span>
    </div>
  );
}


function SignalRow({
  signal,
}: {
  signal: Signal;
}) {
  return (
    <div
      className={
        styles.signal
      }
      data-tone={
        signal.tone
      }
    >
      <i />

      <div>
        <strong>
          {signal.title}
        </strong>

        <span>
          {signal.detail}
        </span>
      </div>
    </div>
  );
}


function WorldMap({
  countries,
}: {
  countries:
    CountryEntry[];
}) {
  const max =
    countries[0]
      ?.requests ?? 1;

  const plotted =
    countries
      .filter(
        (country) =>
          COUNTRY_META[
            country.country
          ]
      )
      .slice(0, 14);

  return (
    <div
      className={
        styles.worldMap
      }
    >
      <svg
        viewBox="0 0 1000 500"
        role="img"
        aria-label="World traffic map"
      >
        <g
          className={
            styles.worldShapes
          }
        >
          <path d="M113 117 160 84 233 79 299 101 326 137 304 166 263 178 238 211 195 205 176 177 139 161Z" />
          <path d="M252 229 295 243 328 278 350 333 333 394 305 445 278 405 273 350 251 306 230 268Z" />
          <path d="M436 111 480 93 525 102 562 128 548 157 508 163 485 183 452 165 428 140Z" />
          <path d="M475 188 529 182 567 215 587 264 576 326 548 383 509 366 486 324 464 270 449 224Z" />
          <path d="M553 112 623 90 697 104 761 121 827 151 864 190 841 221 786 229 743 252 705 243 670 215 620 207 579 171Z" />
          <path d="M735 250 786 261 810 298 782 324 751 315 727 286Z" />
          <path d="M789 333 847 334 889 366 881 409 830 426 790 398 768 362Z" />
          <path d="M894 402 917 410 927 428 909 441 889 428Z" />
        </g>

        {plotted.map(
          (country) => {
            const meta =
              COUNTRY_META[
                country.country
              ];

            const size =
              4 +
              Math.min(
                10,
                country.requests /
                  max *
                  10
              );

            return (
              <g
                key={
                  country.country
                }
                className={
                  styles.mapPoint
                }
              >
                <circle
                  cx={
                    meta.x
                  }
                  cy={
                    meta.y
                  }
                  r={
                    size + 7
                  }
                  className={
                    styles.mapHalo
                  }
                />

                <circle
                  cx={
                    meta.x
                  }
                  cy={
                    meta.y
                  }
                  r={size}
                  className={
                    styles.mapDot
                  }
                />

                <title>
                  {country.country}:{" "}
                  {formatNumber(
                    country.requests
                  )}{" "}
                  requests
                </title>
              </g>
            );
          }
        )}
      </svg>

      <div
        className={
          styles.mapLegend
        }
      >
        <span>
          <i />
          Traffic activity
        </span>

        <span>
          Marker size =
          request volume
        </span>
      </div>
    </div>
  );
}


function CountryTable({
  countries,
}: {
  countries:
    CountryEntry[];
}) {
  const top =
    countries.slice(
      0,
      8
    );

  const total =
    countries.reduce(
      (
        sum,
        row
      ) =>
        sum +
        row.requests,
      0
    );

  if (!top.length) {
    return (
      <EmptyLine
        text="Country detail is not available for this window."
      />
    );
  }

  return (
    <div
      className={
        styles.countryTable
      }
    >
      {top.map(
        (
          country,
          index
        ) => (
          <div
            key={
              country.country
            }
            className={
              styles.countryRow
            }
          >
            <span
              className={
                styles.rank
              }
            >
              {String(
                index + 1
              ).padStart(
                2,
                "0"
              )}
            </span>

            <span
              className={
                styles.flag
              }
            >
              {flagForCountry(
                country.country
              )}
            </span>

            <div
              className={
                styles.countryName
              }
            >
              <strong>
                {
                  country.country
                }
              </strong>

              <div
                className={
                  styles.barTrack
                }
              >
                <i
                  style={{
                    width:
                      percentage(
                        country.requests,
                        total
                      ),
                  }}
                />
              </div>
            </div>

            <div
              className={
                styles.countryValue
              }
            >
              <strong>
                {formatNumber(
                  country.requests
                )}
              </strong>

              <span>
                {percentage(
                  country.requests,
                  total
                )}
              </span>
            </div>
          </div>
        )
      )}
    </div>
  );
}


function RankPanel({
  title,
  icon,
  rows,
}: {
  title: string;
  icon: ReactNode;
  rows: Array<{
    name: string;
    value: number;
    icon?: ReactNode;
  }>;
}) {
  const top =
    rows.slice(
      0,
      7
    );

  const max =
    top[0]?.value ??
    1;

  return (
    <div
      className={
        styles.smallPanel
      }
    >
      <PanelHeading
        icon={icon}
        title={title}
        meta="Requests"
      />

      <div
        className={
          styles.rankList
        }
      >
        {top.length >
        0 ? (
          top.map(
            (
              row,
              index
            ) => (
              <div
                key={`${row.name}-${index}`}
                className={
                  styles.rankRow
                }
              >
                <span
                  className={
                    styles.rowIcon
                  }
                >
                  {row.icon ??
                    String(
                      index + 1
                    ).padStart(
                      2,
                      "0"
                    )}
                </span>

                <div>
                  <strong>
                    {row.name}
                  </strong>

                  <span
                    className={
                      styles.miniBar
                    }
                  >
                    <i
                      style={{
                        width:
                          `${Math.max(
                            3,
                            row.value /
                              max *
                              100
                          )}%`,
                      }}
                    />
                  </span>
                </div>

                <b>
                  {formatNumber(
                    row.value
                  )}
                </b>
              </div>
            )
          )
        ) : (
          <EmptyLine
            text="No data available."
          />
        )}
      </div>
    </div>
  );
}


function StatusPanel({
  rows,
}: {
  rows: StatusEntry[];
}) {
  const groups =
    [
      {
        name: "2xx",
        test: (
          status: number
        ) =>
          status >= 200 &&
          status < 300,
      },

      {
        name: "3xx",
        test: (
          status: number
        ) =>
          status >= 300 &&
          status < 400,
      },

      {
        name: "4xx",
        test: (
          status: number
        ) =>
          status >= 400 &&
          status < 500,
      },

      {
        name: "5xx",
        test: (
          status: number
        ) =>
          status >= 500 &&
          status < 600,
      },
    ].map(
      (group) => ({
        name:
          group.name,

        value:
          rows
            .filter(
              (row) =>
                group.test(
                  row.status
                )
            )
            .reduce(
              (
                total,
                row
              ) =>
                total +
                row.requests,
              0
            ),
      })
    );

  return (
    <RankPanel
      title="HTTP status"
      icon={
        <Server
          size={13}
        />
      }
      rows={
        groups.map(
          (group) => ({
            name:
              group.name,
            value:
              group.value,
          })
        )
      }
    />
  );
}


function CoveragePanel({
  coverage,
  total,
}: {
  coverage: number;
  total: number;
}) {
  return (
    <div
      className={
        styles.smallPanel
      }
    >
      <PanelHeading
        icon={
          <Bot
            size={13}
          />
        }
        title="Classification coverage"
        meta="Cloudflare detail"
      />

      <div
        className={
          styles.coverage
        }
      >
        <strong>
          {coverage}
          <span>
            {" "}
            / {total}
          </span>
        </strong>

        <p>
          Complete days with
          detailed country,
          device and verified
          automation
          classification.
        </p>

        <div
          className={
            styles.coverageTrack
          }
        >
          <i
            style={{
              width:
                total > 0
                  ? `${coverage / total * 100}%`
                  : "0%",
            }}
          />
        </div>

        <span>
          No missing detail is
          presented as human
          traffic.
        </span>
      </div>
    </div>
  );
}


function DailyDetail({
  snapshots,
}: {
  snapshots:
    HistoricalSnapshot[];
}) {
  return (
    <div
      className={`${styles.smallPanel} ${styles.dailyPanel}`}
    >
      <PanelHeading
        icon={
          <Clock3
            size={13}
          />
        }
        title="Daily detail"
        meta="Latest"
      />

      <div
        className={
          styles.dailyRows
        }
      >
        {[...snapshots]
          .reverse()
          .slice(
            0,
            7
          )
          .map(
            (
              snapshot
            ) => (
              <div
                key={
                  snapshot.date
                }
              >
                <span>
                  {shortDate(
                    snapshot.date
                  )}
                </span>

                <strong>
                  {formatNumber(
                    snapshot
                      .totalRequests
                  )}
                </strong>

                <em
                  data-full={
                    snapshot
                      .countryBreakdown !==
                    null
                  }
                >
                  {snapshot
                    .countryBreakdown !==
                  null
                    ? "Full"
                    : "Summary"}
                </em>
              </div>
            )
          )}
      </div>
    </div>
  );
}


function EmptyLine({
  text,
}: {
  text: string;
}) {
  return (
    <div
      className={
        styles.empty
      }
    >
      {text}
    </div>
  );
}


function prettyDevice(
  value: string
): string {
  if (!value) {
    return "Other";
  }

  return (
    value
      .charAt(0)
      .toUpperCase() +
    value.slice(1)
  );
}


function deviceIcon(
  value: string
): ReactNode {
  const normalized =
    value.toLowerCase();

  if (
    normalized.includes(
      "mobile"
    )
  ) {
    return (
      <Smartphone
        size={12}
      />
    );
  }

  if (
    normalized.includes(
      "tablet"
    )
  ) {
    return (
      <Tablet
        size={12}
      />
    );
  }

  return (
    <Laptop2
      size={12}
    />
  );
}
