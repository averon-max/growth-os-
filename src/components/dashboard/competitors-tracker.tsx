"use client";
import { useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { DetailDrawer, type DrawerData, type DrawerItem } from "./detail-drawer";
import u from "./ui.module.css";
import p from "./planner.module.css";

interface Kw { keyword: string; volume: number | null; kd: number | null; their: number | null; ours: number | null; url: string | null }
interface Comp { domain: string; shared: number | null; avgPosition: number | null; etv: number | null; keywords: number | null; analyzed: boolean; gaps: Kw[]; beats: Kw[] }
interface Data { domain: string; generatedAt: string; competitors: Comp[] }
const fmt = (n: number | null) => (n === null ? "—" : n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + "K" : String(Math.round(n)));

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={u.statCard}>
      <div className={u.statHeader}><p className={u.statLabel}>{label}</p></div>
      <p className={u.statValue}>{value}</p>
    </div>
  );
}

export function CompetitorsTracker({ websiteId, domain }: { websiteId: string; domain: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState<DrawerData | null>(null);

  async function load(refresh: boolean) {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/competitors/tracker?websiteId=${encodeURIComponent(websiteId)}${refresh ? "&refresh=1" : ""}`);
      const json = await res.json();
      if (res.ok === false) throw new Error(json.error ?? "Could not load competitors.");
      setData(json);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  const item = (d: string) => (k: Kw): DrawerItem => ({
    primary: k.keyword,
    secondary: `vol ${fmt(k.volume)} · KD ${k.kd ?? "—"} · them #${k.their ?? "—"} · you ${k.ours === null ? "not ranking" : "#" + k.ours}`,
    href: k.url ? `https://${d}${k.url}` : undefined,
  });
  const open = (c: Comp) => setSel({
    title: c.domain,
    subtitle: c.analyzed ? "Organic competitor · compared with your keywords" : "Organic competitor · only the top 5 are compared in depth",
    fields: [["Shared keywords", fmt(c.shared)], ["Their keywords", fmt(c.keywords)], ["Est. traffic / mo", fmt(c.etv)], ["Avg position", c.avgPosition === null ? "—" : String(Math.round(c.avgPosition * 10) / 10)]],
    extraTitle: `They beat you · ${c.beats.length}`, extra: c.beats.map(item(c.domain)),
    itemsTitle: `Gaps: they rank top 10, you do not · ${c.gaps.length}`, items: c.gaps.map(item(c.domain)),
    actions: <a className={p.ghost} href={`https://${c.domain}`} target="_blank" rel="noreferrer">Open site</a>,
  });

  const cs = data?.competitors ?? [];
  return (
    <>
      <div className={u.compactHeader}>
        <div>
          <h1 className={u.compactTitle}>Competitors</h1>
          <div className={u.compactMeta}>{data ? `${data.domain} · ${cs.length} organic competitors · updated ${new Date(data.generatedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : `${domain} · who ranks for your keywords, where they beat you and what you are missing`}</div>
        </div>
        {data ? <button className={p.ghost} disabled={busy} onClick={() => void load(true)}>{busy ? <Loader2 size={13} className={p.spin} /> : <RefreshCw size={13} />}Refresh</button>
          : <button className={p.run} disabled={busy} onClick={() => void load(false)}>{busy ? <Loader2 size={13} className={p.spin} /> : <Sparkles size={13} />}{busy ? "Finding competitors…" : "Find competitors"}</button>}
      </div>
      {error ? <div className={p.err}>{error}</div> : null}
      <div className={u.statGrid}>
        <Stat label="Competitors" value={data ? String(cs.length) : "—"} />
        <Stat label="Most shared keywords" value={data ? fmt(Math.max(0, ...cs.map((c) => c.shared ?? 0))) : "—"} />
        <Stat label="Gap keywords (top 5)" value={data ? fmt(cs.reduce((n, c) => n + c.gaps.length, 0)) : "—"} />
        <Stat label="Where they beat you" value={data ? fmt(cs.reduce((n, c) => n + c.beats.length, 0)) : "—"} />
      </div>
      <div className={u.group} style={{ marginTop: 14 }}>
        {data === null ? <div className={p.empty}>{busy ? "Finding organic competitors and comparing keywords…" : "Click Find competitors. Uses your Keyword Planner data and DataForSEO."}</div>
          : cs.length === 0 ? <div className={p.empty}>No organic competitors found yet.</div> : (
          <table className={u.table} style={{ border: 0, borderRadius: 0 }}>
            <thead><tr><th>Domain</th><th>Shared keywords</th><th>Their keywords</th><th>Est. traffic / mo</th><th>Avg position</th><th>Gaps</th><th>Beat you</th></tr></thead>
            <tbody>{cs.map((c) => (
              <tr key={c.domain} data-click="" onClick={() => open(c)}>
                <td>{c.domain}</td>
                <td className={p.num}>{fmt(c.shared)}</td>
                <td className={p.num}>{fmt(c.keywords)}</td>
                <td className={p.num}>{fmt(c.etv)}</td>
                <td className={p.num}>{c.avgPosition === null ? "—" : Math.round(c.avgPosition * 10) / 10}</td>
                <td className={c.analyzed ? p.num : p.dim}>{c.analyzed ? c.gaps.length : "—"}</td>
                <td className={c.analyzed && c.beats.length > 0 ? p.down : p.dim}>{c.analyzed ? c.beats.length : "—"}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
      {sel ? <DetailDrawer data={sel} onClose={() => setSel(null)} /> : null}
    </>
  );
}
