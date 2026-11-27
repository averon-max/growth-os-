"use client";

import type { ReactNode } from "react";
import s from "./insights.module.css";

/*
 * Small Vercel-style insight cards shared by Backlinks, SEO audit, Keyword Planner and Keywords.
 * Every chart here is plain HTML: bars are divs, so they render instantly and never need a chart library.
 * Colours follow the dashboard palette in fixed order; text always stays in the grey text tokens.
 */

import { PALETTE, TONE } from "./insights-tokens";
export { PALETTE, TONE };

const compact = (n: number) =>
  Math.abs(n) >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M` : Math.abs(n) >= 1e4 ? `${Math.round(n / 1e3)}K` : Math.abs(n) >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(Math.round(n * 10) / 10);
export const fmtNum = (n: number | null | undefined) => (n === null || n === undefined ? "—" : compact(n));

export function InsightGrid({ children, cols = 3 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  return <div className={s.grid} data-cols={cols}>{children}</div>;
}

export function InsightCard({
  title,
  meta,
  action,
  children,
  span,
}: {
  title: string;
  meta?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  span?: 2 | 3;
}) {
  return (
    <section className={s.card} data-span={span}>
      <header className={s.cardHead}>
        <h3 className={s.cardTitle}>{title}</h3>
        {meta ? <span className={s.cardMeta}>{meta}</span> : null}
        {action ? <span className={s.cardAction}>{action}</span> : null}
      </header>
      <div className={s.cardBody}>{children}</div>
    </section>
  );
}

/** One big number with a caption. */
export function BigNumber({ value, label, tone }: { value: ReactNode; label?: ReactNode; tone?: keyof typeof TONE }) {
  return (
    <div className={s.big}>
      <span className={s.bigValue} style={tone ? { color: TONE[tone] } : undefined}>{value}</span>
      {label ? <span className={s.bigLabel}>{label}</span> : null}
    </div>
  );
}

export type BarRow = { key: string; label: ReactNode; value: number; color?: string; hint?: string; onClick?: () => void; active?: boolean; suffix?: ReactNode };

/** Horizontal bars, longest first, like Vercel's "Top paths" lists. */
export function BarList({ rows, unit, empty = "No data yet.", max: forcedMax }: { rows: BarRow[]; unit?: string; empty?: string; max?: number }) {
  if (rows.length === 0) return <p className={s.empty}>{empty}</p>;
  const max = forcedMax ?? Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className={s.bars}>
      {rows.map((r) => {
        const inner = (
          <>
            <span className={s.barTrack}>
              <span className={s.barFill} style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} />
              <span className={s.barLabel} title={r.hint}>
                {r.color ? <i className={s.barDot} style={{ background: r.color }} /> : null}
                {r.label}
              </span>
            </span>
            <span className={s.barValue}>
              {fmtNum(r.value)}
              {unit ? <span className={s.unit}> {unit}</span> : null}
              {r.suffix}
            </span>
          </>
        );
        return (
          <li key={r.key}>
            {r.onClick ? (
              <button type="button" className={s.barRow} data-active={r.active || undefined} onClick={r.onClick}>{inner}</button>
            ) : (
              <div className={s.barRow}>{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export type Part = { key: string; label: string; value: number; color: string; onClick?: () => void; active?: boolean };

/** One 100% bar split into parts, with a clickable legend underneath. */
export function StackBar({ parts, unit, compact }: { parts: Part[]; unit?: string; compact?: boolean }) {
  const total = parts.reduce((a, p) => a + p.value, 0);
  if (compact) {
    return (
      <div className={s.stack}>
        <div className={s.stackBar} role="img" aria-label={parts.map((p) => `${p.label} ${p.value}`).join(", ")}>
          {total === 0 ? <span className={s.stackEmpty} /> : parts.filter((p) => p.value > 0).map((p) => (
            <span key={p.key} style={{ flexGrow: p.value, background: p.color }} title={`${p.label}: ${p.value}`} />
          ))}
        </div>
        <div className={s.legendInline}>
          {parts.map((p) => (
            <span key={p.key}><i className={s.dot} style={{ background: p.color }} />{p.label} <b>{fmtNum(p.value)}</b></span>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className={s.stack}>
      <div className={s.stackBar} role="img" aria-label={parts.map((p) => `${p.label} ${p.value}`).join(", ")}>
        {total === 0 ? <span className={s.stackEmpty} /> : parts.filter((p) => p.value > 0).map((p) => (
          <span key={p.key} style={{ flexGrow: p.value, background: p.color }} title={`${p.label}: ${p.value}`} />
        ))}
      </div>
      <ul className={s.legend}>
        {parts.map((p) => {
          const pct = total ? Math.round((p.value / total) * 100) : 0;
          const body = (
            <>
              <span className={s.dot} style={{ background: p.color }} />
              <span className={s.legendLabel}>{p.label}</span>
              <span className={s.legendValue}>{fmtNum(p.value)}{unit ? ` ${unit}` : ""}</span>
              <span className={s.legendPct}>{pct}%</span>
            </>
          );
          return (
            <li key={p.key}>
              {p.onClick ? (
                <button type="button" className={s.legendRow} data-active={p.active || undefined} onClick={p.onClick}>{body}</button>
              ) : (
                <div className={s.legendRow}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export type Column = { key: string; label: string; value: number; color?: string; hint?: string; onClick?: () => void; active?: boolean };

/** Vertical bars with a label under each (histograms, months). */
export function Columns({ cols, height = 120, unit }: { cols: Column[]; height?: number; unit?: string }) {
  if (cols.length === 0) return <p className={s.empty}>No data yet.</p>;
  const max = Math.max(...cols.map((c) => c.value), 1);
  return (
    <div className={s.columns} style={{ height: height + 28 }}>
      {cols.map((c) => {
        const h = c.value === 0 ? 2 : Math.max(4, (c.value / max) * height);
        const bar = (
          <>
            <span className={s.colValue}>{c.value ? fmtNum(c.value) : ""}</span>
            <span className={s.colTrack} style={{ height }}>
              <span className={s.colFill} style={{ height: h, background: c.value ? (c.color ?? "#0090ff") : "#262626" }} />
            </span>
            <span className={s.colLabel}>{c.label}</span>
          </>
        );
        const title = `${c.label}: ${c.value}${unit ? ` ${unit}` : ""}${c.hint ? ` · ${c.hint}` : ""}`;
        return c.onClick ? (
          <button key={c.key} type="button" className={s.col} title={title} data-active={c.active || undefined} onClick={c.onClick}>{bar}</button>
        ) : (
          <div key={c.key} className={s.col} title={title}>{bar}</div>
        );
      })}
    </div>
  );
}

/** A score from 0 to max as a segmented meter (green / amber / red by the thresholds given). */
export function Meter({ value, max = 100, good = 80, warn = 50, invert = false, label }: { value: number | null; max?: number; good?: number; warn?: number; invert?: boolean; label?: ReactNode }) {
  const v = value ?? 0;
  const ok = invert ? v <= good : v >= good;
  const mid = invert ? v <= warn : v >= warn;
  const color = value === null ? TONE.muted : ok ? TONE.good : mid ? TONE.warn : TONE.bad;
  return (
    <div className={s.meter}>
      <div className={s.meterTrack}>
        <span style={{ width: `${Math.min(100, (v / max) * 100)}%`, background: color }} />
      </div>
      {label ? <span className={s.meterLabel}>{label}</span> : null}
    </div>
  );
}

/** A row of clickable numbers on top of a page (Vercel "Observability" strip). */
export type Kpi = { key: string; label: string; value: ReactNode; sub?: ReactNode; tone?: keyof typeof TONE; onClick?: () => void; active?: boolean; color?: string };
export function KpiStrip({ items }: { items: Kpi[] }) {
  return (
    <div className={s.kpis} style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
      {items.map((k) => {
        const body = (
          <>
            <span className={s.kpiLabel}>{k.label}</span>
            <span className={s.kpiValue} style={k.tone ? { color: TONE[k.tone] } : undefined}>{k.value}</span>
            {k.sub ? <span className={s.kpiSub}>{k.sub}</span> : null}
          </>
        );
        return k.onClick ? (
          <button key={k.key} type="button" className={s.kpi} data-active={k.active || undefined} onClick={k.onClick}>{body}</button>
        ) : (
          <div key={k.key} className={s.kpi}>{body}</div>
        );
      })}
    </div>
  );
}
