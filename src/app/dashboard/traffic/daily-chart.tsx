"use client";

import { useEffect, useRef, useState } from "react";
import type { DayPoint } from "@/lib/traffic/report";
import s from "./traffic.module.css";

type Key = "clicks" | "impressions" | "visitors";
const PANELS: { key: Key; title: string; source: string; color: string }[] = [
  { key: "clicks", title: "Google clicks", source: "Search Console", color: "#4c8df6" },
  { key: "impressions", title: "Google impressions", source: "Search Console", color: "#4c8df6" },
  { key: "visitors", title: "Visitors", source: "Cloudflare", color: "#d0742f" },
];
const H = 96;
const PAD = { top: 10, bottom: 6, left: 0, right: 0 };

const label = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const num = (v: number | null) => (v === null ? "—" : Math.round(v).toLocaleString("en-US"));

/**
 * One small chart per measure (they have very different scales), all on the same days.
 * Solid line: this period. Dashed grey: the same day of the period before.
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

  const x = (i: number) => PAD.left + (days <= 1 ? 0 : (i / (days - 1)) * (width - PAD.left - PAD.right));
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left - PAD.left) / Math.max(1, width - PAD.left - PAD.right)) * (days - 1));
    setHover(Math.min(days - 1, Math.max(0, i)));
  };

  return (
    <section className={s.panel} id="daily">
      <div className={s.panelHead}>
        <h2 className={s.panelTitle}>Day by day</h2>
        <span className={s.chartLegend}>
          <span><i className={s.lineNow} /> This period</span>
          <span><i className={s.lineBefore} /> Previous {days} days</span>
        </span>
      </div>
      <div ref={ref} className={s.chart} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        {width > 0 &&
          panels.map((p) => {
            const vals = now.map((d) => d[p.key]);
            const prev = before.map((d) => d[p.key]);
            const max = Math.max(1, ...vals.map((v) => v ?? 0), ...prev.map((v) => v ?? 0));
            const y = (v: number) => PAD.top + (1 - v / max) * (H - PAD.top - PAD.bottom);
            const path = (series: (number | null)[]) => {
              let d = "";
              let pen = false;
              series.forEach((v, i) => {
                if (v === null) {
                  pen = false;
                  return;
                }
                d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
                pen = true;
              });
              return d;
            };
            const total = vals.reduce<number>((a, v) => a + (v ?? 0), 0);
            return (
              <div key={p.key} className={s.chartRow}>
                <div className={s.chartMeta}>
                  <span className={s.chartTitle}>{p.title}</span>
                  <span className={s.chartSource}>{p.source}</span>
                  <span className={s.chartValue}>
                    {hover !== null ? num(vals[hover]) : num(total)}
                    <small>{hover !== null ? ` on ${label(now[hover].date)} · before ${num(prev[hover] ?? null)}` : " total"}</small>
                  </span>
                </div>
                <svg width={width} height={H} role="img" aria-label={`${p.title} per day`} className={s.svg}>
                  <line x1={0} x2={width} y1={H - PAD.bottom} y2={H - PAD.bottom} className={s.axis} />
                  <path d={path(prev)} fill="none" stroke="#5a5e66" strokeWidth={1.5} strokeDasharray="4 4" />
                  <path d={path(vals)} fill="none" stroke={p.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                  {hover !== null ? (
                    <>
                      <line x1={x(hover)} x2={x(hover)} y1={0} y2={H} className={s.cross} />
                      {vals[hover] !== null ? <circle cx={x(hover)} cy={y(vals[hover] as number)} r={4} fill={p.color} stroke="#0f1011" strokeWidth={2} /> : null}
                    </>
                  ) : null}
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
