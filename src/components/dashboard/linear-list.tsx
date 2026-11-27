"use client";
import type { ReactNode } from "react";
import s from "./linear-list.module.css";

export type LStatus = "red" | "green" | "yellow" | "gray" | "blue";
export interface LRow { key: string; id?: string; status: LStatus; title: string; hint?: string; pills?: { label: string; dot?: string }[]; metrics?: string[]; date?: string; onClick?: () => void; actions?: ReactNode }
export interface LGroup { title: string; count: number; status: LStatus; rows: LRow[] }

const COLOR: Record<LStatus, string> = { red: "#e5484d", green: "#30a46c", yellow: "#ffb224", gray: "#6b6b6b", blue: "#0090ff" };
const SHAPE: Record<LStatus, string> = { red: s.half, green: s.full, yellow: s.half, gray: "", blue: s.full };

const TONE: Record<string, string> = {
  informational: "#0090ff", commercial: "#ffb224", transactional: "#30a46c", navigational: "#f76b15",
  dofollow: "#30a46c", nofollow: "#8f8f8f", clean: "#30a46c", spam: "#e5484d", pbn: "#e5484d",
  new: "#ffb224", lost: "#8f8f8f", tracked: "#ffb224",
};
const PALETTE = ["#0090ff", "#ffb224", "#30a46c", "#f76b15", "#ededed"];
function pillTone(p: { label: string; dot?: string }): string {
  if (p.dot) return p.dot;
  const k = p.label.toLowerCase().trim();
  if (TONE[k]) return TONE[k];
  let h = 0;
  for (const ch of k) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
/** Pills are neutral (Vercel tables keep colour for what needs attention); only red marks a problem. */
function pillStyle(p: { label: string; dot?: string }) {
  const c = pillTone(p);
  const bad = c === "#e5484d" || c === "#e5484d";
  return bad ? { color: "#e5484d", borderColor: "#e5484d40", background: "#e5484d14" } : { color: "#a1a1a1", borderColor: "#2e2e2e", background: "transparent" };
}

export function StatusIcon({ status }: { status: LStatus }) {
  return <span className={`${s.st} ${SHAPE[status]}`} style={{ color: COLOR[status] }} />;
}

/** Grouped list in the Vercel table style: group headers, title + hint, neutral pills and metrics on the right. */
export function LinearList({ groups, empty = "Nothing here." }: { groups: LGroup[]; empty?: string }) {
  const visible = groups.filter((g) => g.rows.length > 0);
  if (visible.length === 0) return <div className={s.empty}>{empty}</div>;
  return (
    <>
      {visible.map((g) => (
        <div key={g.title}>
          <div className={s.gh}>{g.title}<span className={s.n}>{g.count}</span></div>
          {g.rows.map((r) => (
            <div key={r.key} className={s.r} onClick={r.onClick} role={r.onClick ? "button" : undefined} data-kw="">
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
