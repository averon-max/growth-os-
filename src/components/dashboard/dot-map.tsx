"use client";

import { useMemo, useRef, useState } from "react";
import { WORLD, WORLD_H, WORLD_W } from "@/lib/geo/world-paths";
import s from "./dot-map.module.css";

export type DotMapRow = { code: string; label: string; value: number };

const pct = (v: number, total: number) => (total ? `${((v / total) * 100).toFixed(1)}%` : "0%");

/** Dark land → Vercel blue: countries with more visits are brighter. */
const LOW = [22, 44, 74];
const HIGH = [0, 144, 255];
const shade = (t: number) => {
  const k = Math.max(0, Math.min(1, t));
  const c = LOW.map((a, i) => Math.round(a + (HIGH[i] - a) * k));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
};

/**
 * World map with real country shapes. Every country with traffic is filled in blue, brighter for a bigger share;
 * the rest of the land stays dark. Hover a country or a row of the list to see its numbers.
 * (The name is kept from the earlier dotted map so every page that used it gets this one.)
 */
export function DotMap({ rows, unit = "requests", withList = true, limit = 20, fill = false }: { rows: DotMapRow[]; unit?: string; withList?: boolean; limit?: number; /** Grow with the box it sits in (dashboard widget). */ fill?: boolean }) {
  const [active, setActive] = useState<string | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const sorted = useMemo(() => [...rows].filter((r) => r.value > 0).sort((a, b) => b.value - a.value), [rows]);
  const byCode = useMemo(() => new Map(sorted.map((r) => [r.code.toUpperCase(), r])), [sorted]);
  const total = sorted.reduce((a, r) => a + r.value, 0);
  const max = sorted[0]?.value ?? 1;
  const hover = active ? byCode.get(active) ?? null : null;
  const hoverName = active && !hover ? WORLD.find((c) => c.code === active)?.name ?? null : null;

  const move = (e: React.PointerEvent) => {
    const r = box.current?.getBoundingClientRect();
    if (r) setTip({ x: e.clientX - r.left, y: e.clientY - r.top });
  };

  return (
    <div className={`${withList ? s.wrap : s.wrapMapOnly}${fill ? ` ${s.fill}` : ""}`}>
      {withList ? (
        <ul className={s.list}>
          {sorted.slice(0, limit).map((r, i) => (
            <li key={r.code} className={s.row} data-active={active === r.code.toUpperCase() || undefined} onMouseEnter={() => setActive(r.code.toUpperCase())} onMouseLeave={() => setActive(null)}>
              <span className={s.rank}>{i + 1}</span>
              <span className={s.name}>{r.label}</span>
              <span className={s.pct}>{pct(r.value, total)}</span>
              <span className={s.bar}><i style={{ width: `${(r.value / max) * 100}%` }} /></span>
            </li>
          ))}
          {sorted.length === 0 ? <li className={s.empty}>No traffic in this period yet.</li> : null}
        </ul>
      ) : null}

      <div className={s.mapBox} ref={box} onPointerMove={move} onPointerLeave={() => { setActive(null); setTip(null); }}>
        <svg viewBox={`0 0 ${WORLD_W} ${WORLD_H}`} className={s.map} preserveAspectRatio="xMidYMid meet" role="img" aria-label={`World map of ${unit} by country`}>
          {WORLD.map((c) => {
            const r = byCode.get(c.code);
            const on = active === c.code;
            return (
              <path
                key={c.code}
                d={c.d}
                className={r ? s.hot : s.land}
                data-active={on || undefined}
                style={r ? { fill: on ? "#52a9ff" : shade(0.15 + 0.85 * Math.sqrt(r.value / max)) } : undefined}
                onPointerEnter={() => setActive(c.code)}
              />
            );
          })}
        </svg>
        {active && tip && (hover || hoverName) ? (
          <div className={s.tip} style={{ left: tip.x, top: tip.y }}>
            <span>{hover?.label ?? hoverName}</span>
            {hover ? (
              <>
                <strong>{hover.value.toLocaleString("en-US")}</strong>
                <em>{pct(hover.value, total)}</em>
              </>
            ) : (
              <em>no {unit}</em>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
