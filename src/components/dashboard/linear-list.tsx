"use client";
import type { ReactNode } from "react";
import s from "./linear-list.module.css";

export type LStatus = "red" | "green" | "yellow" | "gray" | "blue";
export interface LRow { key: string; id?: string; status: LStatus; title: string; hint?: string; pills?: { label: string; dot?: string }[]; metrics?: string[]; date?: string; onClick?: () => void; actions?: ReactNode }
export interface LGroup { title: string; count: number; status: LStatus; rows: LRow[] }

const COLOR: Record<LStatus, string> = { red: "#e5484d", green: "#d0d6e0", yellow: "#8a8f98", gray: "#62666d", blue: "#0090ff" };
const SHAPE: Record<LStatus, string> = { red: s.half, green: s.full, yellow: s.half, gray: "", blue: s.full };

/*
 * Pills are monochrome, as in Linear: one neutral outline for formats, intents and tags.
 * Red is the only colour, and only for real problems (errors, failed, spam).
 */
const RED = new Set(["critical", "spam", "pbn", "error", "failed"]);
const NEUTRAL = { color: "#8a8f98", borderColor: "#2c2e33", background: "transparent" };
const PROBLEM = { color: "#ff6369", borderColor: "rgba(229, 72, 77, 0.35)", background: "rgba(229, 72, 77, 0.06)" };
function pillStyle(p: { label: string; dot?: string }) {
  const k = p.label.toLowerCase().trim();
  return RED.has(k) || p.dot === "#e5484d" ? PROBLEM : NEUTRAL;
}

export function StatusIcon({ status }: { status: LStatus }) {
  return <span className={`${s.st} ${SHAPE[status]}`} style={{ color: COLOR[status] }} />;
}

/** Grouped list, as on the product screens: group header with its status, rows with ID, status, title + hint, tinted pills and metrics. */
export function LinearList({ groups, empty = "Nothing here." }: { groups: LGroup[]; empty?: string }) {
  const visible = groups.filter((g) => g.rows.length > 0);
  if (visible.length === 0) return <div className={s.empty}>{empty}</div>;
  return (
    <>
      {visible.map((g) => (
        <div key={g.title}>
          <div className={s.gh}><StatusIcon status={g.status} />{g.title}<span className={s.n}>{g.count}</span></div>
          {g.rows.map((r) => (
            <div key={r.key} className={s.r} onClick={r.onClick} role={r.onClick ? "button" : undefined} data-kw="">
              {r.id ? <span className={s.id}>{r.id}</span> : null}
              <StatusIcon status={r.status} />
              <span className={s.tt}>{r.title}{r.hint ? <span>· {r.hint}</span> : null}</span>
              {(r.pills ?? []).map((p) => <span key={p.label} className={s.pill} style={pillStyle(p)}>{p.label}</span>)}
              {(r.metrics ?? []).map((m, i) => <span key={i} className={s.m}>{m}</span>)}
              {r.date ? <span className={s.d}>{r.date}</span> : null}
              {r.actions ? <span className={s.a} onClick={(e) => e.stopPropagation()}>{r.actions}</span> : null}
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
