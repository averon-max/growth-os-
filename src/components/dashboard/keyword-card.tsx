"use client";
import { useEffect, useState } from "react";
import { Check, ExternalLink, Plus, X } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { WriterButton } from "./writer-button";
import s from "./keyword-card.module.css";

interface Overview {
  monthlySearches: { year: number; month: number; searchVolume: number }[];
  trend: { yearly: number | null; quarterly: number | null; monthly: number | null } | null;
  globalVolumes: { code: string; label: string; flag: string; volume: number }[];
  metrics: { volume: number | null; kd: number | null; cpc: number | null; competitionIndex: number | null; intent: string | null } | null;
}
interface SerpItem { position: number; domain: string; url: string; title: string | null; ours: boolean; clicks: number }
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmt = (n: number | null | undefined) => (n === null || n === undefined ? "—" : n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + "K" : String(Math.round(n)));
const pct = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${n > 0 ? "+" : ""}${Math.abs(n) >= 1000 ? (n / 1000).toFixed(1) + "K" : n}%`);
const tone = (n: number | null | undefined) => (n === null || n === undefined ? undefined : n > 0 ? s.good : n < 0 ? s.bad : undefined);

/** One keyword card used everywhere: metrics, volume by country, 12-month trend, live Google top 10, actions. */
export function KeywordCard({ keyword, workspaceId, websiteId, tracked, onChanged, onClose }: {
  keyword: string; workspaceId: string; websiteId: string; tracked?: boolean; onChanged?: () => void; onClose: () => void;
}) {
  const [ov, setOv] = useState<Overview | null>(null);
  const [serp, setSerp] = useState<SerpItem[] | null>(null);
  const [serpError, setSerpError] = useState<string | null>(null);
  const [isTracked, setTracked] = useState(tracked === true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let off = false;
    setOv(null); setSerp(null); setSerpError(null);
    const q = new URLSearchParams({ workspaceId, keyword, market: "US", language: "English" });
    fetch(`/api/keywords/overview?${q}`).then((r) => r.json()).then((d: Overview) => {
      if (off) return;
      setOv(d);
      const vol = d.metrics?.volume ?? 0;
      return fetch(`/api/planner/serp?websiteId=${encodeURIComponent(websiteId)}&keyword=${encodeURIComponent(keyword)}&volume=${vol}`)
        .then((r) => r.json())
        .then((x: { items?: SerpItem[]; error?: string }) => { if (off) return; setSerp(x.items ?? []); setSerpError(x.error ?? null); });
    }).catch(() => { if (off === false) { setSerp([]); setSerpError("Could not load data."); } });
    return () => { off = true; };
  }, [keyword, workspaceId, websiteId]);

  async function toggleTrack() {
    setBusy(true);
    const res = await fetch("/api/planner/keywords", {
      method: isTracked ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isTracked ? { websiteId, keyword } : { websiteId, keywords: [keyword] }),
    });
    setBusy(false);
    if (res.ok) { setTracked(isTracked === false); onChanged?.(); }
  }

  const m = ov?.metrics ?? null;
  const kd = m?.kd ?? null;
  const kdCls = kd === null ? undefined : kd < 30 ? s.good : kd < 60 ? s.mid : s.bad;
  const countries = [...(ov?.globalVolumes ?? [])].sort((a, b) => b.volume - a.volume);
  const maxC = Math.max(1, ...countries.map((c) => c.volume));
  const chart = (ov?.monthlySearches ?? []).slice(-12).map((x) => ({ label: `${MONTHS[x.month - 1]} ${String(x.year).slice(2)}`, volume: x.searchVolume }));

  return (
    <>
      <div className={s.overlay} onClick={onClose} />
      <aside className={s.panel} role="dialog" aria-label={keyword}>
        <div className={s.head}>
          <div style={{ minWidth: 0 }}>
            <h2 className={s.title}>{keyword}</h2>
            <div className={s.sub}>Keyword · United States{m?.intent ? ` · ${m.intent}` : ""}</div>
          </div>
          <button className={s.close} onClick={onClose} aria-label="Close"><X size={15} /></button>
        </div>
        <div className={s.body}>
          <div className={s.label}>Properties</div>
          {ov === null ? <div className={s.muted}>Loading…</div> : (
            <div className={s.props}>
              <div className={s.prop}><span>Volume / mo</span><span>{fmt(m?.volume)}</span></div>
              <div className={s.prop}><span>Difficulty</span><span className={kdCls}>{kd ?? "—"}{kd === null ? "" : kd < 30 ? " · easy" : kd < 60 ? " · moderate" : " · hard"}</span></div>
              <div className={s.prop}><span>CPC</span><span>{m?.cpc ? `$${m.cpc.toFixed(2)}` : "—"}</span></div>
              <div className={s.prop}><span>Competition</span><span>{m?.competitionIndex === null || m?.competitionIndex === undefined ? "—" : (m.competitionIndex / 100).toFixed(2)}</span></div>
              <div className={s.prop}><span>Trend YoY</span><span className={tone(ov.trend?.yearly)}>{pct(ov.trend?.yearly)}</span></div>
              <div className={s.prop}><span>Trend QoQ</span><span className={tone(ov.trend?.quarterly)}>{pct(ov.trend?.quarterly)}</span></div>
            </div>
          )}

          {countries.length > 0 ? (
            <>
              <div className={s.label}>Volume by country</div>
              {countries.map((c) => (
                <div key={c.code} className={s.country}>
                  <span>{c.flag}</span><span>{c.label}</span>
                  <div className={s.bar}><div className={s.fill} style={{ width: `${Math.round((c.volume / maxC) * 100)}%` }} /></div>
                  <span>{fmt(c.volume)}</span>
                </div>
              ))}
            </>
          ) : null}

          {chart.length > 0 ? (
            <>
              <div className={s.label}>Monthly volume</div>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={chart} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#6b7079" }} axisLine={false} tickLine={false} interval={1} />
                  <Tooltip cursor={{ fill: "rgba(255,255,255,.03)" }} contentStyle={{ background: "#141618", border: "1px solid #2a2d31", borderRadius: 6, fontSize: 11 }} formatter={(v) => [typeof v === "number" ? v.toLocaleString() : v, "searches"]} />
                  <Bar dataKey="volume" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </>
          ) : null}

          <div className={s.label}>Top 10 Google · est. clicks / mo</div>
          {serp === null ? <div className={s.muted}>Loading live results…</div> : serpError ? <div className={s.muted}>{serpError}</div> : serp.length === 0 ? <div className={s.muted}>No results.</div> : serp.map((h) => (
            <a key={h.url + h.position} className={s.serp} href={h.url} target="_blank" rel="noreferrer">
              <span className={s.pos}>#{h.position}</span>
              <span style={{ minWidth: 0 }}>
                <span className={`${s.dom} ${h.ours ? s.you : ""}`}>{h.domain}{h.ours ? " (you)" : ""}{h.position <= 3 ? <span className={s.tag}>Top 3</span> : h.position <= 5 ? <span className={s.tag}>Top 5</span> : null}</span>
                <span className={s.ttl}>{h.title ?? h.url}</span>
              </span>
              <span className={s.val}>~{fmt(h.clicks)}</span>
            </a>
          ))}
        </div>
        <div className={s.actions}>
          <button className={`${s.btn} ${isTracked ? s.btnOn : ""}`} disabled={busy} onClick={() => void toggleTrack()}>{isTracked ? <Check size={13} /> : <Plus size={13} />}{isTracked ? "Tracked" : "Track"}</button>
          <WriterButton websiteId={websiteId} initialKeyword={keyword} label="Write article" compact />
          <a className={s.btn} href={`https://www.google.com/search?q=${encodeURIComponent(keyword)}`} target="_blank" rel="noreferrer"><ExternalLink size={13} />Google</a>
        </div>
      </aside>
    </>
  );
}
