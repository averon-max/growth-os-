"use client";
import { useEffect, useState } from "react";
import { X, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import styles from "./keyword-trend-drawer.module.css";

interface MonthlyPoint { year: number; month: number; searchVolume: number; }
interface GlobalVolume { code: string; label: string; flag: string; volume: number; }
interface OverviewData {
  keyword: string;
  monthlySearches: MonthlyPoint[];
  trend: { yearly: number | null; quarterly: number | null; monthly: number | null } | null;
  globalVolumes: GlobalVolume[];
  metrics: {
    volume: number | null;
    kd: number | null;
    cpc: number | null;
    competitionIndex: number | null;
    intent: string | null;
  } | null;
}

interface Props {
  keyword: string;
  workspaceId: string;
  market: string;
  language: string;
  onClose: () => void;
}

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmt(v: number | null): string {
  if (v === null) return "n/a";
  if (v >= 1_000_000) return `${(v/1_000_000).toFixed(1)}M`;
  if (v >= 10_000) return `${Math.round(v/1_000)}K`;
  if (v >= 1_000) return `${(v/1_000).toFixed(1)}K`;
  return v.toLocaleString();
}

function kdColor(kd: number | null): string {
  if (kd === null) return "var(--secondary)";
  if (kd < 30) return "var(--success)";
  if (kd < 60) return "var(--warning)";
  return "var(--danger)";
}

function TrendPill({ value, label }: { value: number | null; label: string }) {
  if (value === null) return <div style={{ fontSize: "0.7rem", color: "var(--secondary)" }}>{label}: n/a</div>;
  const sign = value > 0 ? "+" : "";
  const color = value > 0 ? "var(--success)" : value < 0 ? "var(--danger)" : "var(--secondary)";
  const abs = Math.abs(value);
  const display = abs >= 1000 ? `${(value/1000).toFixed(1)}K%` : `${value}%`;
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.72rem", color }}>
      <Icon size={11} />
      <span style={{ fontWeight: 600 }}>{sign}{display}</span>
      <span style={{ color: "var(--secondary)", fontWeight: 400 }}>{label}</span>
    </div>
  );
}

export function KeywordOverviewDrawer({ keyword, workspaceId, market, language, onClose }: Props) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setData(null);
    const p = new URLSearchParams({ workspaceId, keyword, market, language });
    fetch(`/api/keywords/overview?${p}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [keyword, workspaceId, market, language]);

  const volume = data?.metrics?.volume ?? null;
  const kd = data?.metrics?.kd ?? null;
  const cpcNum = data?.metrics?.cpc ?? null;
  const competitionIndex = data?.metrics?.competitionIndex ?? null;
  const intent = data?.metrics?.intent ?? null;
  const compDensity = competitionIndex !== null ? (competitionIndex / 100).toFixed(2) : "n/a";

  const chartData = (data?.monthlySearches ?? []).map(m => ({
    label: `${MONTH_LABELS[m.month-1]} '${String(m.year).slice(2)}`,
    volume: m.searchVolume,
  }));

  const maxGlobal = Math.max(...(data?.globalVolumes ?? []).map(g => g.volume), 1);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={e => e.stopPropagation()} style={{ maxWidth: 560, width: "100%" }}>
        <div className={styles.header}>
          <div>
            <div className={styles.title}>{keyword}</div>
            <div className={styles.subtitle}>Keyword Overview · {market}</div>
          </div>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close"><X size={16}/></button>
        </div>

        {loading ? <p className={styles.status}>Loading…</p> : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 0 8px" }}>

            {/* Metrics row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
              <div style={{ background: "var(--elevated)", borderRadius: 8, padding: "12px 14px" }}>
                <div style={{ fontSize: "0.65rem", color: "var(--secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Volume</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--primary)", lineHeight: 1 }}>{fmt(volume)}</div>
                <div style={{ fontSize: "0.65rem", color: "var(--secondary)", marginTop: 4 }}>{market} · {language}</div>
              </div>
              <div style={{ background: "var(--elevated)", borderRadius: 8, padding: "12px 14px" }}>
                <div style={{ fontSize: "0.65rem", color: "var(--secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Keyword Difficulty</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: kdColor(kd), lineHeight: 1 }}>{kd !== null ? kd : "n/a"}</div>
                <div style={{ fontSize: "0.65rem", color: "var(--secondary)", marginTop: 4 }}>{kd !== null ? (kd < 30 ? "Easy" : kd < 60 ? "Moderate" : "Hard") : "No data"}</div>
              </div>
              <div style={{ background: "var(--elevated)", borderRadius: 8, padding: "12px 14px" }}>
                <div style={{ fontSize: "0.65rem", color: "var(--secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>CPC</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--primary)", lineHeight: 1 }}>{cpcNum !== null && cpcNum > 0 ? `$${cpcNum.toFixed(2)}` : "n/a"}</div>
                <div style={{ fontSize: "0.65rem", color: "var(--secondary)", marginTop: 4 }}>Cost per click</div>
              </div>
              <div style={{ background: "var(--elevated)", borderRadius: 8, padding: "12px 14px" }}>
                <div style={{ fontSize: "0.65rem", color: "var(--secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Comp. Density</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "var(--primary)", lineHeight: 1 }}>{compDensity}</div>
                <div style={{ fontSize: "0.65rem", color: "var(--secondary)", marginTop: 4 }}>Paid competition</div>
              </div>
            </div>

            {/* Intent + Trend */}
            <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ background: "var(--elevated)", borderRadius: 8, padding: "10px 14px", minWidth: 120 }}>
                <div style={{ fontSize: "0.65rem", color: "var(--secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Intent</div>
                <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--primary)" }}>{intent ?? "n/a"}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <TrendPill value={data?.trend?.yearly ?? null} label="YoY" />
                <TrendPill value={data?.trend?.quarterly ?? null} label="QoQ" />
                <TrendPill value={data?.trend?.monthly ?? null} label="MoM" />
              </div>
            </div>

            {/* Global volume */}
            {(data?.globalVolumes ?? []).length > 0 && (
              <div style={{ background: "var(--elevated)", borderRadius: 8, padding: "12px 14px" }}>
                <div style={{ fontSize: "0.65rem", color: "var(--secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Global Volume</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  {data!.globalVolumes.sort((a,b) => (b.volume??0)-(a.volume??0)).map(g => (
                    <div key={g.code} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: "0.75rem", width: 28 }}>{g.flag}</span>
                      <span style={{ fontSize: "0.72rem", color: "var(--secondary)", width: 24 }}>{g.label}</span>
                      <div style={{ flex: 1, height: 6, background: "var(--border)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.round((g.volume/maxGlobal)*100)}%`, background: "var(--accent)", borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: "0.72rem", color: "var(--primary)", fontWeight: 600, width: 48, textAlign: "right" }}>{fmt(g.volume)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Monthly chart */}
            {chartData.length > 0 && (
              <div>
                <div style={{ fontSize: "0.65rem", color: "var(--secondary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Monthly Search Volume</div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: "var(--secondary)" }} />
                    <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 9, fill: "var(--secondary)" }} width={40} />
                    <Tooltip
                      contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", fontSize: 11 }}
                      formatter={(v) => [typeof v === "number" ? v.toLocaleString() : v, "volume"]}
                    />
                    <Bar dataKey="volume" fill="var(--accent)" radius={[2,2,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
