"use client";
import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import u from "./ui.module.css";
import p from "./planner.module.css";

interface BotsData {
  connected: boolean; since?: string; until?: string; skippedDays?: { date: string; reason: string }[];
  totals?: { total: number; bots: number; share: number }; groups?: Record<string, number>;
  categories?: { category: string; group: string; requests: number }[];
  pages?: { path: string; total: number; bots: number; top: string | null }[];
  daily?: { date: string; total: number; bots: number }[];
}
type Tab = "categories" | "pages" | "daily";
const fmt = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + "K" : String(n));

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={u.statCard}>
      <div className={u.statHeader}><p className={u.statLabel}>{label}</p><span className={u.statAccent} style={{ background: color, color }} /></div>
      <p className={u.statValue}>{value}</p>
    </div>
  );
}

export function BotsClient({ websiteId, domain }: { websiteId: string; domain: string }) {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<BotsData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("categories");

  const load = useCallback(async () => {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/bots?websiteId=${encodeURIComponent(websiteId)}&days=${days}`);
      const json = await res.json();
      if (res.ok === false) throw new Error(json.error ?? "Could not load bot traffic.");
      setData(json);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }, [websiteId, days]);
  useEffect(() => { void load(); }, [load]);

  const g = data?.groups ?? {};
  const t = data?.totals;
  const maxCat = Math.max(1, ...(data?.categories ?? []).map((c) => c.requests));
  const maxDay = Math.max(1, ...(data?.daily ?? []).map((d) => d.total));

  return (
    <>
      <div className={u.compactHeader}>
        <div>
          <h1 className={u.compactTitle}>Bots & crawlers</h1>
          <div className={u.compactMeta}>{data?.since ? `${domain} · ${data.since} → ${data.until} · verified by Cloudflare` : `${domain} · search engines, AI crawlers and SEO bots verified by Cloudflare`}</div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {[1, 3, 7, 14].map((d) => <button key={d} className={p.chip} data-on={days === d ? "true" : "false"} onClick={() => setDays(d)}>{d}d</button>)}
          <button className={p.ghost} disabled={busy} onClick={() => void load()}>{busy ? <Loader2 size={13} className={p.spin} /> : <RefreshCw size={13} />}Refresh</button>
        </div>
      </div>

      {error ? <div className={p.err}>{error}</div> : null}
      {data && data.connected === false ? (
        <div className={u.group}><div className={p.empty}>Cloudflare is not connected for this website. Connect it in Settings → Integrations to see real bot traffic.</div></div>
      ) : (
        <>
          {data?.skippedDays && data.skippedDays.length > 0 ? <div className={p.note}>{data.skippedDays.length} day(s) unavailable on this Cloudflare plan: {data.skippedDays.map((d) => d.date).join(", ")}</div> : null}
          <div className={`${u.statGrid} ${p.stat6}`}>
            <Stat label="Requests" value={t ? fmt(t.total) : "—"} color="#93c5fd" />
            <Stat label="Verified bot requests" value={t ? fmt(t.bots) : "—"} color="#3b82f6" />
            <Stat label="Bot share" value={t ? `${t.share}%` : "—"} color="#2599a8" />
            <Stat label="Search engines" value={data ? fmt(g["Search engines"] ?? 0) : "—"} color="#4daf6d" />
            <Stat label="AI crawlers" value={data ? fmt(g["AI crawlers & assistants"] ?? 0) : "—"} color="#c9a644" />
            <Stat label="SEO tools" value={data ? fmt(g["SEO tools"] ?? 0) : "—"} color="#d46670" />
          </div>
          <div className={p.tabs}>
            {([["categories", "Categories", data?.categories?.length], ["pages", "Pages", data?.pages?.length], ["daily", "Daily", data?.daily?.length]] as [Tab, string, number | undefined][]).map(([id, label, n]) => (
              <button key={id} className={p.tab} data-on={tab === id ? "true" : "false"} onClick={() => setTab(id)}>{label}{n === undefined ? null : <span className={p.tabCount}>{n}</span>}</button>
            ))}
          </div>
          <div className={u.group}>
            {data === null ? <div className={p.empty}>{busy ? "Loading Cloudflare traffic…" : "No data."}</div>
              : tab === "categories" ? (
                (data.categories ?? []).length === 0 ? <div className={p.empty}>No verified bot traffic in this period.</div> : (
                  <table className={u.table} style={{ border: 0, borderRadius: 0 }}>
                    <thead><tr><th>Category</th><th>Group</th><th>Requests</th><th /><th>Share of bots</th></tr></thead>
                    <tbody>{(data.categories ?? []).map((c) => (
                      <tr key={c.category}><td>{c.category}</td><td className={p.dim}>{c.group}</td><td className={p.num}>{fmt(c.requests)}</td>
                        <td><div className={p.bar}><div className={p.barFill} style={{ width: `${(c.requests / maxCat) * 100}%` }} /></div></td>
                        <td className={p.num}>{t && t.bots ? `${Math.round((c.requests / t.bots) * 1000) / 10}%` : "—"}</td></tr>
                    ))}</tbody>
                  </table>
                )
              ) : tab === "pages" ? (
                (data.pages ?? []).length === 0 ? <div className={p.empty}>No pages with verified bot traffic.</div> : (
                  <table className={u.table} style={{ border: 0, borderRadius: 0 }}>
                    <thead><tr><th>Page</th><th>Bot requests</th><th>All requests</th><th>Bot share</th><th>Top category</th></tr></thead>
                    <tbody>{(data.pages ?? []).map((x) => (
                      <tr key={x.path}><td>{x.path}</td><td className={p.num}>{fmt(x.bots)}</td><td className={p.num}>{fmt(x.total)}</td>
                        <td className={p.num}>{x.total ? `${Math.round((x.bots / x.total) * 100)}%` : "—"}</td><td className={p.dim}>{x.top ?? "—"}</td></tr>
                    ))}</tbody>
                  </table>
                )
              ) : (
                <table className={u.table} style={{ border: 0, borderRadius: 0 }}>
                  <thead><tr><th>Date</th><th>All requests</th><th /><th>Bot requests</th><th>Bot share</th></tr></thead>
                  <tbody>{(data.daily ?? []).map((d) => (
                    <tr key={d.date}><td>{d.date}</td><td className={p.num}>{fmt(d.total)}</td>
                      <td><div className={p.bar}><div className={p.barFill} style={{ width: `${(d.total / maxDay) * 100}%` }} /></div></td>
                      <td className={p.num}>{fmt(d.bots)}</td><td className={p.num}>{d.total ? `${Math.round((d.bots / d.total) * 100)}%` : "—"}</td></tr>
                  ))}</tbody>
                </table>
              )}
          </div>
        </>
      )}
    </>
  );
}
