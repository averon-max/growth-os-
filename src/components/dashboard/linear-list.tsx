"use client";
import type { ReactNode } from "react";
import s from "./linear-list.module.css";

export type LStatus = "red" | "green" | "yellow" | "gray" | "blue";
export interface LRow { key: string; id?: string; status: LStatus; title: string; hint?: string; pills?: { label: string; dot?: string }[]; metrics?: string[]; date?: string; onClick?: () => void; actions?: ReactNode }
export interface LGroup { title: string; count: number; status: LStatus; rows: LRow[] }

const COLOR: Record<LStatus, string> = { red: "#e5484d", green: "#30a46c", yellow: "#ffb224", gray: "#6b6b6b", blue: "#0090ff" };
const SHAPE: Record<LStatus, string> = { red: s.half, green: s.full, yellow: s.half, gray: "", blue: s.full };

/*
 * Pill tints, by meaning (same as the product screens on the website): article formats and status words get a soft
 * tint, problems are red, everything else (intent, link attributes, tags) stays neutral grey. No random colours.
 */
type Tint = "green" | "orange" | "purple" | "blue" | "yellow" | "red" | "neutral";
const TINT: Record<string, Tint> = {
  guide: "green", "how-to": "orange", "step-by-step": "orange", comparison: "purple", review: "purple", listicle: "blue", list: "blue", checklist: "blue",
  "quick win": "yellow", "quick wins": "yellow", tracked: "yellow", rising: "blue", new: "blue", published: "green", approved: "green", clean: "green",
  "high impact": "orange", "medium impact": "blue", critical: "red", spam: "red", pbn: "red", error: "red", failed: "red", lost: "neutral",
};
const TINT_STYLE: Record<Tint, { color: string; borderColor: string; background: string }> = {
  green: { color: "#4cc38a", borderColor: "rgba(48,164,108,.35)", background: "rgba(48,164,108,.06)" },
  orange: { color: "#ff8b3e", borderColor: "rgba(247,107,21,.4)", background: "rgba(247,107,21,.06)" },
  purple: { color: "#b381e6", borderColor: "rgba(142,78,198,.4)", background: "rgba(142,78,198,.07)" },
  blue: { color: "#52a9ff", borderColor: "rgba(82,169,255,.35)", background: "rgba(82,169,255,.06)" },
  yellow: { color: "#ffb224", borderColor: "rgba(255,178,36,.35)", background: "rgba(255,178,36,.06)" },
  red: { color: "#ff6369", borderColor: "rgba(229,72,77,.35)", background: "rgba(229,72,77,.06)" },
  neutral: { color: "#a1a1a1", borderColor: "#2e2e2e", background: "transparent" },
};
function pillStyle(p: { label: string; dot?: string }) {
  const k = p.label.toLowerCase().trim();
  const tint = TINT[k] ?? (p.dot === "#e5484d" ? "red" : "neutral");
  return TINT_STYLE[tint];
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
