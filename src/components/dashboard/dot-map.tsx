"use client";

import { useMemo, useState } from "react";
import { COUNTRY_CENTERS, DOT_COLS, DOT_LAT_TOP, DOT_ROWS, DOT_ROWS_RLE, DOT_STEP } from "@/lib/geo/dot-map-data";
import s from "./dot-map.module.css";

export type DotMapRow = { code: string; label: string; value: number };

const CELL = 10;
const W = DOT_COLS * CELL;
const H = DOT_ROWS * CELL;
const project = (lon: number, lat: number): [number, number] => [((lon + 180) / DOT_STEP) * CELL, ((DOT_LAT_TOP - lat) / DOT_STEP) * CELL];

/** The land, as one path of small dots (one element instead of ~4,000). */
const LAND = (() => {
  const r = CELL * 0.26;
  let d = "";
  DOT_ROWS_RLE.forEach((row, y) => {
    if (!row) return;
    for (const run of row.split(",")) {
      const [a, n] = run.split(".").map((v) => parseInt(v, 36));
      for (let x = a; x < a + n; x++) {
        const cx = x * CELL + CELL / 2;
        const cy = y * CELL + CELL / 2;
        d += `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
      }
    }
  });
  return d;
})();

const pct = (v: number, total: number) => (total ? `${((v / total) * 100).toFixed(1)}%` : "0%");

/**
 * Dotted world map like Vercel's CDN regions: grey land dots, one blue circle per country sized by its share.
 * Bigger share = bigger and brighter circle. Hovering a row or a circle highlights both.
 */
export function DotMap({ rows, unit = "requests", withList = true, limit = 20, fill = false }: { rows: DotMapRow[]; unit?: string; withList?: boolean; limit?: number; /** Grow with the box it sits in (dashboard widget). */ fill?: boolean }) {
  const [active, setActive] = useState<string | null>(null);
  const sorted = useMemo(() => [...rows].filter((r) => r.value > 0).sort((a, b) => b.value - a.value), [rows]);
  const total = sorted.reduce((a, r) => a + r.value, 0);
  const max = sorted[0]?.value ?? 1;
  const placed = sorted.filter((r) => COUNTRY_CENTERS[r.code.toUpperCase()]);
  const hover = active ? sorted.find((r) => r.code === active) : null;

  return (
    <div className={`${withList ? s.wrap : s.wrapMapOnly}${fill ? ` ${s.fill}` : ""}`}>
      {withList ? (
        <ul className={s.list}>
          {sorted.slice(0, limit).map((r) => (
            <li key={r.code} className={s.row} data-active={active === r.code || undefined} onMouseEnter={() => setActive(r.code)} onMouseLeave={() => setActive(null)}>
              <i className={s.dot} style={{ opacity: 0.35 + 0.65 * Math.sqrt(r.value / max) }} aria-hidden />
              <span className={s.name}>{r.label}</span>
              <span className={s.pct}>{pct(r.value, total)}</span>
            </li>
          ))}
          {sorted.length === 0 ? <li className={s.empty}>No traffic in this period yet.</li> : null}
        </ul>
      ) : null}

      <div className={s.mapBox}>
        <svg viewBox={`0 ${CELL * 2} ${W} ${H - CELL * 2}`} className={s.map} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`World map of ${unit} by country`}>
          <path d={LAND} className={s.land} />
          {[...placed].reverse().map((r) => {
            const [x, y] = project(...COUNTRY_CENTERS[r.code.toUpperCase()]);
            const share = r.value / max;
            const radius = 5 + Math.sqrt(share) * 26;
            const on = active === r.code;
            return (
              <circle
                key={r.code}
                cx={x}
                cy={y}
                r={radius}
                className={s.bubble}
                data-active={on || undefined}
                style={{ fillOpacity: on ? 1 : 0.38 + 0.6 * Math.sqrt(share) }}
                onMouseEnter={() => setActive(r.code)}
                onMouseLeave={() => setActive(null)}
              >
                <title>{`${r.label}: ${r.value.toLocaleString("en-US")} ${unit} (${pct(r.value, total)})`}</title>
              </circle>
            );
          })}
        </svg>
        {hover ? (
          <div className={s.tip}>
            <span>{hover.label}</span>
            <strong>{hover.value.toLocaleString("en-US")}</strong>
            <em>{pct(hover.value, total)}</em>
          </div>
        ) : null}
      </div>
    </div>
  );
}
