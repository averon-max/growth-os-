"use client";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, RefreshCw } from "lucide-react";
import type { Landscape, LandscapeDomain, SerpHit } from "@/lib/competitors/landscape";
import { DetailDrawer, type DrawerData } from "./detail-drawer";
import u from "./ui.module.css";
import p from "./planner.module.css";

const fmt = (n: number | null) => (n === null ? "—" : n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + "K" : String(Math.round(n)));
const kdLevel = (kd: number | null) => (kd === null ? undefined : kd < 30 ? "easy" : kd < 60 ? "mid" : "hard");

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={u.statCard}>
      <div className={u.statHeader}><p className={u.statLabel}>{label}</p></div>
      <p className={u.statValue}>{value}</p>
    </div>
  );
}

function Cell({ h, ours }: { h: SerpHit | undefined; ours: string }) {
  if (h === undefined) return <td className={p.dim}>—</td>;
  const mine = h.domain === ours || h.domain.endsWith("." + ours);
  return (
    <td onClick={(e) => e.stopPropagation()}>
      <a className={p.page} href={h.url} target="_blank" rel="noreferrer" title={`${h.title ?? ""} · ~${fmt(h.clicks)} clicks/mo`} style={mine ? { color: "#7dd3a0" } : undefined}>{h.domain}{mine ? " (you)" : ""}</a>
    </td>
  );
}

export function CompetitorsLandscape({ websiteId, tracked, onTrack }: { websiteId: string; tracked: Set<string>; onTrack: (domain: string) => void }) {
  const [data, setData] = useState<Landscape | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"domains" | "serp">("domains");
  const [sel, setSel] = useState<DrawerData | null>(null);

  const load = useCallback(async (refresh: boolean) => {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/competitors/landscape?websiteId=${encodeURIComponent(websiteId)}${refresh ? "&refresh=1" : ""}`);
      const json = await res.json();
      if (res.ok === false) throw new Error(json.error ?? "Could not load the search landscape.");
      setData(json);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }, [websiteId]);
  useEffect(() => { void load(false); }, [load]);

  const openDomain = (d: LandscapeDomain) => setSel({
    title: d.domain, subtitle: `Ranks for ${d.appearances} of your keywords`,
    fields: [["Appearances", String(d.appearances)], ["In top 3", String(d.top3)], ["Avg position", String(d.avgPosition)], ["Est. clicks / mo", fmt(d.clicks)]],
    itemsTitle: "Your keywords where it ranks",
    items: d.keywords.map((k) => ({ primary: k.keyword, secondary: `#${k.position} · vol ${fmt(k.volume)}` })),
    actions: <>{tracked.has(d.domain) ? <span className={p.up}>Tracked</span> : <button className={p.ghost} onClick={() => { onTrack(d.domain); setSel(null); }}><Plus size={13} />Track competitor</button>}<a className={p.ghost} href={`https://${d.domain}`} target="_blank" rel="noreferrer">Open site</a></>,
  });

  const ks = data?.keywords ?? [];
  const ours = data?.domain ?? "";
  return (
    <>
      <div className={u.compactHeader} style={{ marginTop: 22 }}>
        <div>
          <h2 className={u.compactTitle} style={{ fontSize: 13 }}>Search landscape</h2>
          <div className={u.compactMeta}>{data ? `Live Google top 10 for ${data.analyzed} of your Keyword Planner keywords · updated ${new Date(data.generatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : "Who actually ranks for your keywords in Google"}</div>
        </div>
        <button className={p.ghost} disabled={busy} onClick={() => void load(true)}>{busy ? <Loader2 size={13} className={p.spin} /> : <RefreshCw size={13} />}Refresh</button>
      </div>
      {error ? <div className={p.err}>{error}</div> : null}
      {data?.errors.length ? <div className={p.note}>Some keywords could not be checked: {data.errors.join("; ")}</div> : null}

      <div className={u.statGrid}>
        <Stat label="Keywords checked" value={data ? String(data.analyzed) : "—"} />
        <Stat label="Competing domains" value={data ? String(data.domains.length) : "—"} />
        <Stat label="You in top 10" value={data ? String(ks.filter((k) => (k.ours === null ? false : k.ours <= 10)).length) : "—"} />
        <Stat label="Clicks / mo taken by others" value={data ? fmt(data.domains.reduce((n, d) => n + d.clicks, 0)) : "—"} />
      </div>

      <div className={p.tabs}>
        <button className={p.tab} data-on={tab === "domains" ? "true" : "false"} onClick={() => setTab("domains")}>Who wins your keywords<span className={p.tabCount}>{data?.domains.length ?? ""}</span></button>
        <button className={p.tab} data-on={tab === "serp" ? "true" : "false"} onClick={() => setTab("serp")}>SERP by keyword<span className={p.tabCount}>{data ? ks.length : ""}</span></button>
      </div>

      <div className={u.group}>
        {data === null ? <div className={p.empty}>{busy ? "Checking the live Google top 10 for your keywords… (up to a minute)" : "No data."}</div>
          : tab === "domains" ? (data.domains.length === 0 ? <div className={p.empty}>No competing domains found. Add keywords in Keyword Planner first.</div> : (
            <table className={u.table} style={{ border: 0, borderRadius: 0 }}>
              <thead><tr><th>Domain</th><th>Your keywords it ranks for</th><th>In top 3</th><th>Avg position</th><th>Est. clicks / mo</th><th>Best keywords</th><th /></tr></thead>
              <tbody>{data.domains.map((d) => (
                <tr key={d.domain} data-click="" onClick={() => openDomain(d)}>
                  <td>{d.domain}</td>
                  <td className={p.num}>{d.appearances}</td>
                  <td className={d.top3 > 0 ? p.down : p.dim}>{d.top3}</td>
                  <td className={p.num}>{d.avgPosition}</td>
                  <td className={p.num}>{fmt(d.clicks)}</td>
                  <td className={p.dim}>{d.keywords.slice(0, 3).map((k) => `${k.keyword} #${k.position}`).join(" · ")}</td>
                  <td onClick={(e) => e.stopPropagation()}>{tracked.has(d.domain) ? <span className={p.up}>Tracked</span> : <button className={p.chip} onClick={() => onTrack(d.domain)}>+ Track</button>}</td>
                </tr>
              ))}</tbody>
            </table>
          )) : (ks.length === 0 ? <div className={p.empty}>No keywords checked yet.</div> : (
            <table className={u.table} style={{ border: 0, borderRadius: 0 }}>
              <thead><tr><th>Keyword</th><th>Volume</th><th>KD</th><th>You</th><th>#1</th><th>#2</th><th>#3</th><th>#4</th><th>#5</th><th>#1 value / mo</th></tr></thead>
              <tbody>{ks.map((k) => (
                <tr key={k.keyword}>
                  <td>{k.keyword}</td>
                  <td className={p.num}>{fmt(k.volume)}</td>
                  <td>{k.kd === null ? <span className={p.dim}>—</span> : <span className={p.kd} data-l={kdLevel(k.kd)}>{k.kd}</span>}</td>
                  <td className={k.ours === null ? p.dim : k.ours <= 3 ? p.up : p.num}>{k.ours ?? "—"}</td>
                  {[1, 2, 3, 4, 5].map((pos) => <Cell key={pos} h={k.top.find((h) => h.position === pos)} ours={ours} />)}
                  <td className={p.num}>~{fmt(k.top[0]?.clicks ?? null)}</td>
                </tr>
              ))}</tbody>
            </table>
          ))}
      </div>
      {sel ? <DetailDrawer data={sel} onClose={() => setSel(null)} /> : null}
    </>
  );
}
