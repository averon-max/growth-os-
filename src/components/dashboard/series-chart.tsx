"use client";

import { useMemo, useState } from "react";
import { BarChart3, LineChart } from "lucide-react";
import s from "./series-chart.module.css";

/** One blue family instead of a rainbow (no purple, no pink): neighbours in a stack alternate light and dark so they stay apart. */
export const SERIES_COLORS = ["#0090ff", "#9ccaff", "#0b5cad", "#d6eaff", "#4d8fd6", "#6e7f96", "#a0a5ae"];
const OTHER = "#34343a";

export type SeriesDay = { date: string; values: Record<string, number> };

const fmtDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const fmtNum = (n: number) => Math.round(n).toLocaleString("en-US");

/**
 * Vercel AI Gateway–style chart: each day is a column showing how the total splits between the top items
 * (100% stacked bars, "Other" in grey), or one line per item. The list on the right ranks items by their share
 * over the whole period. Hover a column for that day's numbers; hover a legend row to isolate one item.
 */
export function SeriesChart({
  title,
  description,
  days,
  labels,
  unit,
  top = 5,
  initialMode = "bars",
  compact = false,
}: {
  title: string;
  description: string;
  days: SeriesDay[];
  /** Inside a dashboard widget: no outer padding, shorter plot. */
  compact?: boolean;
  labels?: Record<string, string>;
  unit: string;
  top?: number;
  initialMode?: "bars" | "lines";
}) {
  const [mode, setMode] = useState(initialMode);
  const [hoverDay, setHoverDay] = useState<number | null>(null);
  const [focus, setFocus] = useState<string | null>(null);

  const { keys, totals, grand } = useMemo(() => {
    const totals = new Map<string, number>();
    for (const d of days) for (const [k, v] of Object.entries(d.values)) totals.set(k, (totals.get(k) ?? 0) + v);
    const keys = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, Math.min(top, SERIES_COLORS.length)).map(([k]) => k);
    const grand = [...totals.values()].reduce((a, b) => a + b, 0);
    return { keys, totals, grand };
  }, [days, top]);

  const color = (k: string) => SERIES_COLORS[keys.indexOf(k)] ?? OTHER;
  const name = (k: string) => labels?.[k] ?? k;
  const otherTotal = grand - keys.reduce((a, k) => a + (totals.get(k) ?? 0), 0);
  const dayTotal = (d: SeriesDay) => Object.values(d.values).reduce((a, b) => a + b, 0);

  if (!days.length || grand === 0) {
    return (
      <section className={compact ? `${s.section} ${s.compact}` : s.section}>
        <Header title={title} description={description} mode={mode} setMode={setMode} />
        <p className={s.empty}>No data for this period yet.</p>
      </section>
    );
  }

  const W = 1000;
  const H = 320;
  const gap = days.length > 60 ? 1 : 2;
  const colW = W / days.length;
  const shares = days.map((d) => {
    const t = dayTotal(d);
    return Object.fromEntries(keys.map((k) => [k, t ? (d.values[k] ?? 0) / t : 0]));
  });
  const maxShare = Math.max(0.05, ...shares.flatMap((sh) => keys.map((k) => sh[k])));
  const hovered = hoverDay !== null ? days[hoverDay] : null;

  return (
    <section className={compact ? `${s.section} ${s.compact}` : s.section}>
      <Header title={title} description={description} mode={mode} setMode={setMode} />
      <div className={s.body}>
        <div className={s.plot} onMouseLeave={() => setHoverDay(null)}>
          <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={s.svg} role="img" aria-label={`${title}, ${days.length} days`}>
            {mode === "bars"
              ? days.map((d, i) => {
                  const x = i * colW + gap / 2;
                  const w = Math.max(1, colW - gap);
                  let y = H;
                  const sh = shares[i];
                  // Largest item at the bottom, the rest above it in the same order every day, "Other" on top;
                  // a thin gap of background between segments keeps neighbouring colours apart.
                  const segGap = 3;
                  return (
                    <g key={d.date} onMouseEnter={() => setHoverDay(i)} opacity={hoverDay === null || hoverDay === i ? 1 : 0.55}>
                      <rect x={x} y={0} width={w} height={H} fill="transparent" />
                      {keys.map((k) => {
                        const h = sh[k] * H;
                        y -= h;
                        if (h <= 0) return null;
                        const visible = h > segGap * 2 ? h - segGap : h;
                        return <rect key={k} x={x} y={y + (h - visible)} width={w} height={visible} fill={color(k)} opacity={focus && focus !== k ? 0.25 : 1} />;
                      })}
                      {y > segGap * 2 ? <rect x={x} y={0} width={w} height={y - segGap} fill={OTHER} opacity={focus ? 0.25 : 1} /> : null}
                    </g>
                  );
                })
              : (
                <>
                  {[0.25, 0.5, 0.75, 1].map((g) => (
                    <line key={g} x1={0} x2={W} y1={H - (g * H) / 1} y2={H - (g * H) / 1} className={s.grid} vectorEffect="non-scaling-stroke" />
                  ))}
                  {keys.map((k) => {
                    const pts = shares.map((sh, i) => `${(i + 0.5) * colW},${H - (sh[k] / maxShare) * (H - 8)}`).join(" ");
                    return (
                      <polyline
                        key={k}
                        points={pts}
                        fill="none"
                        stroke={color(k)}
                        strokeWidth={focus === k ? 2.5 : 1.75}
                        strokeLinejoin="round"
                        opacity={focus && focus !== k ? 0.2 : 1}
                        vectorEffect="non-scaling-stroke"
                      />
                    );
                  })}
                  {days.map((d, i) => (
                    <rect key={d.date} x={i * colW} y={0} width={colW} height={H} fill="transparent" onMouseEnter={() => setHoverDay(i)} />
                  ))}
                  {hoverDay !== null ? <line x1={(hoverDay + 0.5) * colW} x2={(hoverDay + 0.5) * colW} y1={0} y2={H} className={s.cross} vectorEffect="non-scaling-stroke" /> : null}
                </>
              )}
          </svg>
          {mode === "lines" ? (
            <div className={s.yAxis} aria-hidden>
              {[1, 0.75, 0.5, 0.25].map((g) => (
                <span key={g} style={{ top: `${(1 - g) * 100}%` }}>{Math.round(g * maxShare * 100)}%</span>
              ))}
            </div>
          ) : null}
          {hovered ? (
            <div className={s.tip} style={{ left: `${Math.min(78, Math.max(2, ((hoverDay ?? 0) / days.length) * 100))}%` }}>
              <div className={s.tipDate}>{fmtDate(hovered.date)}</div>
              {keys.map((k) => (
                <div key={k} className={s.tipRow}>
                  <i style={{ background: color(k) }} />
                  <span>{name(k)}</span>
                  <strong>{fmtNum(hovered.values[k] ?? 0)}</strong>
                </div>
              ))}
              <div className={s.tipTotal}>
                <span>Total {unit}</span>
                <strong>{fmtNum(dayTotal(hovered))}</strong>
              </div>
            </div>
          ) : null}
          <div className={s.dates}>
            <span>{fmtDate(days[0].date)}</span>
            <span>{fmtDate(days[days.length - 1].date)}</span>
          </div>
        </div>

        <ol className={s.legend}>
          {keys.map((k, i) => (
            <li key={k} onMouseEnter={() => setFocus(k)} onMouseLeave={() => setFocus(null)} data-dim={focus && focus !== k ? true : undefined}>
              <span className={s.rank}>{i + 1}</span>
              <i style={{ background: color(k) }} />
              <span className={s.name} title={name(k)}>{name(k)}</span>
              <span className={s.share}>{((totals.get(k) ?? 0) / grand * 100).toFixed(1)}%</span>
            </li>
          ))}
          {otherTotal > 0 ? (
            <li>
              <span className={s.rank}>{keys.length + 1}</span>
              <i style={{ background: "#8a8f98" }} />
              <span className={s.name}>Other</span>
              <span className={s.share}>{(otherTotal / grand * 100).toFixed(1)}%</span>
            </li>
          ) : null}
        </ol>
      </div>
    </section>
  );
}

function Header({ title, description, mode, setMode }: { title: string; description: string; mode: "bars" | "lines"; setMode: (m: "bars" | "lines") => void }) {
  return (
    <header className={s.head}>
      <div>
        <h2 className={s.title}>{title}</h2>
        <p className={s.desc}>{description}</p>
      </div>
      <div className={s.toggle} role="group" aria-label="Chart type">
        <button type="button" data-active={mode === "bars" || undefined} onClick={() => setMode("bars")} aria-label="Bars">
          <BarChart3 size={16} strokeWidth={1.6} />
        </button>
        <button type="button" data-active={mode === "lines" || undefined} onClick={() => setMode("lines")} aria-label="Lines">
          <LineChart size={16} strokeWidth={1.6} />
        </button>
      </div>
    </header>
  );
}
