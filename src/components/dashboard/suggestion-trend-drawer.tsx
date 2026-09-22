"use client";

import { X } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import styles from "./keyword-trend-drawer.module.css";

interface MonthlySearchPoint {
  year: number;
  month: number;
  searchVolume: number;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000) return `${Math.round(v / 1_000)}K`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(v);
}

function smartDomain(values: number[]): [number, number] {
  if (values.length === 0) return [0, 1000];
  const sorted = values.slice().sort((a, b) => a - b);
  const max = sorted[sorted.length - 1];
  // p90: ignore top 10% outliers for axis scale so bulk of bars are readable
  const p90idx = Math.floor(sorted.length * 0.9);
  const p90 = sorted[Math.min(p90idx, sorted.length - 1)] ?? max;
  // If max > 3x p90, cap axis at 1.3x p90 (tooltip still shows exact value)
  const visMax = max > p90 * 3 && sorted.length >= 4
    ? Math.ceil(p90 * 1.3 / 1000) * 1000
    : Math.ceil(max * 1.15 / 1000) * 1000;
  return [0, Math.max(visMax, 500)];
}

export function SuggestionTrendDrawer({
  keyword,
  monthlySearches,
  onClose,
}: {
  keyword: string;
  monthlySearches: MonthlySearchPoint[];
  onClose: () => void;
}) {
  const sortedMonths = [...monthlySearches].sort((a, b) => a.year - b.year || a.month - b.month);
  const data = sortedMonths.map((m) => ({ label: `${MONTH_LABELS[m.month - 1]} '${String(m.year).slice(2)}`, volume: m.searchVolume }));
  const domain = smartDomain(data.map((d) => d.volume));
  const hasOutlier = Math.max(...data.map((d) => d.volume), 0) > domain[1];

  const first = sortedMonths[0];
  const last = sortedMonths[sortedMonths.length - 1];
  const dateRangeLabel = sortedMonths.length >= 2
    ? `${MONTH_LABELS[first.month - 1]} ${first.year}–${MONTH_LABELS[last.month - 1]} ${last.year}`
    : "last 12 months";

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <div className={styles.title}>{keyword}</div>
            <div className={styles.subtitle}>Monthly search volume — {dateRangeLabel}</div>
          </div>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {data.length === 0 ? (
          <p className={styles.status}>No monthly history available for this keyword.</p>
        ) : (
          <div className={styles.chartBlock}>
            {hasOutlier && (
              <p style={{ fontSize: "0.7rem", color: "var(--warning)", marginBottom: 6 }}>
                ↑ Peak month exceeds chart scale — hover bars for exact values.
              </p>
            )}
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--secondary)" }} />
                <YAxis
                  domain={domain}
                  tickFormatter={formatVolume}
                  tick={{ fontSize: 10, fill: "var(--secondary)" }}
                  width={44}
                />
                <Tooltip
                  contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", fontSize: 12 }}
                  formatter={(value) => [typeof value === "number" ? value.toLocaleString() : String(value ?? ""), "volume"]}
                />
                <Bar dataKey="volume" fill="var(--accent)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
