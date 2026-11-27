"use client";

import { useEffect, useRef, useState } from "react";
import type { DayPoint } from "@/lib/traffic/report";
import s from "./traffic.module.css";

type Key = "clicks" | "impressions" | "visitors";
const PANELS: { key: Key; title: string; source: string; color: string }[] = [
  { key: "clicks", title: "Google clicks", source: "Search Console", color: "#f5a623" },
  { key: "impressions", title: "Google impressions", source: "Search Console", color: "#0090ff" },
  { key: "visitors", title: "Visitors", source: "Cloudflare", color: "#12a594" },
];
const H = 110;
const PAD = { top: 10, bottom: 6, left: 0, right: 0 };

const label = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const num = (v: number | null) => (v === null ? "—" : Math.round(v).toLocaleString("en-US"));

/**
 * One small bar chart per measure (they have very different scales), all on the same days.
 * Coloured bars: this period. Grey bars behind: the same day of the period before.
 */
export function DailyChart({ now, before, days }: { now: DayPoint[]; before: DayPoint[]; days: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const panels = PANELS.filter((p) => now.some((d) => d[p.key] !== null));
  if (!panels.length) return null;

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.floor(((e.clientX - r.left) / Math.max(1, width)) * days);
    setHover(Math.min(days - 1, Math.max(0, i)));
  };

  return (
    <section className={s.panel} id="daily">
      <div className={s.panelHead}>
        <h2 className={s.panelTitle}>Day by day</h2>
        <span className={s.chartLegend}>
          <span><i className={s.barNow} /> This period</span>
          <span><i className={s.barBefore} /> Previous {days} days</span>
        </span>
      </div>
      <div ref={ref} className={s.chart} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        {width > 0 &&
          panels.map((p) => {
            const vals = now.map((d) => d[p.key]);
            const prev = before.map((d) => d[p.key]);
            const max = Math.max(1, ...vals.map((v) => v ?? 0), ...prev.map((v) => v ?? 0));
            const y = (v: number) => PAD.top + (1 - v / max) * (H - PAD.top - PAD.bottom);
            const total = vals.reduce<number>((a, v) => a + (v ?? 0), 0);
            const prevTotal = prev.reduce<number>((a, v) => a + (v ?? 0), 0);
            const delta = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : null;
            const step = days <= 1 ? width : width / days;
            const bw = Math.max(2, Math.min(28, step * 0.62));
            const bx = (i: number) => i * step + (step - bw) / 2;
            const base = H - PAD.bottom;
            return (
              <div key={p.key} className={s.chartRow}>
                <div className={s.chartMeta}>
                  <span className={s.chartTitle}><i className={s.seriesDot} style={{ background: p.color }} />{p.title}</span>
                  <span className={s.chartSource}>{p.source}</span>
                  {hover === null && delta !== null ? (
                    <span className={s.chartDelta} data-tone={delta > 0 ? "up" : delta < 0 ? "down" : undefined}>{delta > 0 ? "+" : ""}{delta}%</span>
                  ) : null}
                  <span className={s.chartValue}>
                    {hover !== null ? num(vals[hover]) : num(total)}
                    <small>{hover !== null ? ` on ${label(now[hover].date)} · before ${num(prev[hover] ?? null)}` : ` total · before ${num(prevTotal)}`}</small>
                  </span>
                </div>
                <svg width={width} height={H} role="img" aria-label={`${p.title} per day`} className={s.svg}>
                  <line x1={0} x2={width} y1={base} y2={base} className={s.axis} />
                  {prev.map((v, i) => (v ? <rect key={`b${i}`} x={i * step + 1} width={Math.max(1, step - 2)} y={y(v)} height={base - y(v)} rx={3} fill="#1f1f1f" /> : null))}
                  {vals.map((v, i) => (v ? <rect key={`n${i}`} x={bx(i)} width={bw} y={y(v)} height={Math.max(2, base - y(v))} rx={3} fill={p.color} opacity={hover === null || hover === i ? 1 : 0.45} /> : null))}
                  {hover !== null ? <line x1={bx(hover) + bw / 2} x2={bx(hover) + bw / 2} y1={0} y2={H} className={s.cross} /> : null}
                </svg>
              </div>
            );
          })}
        <div className={s.chartDates}>
          <span>{label(now[0].date)}</span>
          <span>{label(now[now.length - 1].date)}</span>
        </div>
      </div>
    </section>
  );
}
