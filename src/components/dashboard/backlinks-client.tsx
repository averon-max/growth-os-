"use client";
import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import type { BacklinksReport } from "@/lib/backlinks/domain";
import u from "./ui.module.css";
import p from "./planner.module.css";

type Tab = "domains" | "links" | "anchors";
const fmt = (n: number | null) => (n === null ? "—" : n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + "K" : String(n));
const day = (s: string | null) => (s ? s.slice(0, 10) : "—");
const short = (url: string) => { try { const x = new URL(url); return x.hostname.replace(/^www\./, "") + x.pathname; } catch { return url; } };

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={u.statCard}>
      <div className={u.statHeader}><p className={u.statLabel}>{label}</p></div>
      <p className={u.statValue}>{value}</p>
    </div>
  );
}

export function BacklinksClient({ websiteId, domain }: { websiteId: string; domain: string }) {
  const [data, setData] = useState<BacklinksReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("domains");
  const [q, setQ] = useState("");
  const [only, setOnly] = useState<"all" | "dofollow" | "new" | "lost">("all");

  const load = useCallback(async (refresh: boolean) => {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/backlinks?websiteId=${encodeURIComponent(websiteId)}${refresh ? "&refresh=1" : ""}`);
      const json = await res.json();
      if (res.ok === false) throw new Error(json.error ?? "Could not load backlinks.");
      setData(json);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }, [websiteId]);
  useEffect(() => { void load(false); }, [load]);

  const s = data?.summary;
  const ql = q.trim().toLowerCase();
  const links = (data?.links ?? []).filter((l) => (only === "all" || (only === "dofollow" && l.dofollow) || (only === "new" && l.isNew) || (only === "lost" && l.isLost)) && (ql === "" || l.from.toLowerCase().includes(ql) || (l.anchor ?? "").toLowerCase().includes(ql)));
  const domains = (data?.domains ?? []).filter((d) => ql === "" || d.domain.includes(ql));
  const anchors = (data?.anchors ?? []).filter((a) => ql === "" || a.anchor.toLowerCase().includes(ql));
  const newCount = (data?.links ?? []).filter((l) => l.isNew).length;
  const lostCount = (data?.links ?? []).filter((l) => l.isLost).length;

  return (
    <>
      <div className={u.compactHeader}>
        <div>
          <h1 className={u.compactTitle}>Backlinks</h1>
          <div className={u.compactMeta}>{data ? `${data.domain} · updated ${new Date(data.generatedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : `${domain} · referring domains, links and anchors from DataForSEO`}</div>
        </div>
        <button className={p.ghost} disabled={busy} onClick={() => void load(true)}>{busy ? <Loader2 size={13} className={p.spin} /> : <RefreshCw size={13} />}Refresh</button>
      </div>

      {error ? <div className={p.err}>{error}</div> : null}

      <div className={`${u.statGrid} ${p.stat6}`}>
        <Stat label="Domain rank" value={fmt(s?.rank ?? null)} />
        <Stat label="Backlinks" value={fmt(s?.backlinks ?? null)} />
        <Stat label="Referring domains" value={fmt(s?.referringDomains ?? null)} />
        <Stat label="Dofollow" value={s?.dofollowShare === null || s === undefined ? "—" : `${s.dofollowShare}%`} />
        <Stat label="New (sample)" value={data ? String(newCount) : "—"} />
        <Stat label="Lost (sample)" value={data ? String(lostCount) : "—"} />
      </div>

      <div className={p.tabs}>
        {([["domains", "Referring domains", data?.domains.length], ["links", "Backlinks", data?.links.length], ["anchors", "Anchors", data?.anchors.length]] as [Tab, string, number | undefined][]).map(([id, label, n]) => (
          <button key={id} className={p.tab} data-on={tab === id ? "true" : "false"} onClick={() => setTab(id)}>{label}{n === undefined ? null : <span className={p.tabCount}>{n}</span>}</button>
        ))}
      </div>

      <div className={u.group}>
        <div className={p.toolbar}>
          {tab === "links" ? (["all", "dofollow", "new", "lost"] as const).map((o) => (
            <button key={o} className={p.chip} data-on={only === o ? "true" : "false"} onClick={() => setOnly(o)}>{o === "all" ? "All" : o === "dofollow" ? "Dofollow" : o === "new" ? "New" : "Lost"}</button>
          )) : null}
          <input className={p.search} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter…" />
        </div>
        {data === null ? <div className={p.empty}>{busy ? "Loading backlinks from DataForSEO…" : "No data."}</div>
          : tab === "domains" ? (domains.length === 0 ? <div className={p.empty}>No referring domains found.</div> : (
            <table className={u.table} style={{ border: 0, borderRadius: 0 }}>
              <thead><tr><th>Domain</th><th>Rank</th><th>Backlinks</th><th>Spam score</th><th>First seen</th></tr></thead>
              <tbody>{domains.map((d) => (
                <tr key={d.domain}><td><a className={p.page} href={`https://${d.domain}`} target="_blank" rel="noreferrer">{d.domain}</a></td>
                  <td className={p.num}>{fmt(d.rank)}</td><td className={p.num}>{fmt(d.backlinks)}</td>
                  <td className={(d.spamScore ?? 0) >= 50 ? p.down : p.num}>{d.spamScore ?? "—"}</td><td className={p.dim}>{day(d.firstSeen)}</td></tr>
              ))}</tbody>
            </table>
          )) : tab === "links" ? (links.length === 0 ? <div className={p.empty}>No backlinks match.</div> : (
            <table className={u.table} style={{ border: 0, borderRadius: 0 }}>
              <thead><tr><th>Source page</th><th>Anchor</th><th>Target</th><th>Type</th><th>Rank</th><th>First seen</th><th>Status</th></tr></thead>
              <tbody>{links.map((l, i) => (
                <tr key={l.from + l.to + i}>
                  <td><a className={p.page} href={l.from} target="_blank" rel="noreferrer" title={l.title ?? undefined}>{short(l.from)}</a></td>
                  <td className={l.anchor ? undefined : p.dim}>{l.anchor || "(no anchor)"}</td>
                  <td><span className={p.page}>{short(l.to)}</span></td>
                  <td>{l.dofollow ? <span className={`${u.badge} ${u.badgeSuccess}`}>dofollow</span> : <span className={u.badge}>nofollow</span>}</td>
                  <td className={p.num}>{fmt(l.rank)}</td><td className={p.dim}>{day(l.firstSeen)}</td>
                  <td>{l.isLost ? <span className={p.down}>Lost</span> : l.isNew ? <span className={p.up}>New</span> : <span className={p.dim}>Live</span>}</td>
                </tr>
              ))}</tbody>
            </table>
          )) : (anchors.length === 0 ? <div className={p.empty}>No anchors found.</div> : (
            <table className={u.table} style={{ border: 0, borderRadius: 0 }}>
              <thead><tr><th>Anchor</th><th>Backlinks</th><th>Referring domains</th><th>First seen</th></tr></thead>
              <tbody>{anchors.map((a) => (
                <tr key={a.anchor}><td>{a.anchor}</td><td className={p.num}>{fmt(a.backlinks)}</td><td className={p.num}>{fmt(a.domains)}</td><td className={p.dim}>{day(a.firstSeen)}</td></tr>
              ))}</tbody>
            </table>
          ))}
      </div>
    </>
  );
}
