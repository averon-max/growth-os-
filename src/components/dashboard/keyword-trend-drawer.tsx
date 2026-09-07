"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import styles from "./keyword-trend-drawer.module.css";

interface SnapshotPoint {
  date: string;
  position: number | null;
  clicks: number | null;
  impressions: number | null;
  ctr: number | null;
}

interface SnapshotsResponse {
  keyword: string;
  snapshots: SnapshotPoint[];
}

export function KeywordTrendDrawer({
  keywordId,
  workspaceId,
  onClose,
}: {
  keywordId: string;
  workspaceId: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<SnapshotsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/keywords/${keywordId}/snapshots?workspaceId=${workspaceId}&days=90`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load trend data.");
        return res.json();
      })
      .then((json: SnapshotsResponse) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load trend data.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [keywordId, workspaceId]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <div className={styles.title}>{data?.keyword ?? "Keyword trend"}</div>
            <div className={styles.subtitle}>Last 90 days</div>
          </div>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {loading && <p className={styles.status}>Loading...</p>}
        {error && <p className={styles.statusError}>{error}</p>}

        {data && !loading && !error && (
          data.snapshots.length === 0 ? (
            <p className={styles.status}>No historical data yet for this keyword.</p>
          ) : (
            <>
              <div className={styles.chartBlock}>
                <div className={styles.chartLabel}>Position (lower is better)</div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={data.snapshots} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--secondary)" }} />
                    <YAxis reversed tick={{ fontSize: 10, fill: "var(--secondary)" }} width={28} />
                    <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", fontSize: 12 }} />
                    <Line type="monotone" dataKey="position" stroke="var(--accent)" dot={false} strokeWidth={2} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className={styles.chartBlock}>
                <div className={styles.chartLabel}>Clicks & impressions</div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={data.snapshots} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--secondary)" }} />
                    <YAxis tick={{ fontSize: 10, fill: "var(--secondary)" }} width={28} />
                    <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", fontSize: 12 }} />
                    <Line type="monotone" dataKey="impressions" stroke="var(--secondary)" dot={false} strokeWidth={2} connectNulls />
                    <Line type="monotone" dataKey="clicks" stroke="var(--success)" dot={false} strokeWidth={2} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
}
