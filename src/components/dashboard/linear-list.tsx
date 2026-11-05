"use client";
import type { ReactNode } from "react";
import s from "./linear-list.module.css";

export type LStatus = "red" | "green" | "yellow" | "gray" | "blue";
export interface LRow { key: string; id?: string; status: LStatus; title: string; hint?: string; pills?: { label: string; dot?: string }[]; metrics?: string[]; date?: string; onClick?: () => void; actions?: ReactNode }
export interface LGroup { title: string; count: number; status: LStatus; rows: LRow[] }

const COLOR: Record<LStatus, string> = { red: "#eb5757", green: "#4cb782", yellow: "#f2c94c", gray: "#62666d", blue: "#3b82f6" };
const SHAPE: Record<LStatus, string> = { red: s.half, green: s.full, yellow: s.half, gray: "", blue: s.full };

const TONE: Record<string, string> = {
  informational: "#60a5fa", commercial: "#f2c94c", transactional: "#4cb782", navigational: "#f2994a",
  dofollow: "#4cb782", nofollow: "#8a8f98", clean: "#4cb782", spam: "#eb5757", pbn: "#eb5757",
  new: "#f2c94c", lost: "#8a8f98", tracked: "#f2c94c",
};
const PALETTE = ["#60a5fa", "#f2c94c", "#4cb782", "#f2994a", "#d0d6e0"];
function pillTone(p: { label: string; dot?: string }): string {
  if (p.dot) return p.dot;
  const k = p.label.toLowerCase().trim();
  if (TONE[k]) return TONE[k];
  let h = 0;
  for (const ch of k) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
function pillStyle(p: { label: string; dot?: string }) {
  const c = pillTone(p);
  return /^#[0-9a-f]{6}$/i.test(c) ? { color: c, borderColor: c + "40", background: c + "14" } : { color: c, borderColor: c };
}

export function StatusIcon({ status }: { status: LStatus }) {
  return <span className={`${s.st} ${SHAPE[status]}`} style={{ color: COLOR[status] }} />;
}

/** Linear-style grouped list: group headers, status icon, mono ID, title + hint, pills and metrics on the right. */
export function LinearList({ groups, empty = "Nothing here." }: { groups: LGroup[]; empty?: string }) {
  const visible = groups.filter((g) => g.rows.length > 0);
  if (visible.length === 0) return <div className={s.empty}>{empty}</div>;
  return (
    <>
      {visible.map((g) => (
        <div key={g.title}>
          <div className={s.gh}><StatusIcon status={g.status} />{g.title}<span className={s.n}>{g.count}</span></div>
          {g.rows.map((r) => (
            <div key={r.key} className={s.r} onClick={r.onClick} role={r.onClick ? "button" : undefined}>
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
