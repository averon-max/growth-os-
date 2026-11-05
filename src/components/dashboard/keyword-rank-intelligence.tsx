"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, Loader2, RefreshCw } from "lucide-react";

import { KeywordCard } from "./keyword-card";
import { LinearList, type LGroup, type LRow, type LStatus } from "./linear-list";
import styles from "./keyword-rank-intelligence.module.css";

type Days = 7 | 28 | 90;
type KeywordSignal = "TOP" | "QUICK_WIN" | "RISING" | "DECLINING" | "NO_VISIBILITY" | "IMPROVE";
type Metric = "impressions" | "clicks" | "avgPosition";

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
  chart: Array<{ date: string; impressions: number; avgImpressions: number; clicks: number; avgPosition: number | null }>;
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

const SIGNAL: Record<KeywordSignal, { label: string; group: string; status: LStatus; tone: string; hint: string; order: number }> = {
  QUICK_WIN: { label: "Quick win", group: "Quick wins", status: "yellow", tone: "#f2c94c", hint: "close to the top — push this page", order: 0 },
  RISING: { label: "Rising", group: "Rising", status: "blue", tone: "#60a5fa", hint: "climbing — strengthen the page now", order: 1 },
  DECLINING: { label: "Declining", group: "Declining", status: "red", tone: "#eb5757", hint: "dropping — review page and competitors", order: 2 },
  TOP: { label: "Top", group: "Holding the top", status: "green", tone: "#4cb782", hint: "near the top — hold the position", order: 3 },
  IMPROVE: { label: "Improve", group: "Room to grow", status: "gray", tone: "#d0d6e0", hint: "find what holds the page back", order: 4 },
  NO_VISIBILITY: { label: "Not visible", group: "Not visible yet", status: "gray", tone: "#8a8f98", hint: "Google rarely shows the site", order: 5 },
};

const METRICS: { id: Metric; label: string }[] = [
  { id: "impressions", label: "Impressions" },
  { id: "clicks", label: "Clicks" },
  { id: "avgPosition", label: "Position" },
];

function fmt(value: number | null | undefined, digits = 1): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", { notation: value >= 10000 ? "compact" : "standard", maximumFractionDigits: digits }).format(value);
}

function shortDate(value: string): string {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function delta(value: number | null): string | null {
  if (value == null || Math.abs(value) < 1) return null;
  return value > 0 ? `↑ ${value.toFixed(1)}` : `↓ ${Math.abs(value).toFixed(1)}`;
}

export function KeywordRankIntelligence({ workspaceId, websiteId = null }: { workspaceId: string; websiteId?: string | null }) {
  const [days, setDays] = useState<Days>(28);
  const [metric, setMetric] = useState<Metric>("impressions");
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [card, setCard] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/keywords/analytics?workspaceId=${encodeURIComponent(workspaceId)}&days=${days}`, { cache: "no-store" });
      const payload = (await response.json()) as AnalyticsResponse & { error?: string };
      if (response.ok === false) throw new Error(payload.error ?? "Could not load data from Google.");
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load data from Google.");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, days]);

  useEffect(() => {
    void load();
  }, [load]);

  const s = data?.stats;

  // распределение позиций: топ-3 / 4–10 / 11–20 / дальше
  const buckets = useMemo(() => {
    if (s == null) return [];
    const total = Math.max(s.keywordsWithData, s.top20, 1);
    const parts = [
      { label: "Top 3", n: s.top3, color: "#3b82f6" },
      { label: "4–10", n: Math.max(s.top10 - s.top3, 0), color: "#60a5fa" },
      { label: "11–20", n: Math.max(s.top20 - s.top10, 0), color: "#93c5fd" },
      { label: "20+", n: Math.max(total - s.top20, 0), color: "#34343a" },
    ];
    return parts.map((p) => ({ ...p, pct: (p.n / total) * 100 }));
  }, [s]);

  const groups: LGroup[] = useMemo(() => {
    if (data == null) return [];
    const sorted = [...data.keywords].sort((a, b) => b.opportunityScore - a.opportunityScore).slice(0, 40);
    const byGroup = new Map<KeywordSignal, LRow[]>();
    sorted.forEach((k, i) => {
      const meta = SIGNAL[k.signal] ?? SIGNAL.IMPROVE;
      const change = delta(k.positionDelta7d);
      const row: LRow = {
        key: k.id,
        id: `KW-${i + 1}`,
        status: meta.status,
        title: k.keyword,
        hint: meta.hint,
        pills: [{ label: meta.label, dot: meta.tone }],
        metrics: [
          k.position == null ? "no rank" : `pos ${k.position.toFixed(1)}`,
          ...(change ? [change] : []),
          `${fmt(k.impressions)} impr`,
          k.volume == null ? "vol —" : `vol ${fmt(k.volume)}`,
        ],
        onClick: () => setCard(k.keyword),
      };
      byGroup.set(k.signal, [...(byGroup.get(k.signal) ?? []), row]);
    });
    return [...byGroup.entries()]
      .sort((a, b) => (SIGNAL[a[0]]?.order ?? 9) - (SIGNAL[b[0]]?.order ?? 9))
      .map(([signal, rows]) => ({ title: SIGNAL[signal]?.group ?? signal, status: SIGNAL[signal]?.status ?? "gray", count: rows.length, rows }));
  }, [data]);

  const chartKey = metric;
  const chartColor = metric === "clicks" ? "#4cb782" : "#60a5fa";

  return (
    <section className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headText}>
          <h2 className={styles.title}>How people find your site</h2>
          <p className={styles.subtitle}>Google Search Console · last {days} days · real impressions, clicks and positions</p>
        </div>
        <div className={styles.headActions}>
          <div className={styles.segment} role="tablist">
            {([7, 28, 90] as Days[]).map((value) => (
              <button key={value} type="button" className={styles.segmentBtn} data-on={days === value ? "true" : "false"} onClick={() => setDays(value)}>
                {value}d
              </button>
            ))}
          </div>
          <button type="button" className={styles.iconBtn} onClick={() => void load()} disabled={loading} title="Reload">
            {loading ? <Loader2 size={14} className={styles.spin} /> : <RefreshCw size={14} />}
          </button>
        </div>
      </header>

      {error ? <div className={styles.error}>{error}</div> : null}
      {data == null ? (
        <div className={styles.empty}>{loading ? "Loading Google Search Console data…" : "No data to analyze yet."}</div>
      ) : (
        <>
          <div className={styles.metrics}>
            {[
              { label: "Queries", value: fmt(s?.trackedKeywords), sub: `${fmt(s?.keywordsWithData)} with data` },
              { label: "Impressions", value: fmt(s?.impressions), sub: `${fmt(s?.avgImpressionsPerKeyword)} per query` },
              { label: "Clicks", value: fmt(s?.clicks), sub: s && s.impressions > 0 ? `CTR ${((s.clicks / s.impressions) * 100).toFixed(1)}%` : "CTR —" },
              { label: "Avg position", value: s?.avgPosition == null ? "—" : s.avgPosition.toFixed(1), sub: "lower is better" },
              { label: "Page one", value: fmt(s?.top10), sub: `${fmt(s?.nearFirstPage)} in striking distance` },
            ].map((m) => (
              <div key={m.label} className={styles.metric}>
                <span className={styles.metricLabel}>{m.label}</span>
                <strong className={styles.metricValue}>{m.value}</strong>
                <span className={styles.metricSub}>{m.sub}</span>
              </div>
            ))}
            <div className={styles.metric}>
              <span className={styles.metricLabel}>Movement</span>
              <strong className={styles.metricValue}>
                <span className={styles.up}><ArrowUpRight size={15} />{s?.improved ?? 0}</span>
                <span className={styles.down}><ArrowDownRight size={15} />{s?.declined ?? 0}</span>
              </strong>
              <span className={styles.metricSub}>queries up / down</span>
            </div>
          </div>

          <div className={styles.distribution}>
            <div className={styles.distBar}>
              {buckets.map((b) => (b.n > 0 ? <span key={b.label} style={{ width: `${Math.max(b.pct, 2)}%`, background: b.color }} title={`${b.label}: ${b.n}`} /> : null))}
            </div>
            <div className={styles.distLegend}>
              {buckets.map((b) => (
                <span key={b.label} className={styles.distItem}>
                  <i style={{ background: b.color }} />
                  {b.label}
                  <strong>{b.n}</strong>
                </span>
              ))}
            </div>
          </div>

          <div className={styles.panel}>
            <div className={styles.panelHead}>
              <span className={styles.panelTitle}>Visibility</span>
              <div className={styles.chips}>
                {METRICS.map((m) => (
                  <button key={m.id} type="button" className={styles.chip} data-on={metric === m.id ? "true" : "false"} onClick={() => setMetric(m.id)}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.chart}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.chart} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="#1d1e21" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: "#62666d", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={32} />
                  <YAxis
                    tick={{ fill: "#62666d", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                    reversed={metric === "avgPosition"}
                    allowDecimals={metric === "avgPosition"}
                    domain={metric === "avgPosition" ? [1, "dataMax"] : [0, "auto"]}
                  />
                  <Tooltip
                    cursor={{ stroke: "#34343a" }}
                    contentStyle={{ background: "#141516", border: "1px solid #23252a", borderRadius: 8, fontSize: 12, color: "#d0d6e0" }}
                    labelStyle={{ color: "#f7f8f8", marginBottom: 4 }}
                    labelFormatter={(label) => shortDate(String(label))}
                    formatter={(v) => [metric === "avgPosition" ? Number(v).toFixed(1) : fmt(Number(v)), METRICS.find((m) => m.id === metric)?.label ?? ""]}
                  />
                  <Area
                    type="monotone"
                    dataKey={chartKey}
                    stroke={chartColor}
                    strokeWidth={1.75}
                    fill={chartColor}
                    fillOpacity={0.08}
                    dot={false}
                    activeDot={{ r: 3, fill: chartColor, stroke: "#101112", strokeWidth: 2 }}
                    connectNulls
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={styles.list}>
            <div className={styles.listHead}>
              <span className={styles.panelTitle}>Easiest wins</span>
              <span className={styles.listHint}>sorted by opportunity · click a query for the full breakdown</span>
            </div>
            <LinearList groups={groups} empty="No queries with Search Console data yet." />
          </div>

          <p className={styles.notice}>Positions are Search Console averages and vary by user, device and location. Use Live SERP for an exact check.</p>
        </>
      )}

      {card && websiteId ? <KeywordCard keyword={card} workspaceId={workspaceId} websiteId={websiteId} onClose={() => setCard(null)} /> : null}
    </section>
  );
}
