"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, RefreshCw, Sparkles, X } from "lucide-react";
import type { CompKw, CompStats } from "@/lib/competitors/tracker";
import u from "./ui.module.css";
import p from "./planner.module.css";

type Tracked = CompStats & { id: string; name: string | null };
interface Suggest { domain: string; shared: number | null; avgPosition: number | null; etv: number | null; keywords: number | null }
const fmt = (n: number | null) => (n === null ? "—" : n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + "K" : String(Math.round(n)));
const money = (n: number | null) => (n === null ? "—" : "$" + n.toFixed(2));
const kdLevel = (kd: number | null) => (kd === null ? undefined : kd < 30 ? "easy" : kd < 60 ? "mid" : "hard");
const short = (url: string) => { try { return new URL(url).pathname; } catch { return url; } };
const PAGE = 50;

const CHIPS: { id: string; label: string; test: (k: CompKw) => boolean }[] = [
  { id: "gaps", label: "Gaps", test: (k) => (k.their === null ? false : k.their <= 10) && (k.ours === null || k.ours > 20) },
  { id: "beats", label: "They beat you", test: (k) => (k.their === null || k.ours === null ? false : k.their < k.ours) },
  { id: "wins", label: "You beat them", test: (k) => (k.their === null || k.ours === null ? false : k.ours < k.their) },
  { id: "top10", label: "Their top 10", test: (k) => (k.their === null ? false : k.their <= 10) },
  { id: "kd", label: "KD < 30", test: (k) => (k.kd === null ? false : k.kd < 30) },
  { id: "vol", label: "Vol > 1K", test: (k) => (k.volume ?? 0) > 1000 },
];

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={u.statCard}>
      <div className={u.statHeader}><p className={u.statLabel}>{label}</p></div>
      <p className={u.statValue}>{value}</p>
    </div>
  );
}

function Breakdown({ c }: { c: Tracked }) {
  const [chips, setChips] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const rows = useMemo(() => {
    const active = CHIPS.filter((x) => chips.includes(x.id));
    const ql = q.trim().toLowerCase();
    return c.keywords.filter((k) => (ql === "" || k.keyword.includes(ql)) && active.every((x) => x.test(k))).sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0));
  }, [c, chips, q]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const cur = Math.min(page, pages - 1);
  return (
    <div className={u.group} style={{ marginTop: 14 }}>
      <div className={p.toolbar}>
        <strong style={{ color: "#e7e8ea", fontSize: 12, fontWeight: 560, marginRight: 8 }}>{c.domain}</strong>
        {CHIPS.map((x) => <button key={x.id} className={p.chip} data-on={chips.includes(x.id) ? "true" : "false"} onClick={() => { setChips(chips.includes(x.id) ? chips.filter((y) => y !== x.id) : [...chips, x.id]); setPage(0); }}>{x.label}</button>)}
        <input className={p.search} value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} placeholder="Filter keywords…" />
        <span className={p.count}>{rows.length}</span>
      </div>
      {c.error ? <div className={p.empty}>Could not load {c.domain}: {c.error}</div> : rows.length === 0 ? <div className={p.empty}>No keywords match.</div> : (
        <>
          <table className={u.table} style={{ border: 0, borderRadius: 0 }}>
            <thead><tr><th>Keyword</th><th>Volume</th><th>KD</th><th>CPC</th><th>Their position</th><th>Your position</th><th>Difference</th><th>Their page</th></tr></thead>
            <tbody>{rows.slice(cur * PAGE, cur * PAGE + PAGE).map((k) => {
              const diff = k.their === null || k.ours === null ? null : k.ours - k.their;
              return (
                <tr key={k.keyword}>
                  <td>{k.keyword}</td>
                  <td className={p.num}>{fmt(k.volume)}</td>
                  <td>{k.kd === null ? <span className={p.dim}>—</span> : <span className={p.kd} data-l={kdLevel(k.kd)}>{k.kd}</span>}</td>
                  <td className={p.num}>{money(k.cpc)}</td>
                  <td className={p.num}>{k.their ?? "—"}</td>
                  <td className={k.ours === null ? p.dim : p.num}>{k.ours ?? "Not ranking"}</td>
                  <td className={diff === null ? p.dim : diff > 0 ? p.down : diff < 0 ? p.up : p.num}>{diff === null ? "—" : diff > 0 ? `−${diff}` : diff < 0 ? `+${-diff}` : "0"}</td>
                  <td>{k.page ? <a className={p.page} href={k.page} target="_blank" rel="noreferrer">{short(k.page)}</a> : <span className={p.dim}>—</span>}</td>
                </tr>
              );
            })}</tbody>
          </table>
          {pages > 1 ? <div className={p.pager}><button disabled={cur === 0} onClick={() => setPage(cur - 1)}>← Prev</button><span>{cur + 1} / {pages} · {rows.length} keywords</span><button disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>Next →</button></div> : null}
        </>
      )}
    </div>
  );
}

export function CompetitorsTracker({ websiteId, domain }: { websiteId: string; domain: string }) {
  const [tracked, setTracked] = useState<Tracked[] | null>(null);
  const [suggest, setSuggest] = useState<Suggest[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [finding, setFinding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/competitors/tracked?websiteId=${encodeURIComponent(websiteId)}`);
      const json = await res.json();
      if (res.ok === false) throw new Error(json.error ?? "Could not load competitors.");
      setTracked(json.tracked);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }, [websiteId]);
  useEffect(() => { void load(); }, [load]);

  async function add(d: string) {
    setError(null);
    const res = await fetch("/api/competitors/tracked", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ websiteId, domain: d }) });
    const json = await res.json().catch(() => ({}));
    if (res.ok === false) { setError(json.error ?? "Could not add competitor."); return; }
    setInput("");
    setOpen(json.domain ?? null);
    await load();
  }
  async function remove(d: string) {
    await fetch("/api/competitors/tracked", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ websiteId, domain: d }) });
    if (open === d) setOpen(null);
    await load();
  }
  async function find() {
    setFinding(true); setError(null);
    try {
      const res = await fetch(`/api/competitors/tracker?websiteId=${encodeURIComponent(websiteId)}`);
      const json = await res.json();
      if (res.ok === false) throw new Error(json.error ?? "Could not find competitors.");
      setSuggest(json.competitors);
    } catch (e) { setError((e as Error).message); } finally { setFinding(false); }
  }

  const list = tracked ?? [];
  const isTracked = new Set(list.map((t) => t.domain));
  const current = list.find((t) => t.domain === open) ?? null;

  return (
    <>
      <div className={u.compactHeader}>
        <div>
          <h1 className={u.compactTitle}>Competitors</h1>
          <div className={u.compactMeta}>{domain} · tracked competitors compared with your keywords</div>
        </div>
        <form style={{ display: "flex", gap: 8 }} onSubmit={(e) => { e.preventDefault(); if (input.trim()) void add(input); }}>
          <input className={p.search} style={{ marginLeft: 0 }} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Add competitor, e.g. example.com" />
          <button className={p.run} disabled={input.trim() === ""}><Plus size={13} />Add</button>
          <button type="button" className={p.ghost} disabled={busy} onClick={() => void load()}>{busy ? <Loader2 size={13} className={p.spin} /> : <RefreshCw size={13} />}</button>
        </form>
      </div>
      {error ? <div className={p.err}>{error}</div> : null}

      <div className={`${u.statGrid} ${p.stat6}`}>
        <Stat label="Tracked" value={tracked ? String(list.length) : "—"} />
        <Stat label="Their keywords" value={tracked ? fmt(list.reduce((n, c) => n + (c.overview.keywords ?? 0), 0)) : "—"} />
        <Stat label="Their traffic / mo" value={tracked ? fmt(list.reduce((n, c) => n + (c.overview.etv ?? 0), 0)) : "—"} />
        <Stat label="Shared keywords" value={tracked ? fmt(list.reduce((n, c) => n + c.shared, 0)) : "—"} />
        <Stat label="Gap keywords" value={tracked ? fmt(list.reduce((n, c) => n + c.gaps, 0)) : "—"} />
        <Stat label="They beat you" value={tracked ? fmt(list.reduce((n, c) => n + c.beats, 0)) : "—"} />
      </div>

      <div className={u.group} style={{ marginTop: 14 }}>
        {tracked === null ? <div className={p.empty}>{busy ? "Loading tracked competitors…" : "No data."}</div>
          : list.length === 0 ? <div className={p.empty}>No tracked competitors yet. Add a domain above or use Suggested competitors below.</div> : (
          <table className={u.table} style={{ border: 0, borderRadius: 0 }}>
            <thead><tr><th>Domain</th><th>Keywords</th><th>Traffic / mo</th><th>Top 3</th><th>Top 10</th><th>Shared</th><th>Gaps</th><th>Beat you</th><th>You win</th><th /></tr></thead>
            <tbody>{list.map((c) => (
              <tr key={c.domain} data-click="" onClick={() => setOpen(open === c.domain ? null : c.domain)} style={open === c.domain ? { background: "rgba(59,130,246,.08)" } : undefined}>
                <td>{c.domain}{c.error ? <span className={p.down}> · error</span> : null}</td>
                <td className={p.num}>{fmt(c.overview.keywords)}</td>
                <td className={p.num}>{fmt(c.overview.etv)}</td>
                <td className={p.num}>{fmt(c.overview.top3)}</td>
                <td className={p.num}>{fmt(c.overview.top10)}</td>
                <td className={p.num}>{c.shared}</td>
                <td className={p.num}>{c.gaps}</td>
                <td className={c.beats > 0 ? p.down : p.dim}>{c.beats}</td>
                <td className={c.wins > 0 ? p.up : p.dim}>{c.wins}</td>
                <td onClick={(e) => e.stopPropagation()}><button className={p.linkBtn} aria-label={`Stop tracking ${c.domain}`} onClick={() => void remove(c.domain)}><X size={13} /></button></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      {current ? <Breakdown key={current.domain} c={current} /> : null}

      <div className={u.compactHeader} style={{ marginTop: 22 }}>
        <div>
          <h2 className={u.compactTitle} style={{ fontSize: 13 }}>Suggested competitors</h2>
          <div className={u.compactMeta}>Domains that rank for the same keywords in Google</div>
        </div>
        <button className={p.ghost} disabled={finding} onClick={() => void find()}>{finding ? <Loader2 size={13} className={p.spin} /> : <Sparkles size={13} />}{suggest ? "Refresh" : "Find competitors"}</button>
      </div>
      <div className={u.group}>
        {suggest === null ? <div className={p.empty}>{finding ? "Finding organic competitors…" : "Click Find competitors to discover who ranks for your keywords."}</div>
          : suggest.length === 0 ? <div className={p.empty}>No organic competitors found.</div> : (
          <table className={u.table} style={{ border: 0, borderRadius: 0 }}>
            <thead><tr><th>Domain</th><th>Shared keywords</th><th>Their keywords</th><th>Traffic / mo</th><th>Avg position</th><th /></tr></thead>
            <tbody>{suggest.map((s) => (
              <tr key={s.domain}>
                <td>{s.domain}</td>
                <td className={p.num}>{fmt(s.shared)}</td>
                <td className={p.num}>{fmt(s.keywords)}</td>
                <td className={p.num}>{fmt(s.etv)}</td>
                <td className={p.num}>{s.avgPosition === null ? "—" : Math.round(s.avgPosition * 10) / 10}</td>
                <td>{isTracked.has(s.domain) ? <span className={p.up}>Tracked</span> : <button className={p.chip} onClick={() => void add(s.domain)}><Plus size={12} style={{ verticalAlign: -2 }} /> Track</button>}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </>
  );
}
