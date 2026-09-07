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

export function SuggestionTrendDrawer({
  keyword,
  monthlySearches,
  onClose,
}: {
  keyword: string;
  monthlySearches: MonthlySearchPoint[];
  onClose: () => void;
}) {
  const data = [...monthlySearches]
    .sort((a, b) => a.year - b.year || a.month - b.month)
    .map((m) => ({ label: `${MONTH_LABELS[m.month - 1]} \u2019${String(m.year).slice(2)}`, volume: m.searchVolume }));

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <div className={styles.title}>{keyword}</div>
            <div className={styles.subtitle}>Monthly search volume -- last 12 months</div>
          </div>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {data.length === 0 ? (
          <p className={styles.status}>No monthly history available for this keyword.</p>
        ) : (
          <div className={styles.chartBlock}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--secondary)" }} />
                <YAxis tick={{ fontSize: 10, fill: "var(--secondary)" }} width={40} />
                <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", fontSize: 12 }} />
                <Bar dataKey="volume" fill="var(--accent)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
