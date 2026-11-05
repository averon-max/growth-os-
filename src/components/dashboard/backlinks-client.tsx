"use client";
import { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCw, Upload } from "lucide-react";
import type { BacklinksReport } from "@/lib/backlinks/domain";
import { DetailDrawer, type DrawerData } from "./detail-drawer";
import { LinearList, type LRow } from "./linear-list";
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

function FreeBanner({ notice, websiteId, onImported }: { notice: string; websiteId: string; onImported: () => void }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function onFiles(files: FileList | null) {
    if (files == null || files.length === 0) return;
    setBusy(true); setMsg(null);
    const notes: string[] = [];
    try {
      for (const f of Array.from(files)) {
        const res = await fetch(`/api/backlinks/import?websiteId=${encodeURIComponent(websiteId)}&name=${encodeURIComponent(f.name)}`, {
          method: "POST", headers: { "content-type": "text/csv" }, body: await f.text(),
        });
        const j = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
        if (res.ok === false) throw new Error(j.error ?? `Import of ${f.name} failed.`);
        notes.push(j.message ?? f.name);
      }
      setMsg(notes.join(" "));
      onImported();
    } catch (e) { setMsg((e as Error).message); } finally { setBusy(false); }
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 0 18px", padding: "10px 14px", border: "1px solid rgba(242,201,76,.28)", borderRadius: 10, background: "rgba(242,201,76,.06)", color: "#d0d6e0", fontSize: 13, lineHeight: 1.45 }}>
      <span style={{ color: "#f2c94c", fontWeight: 510, whiteSpace: "nowrap" }}>Free mode</span>
      <span style={{ flex: 1, minWidth: 0 }}>{msg ?? notice.replace(/^Free mode — /, "")}</span>
      <label className={p.ghost} style={{ cursor: "pointer", whiteSpace: "nowrap" }}>
        {busy ? <Loader2 size={13} className={p.spin} /> : <Upload size={13} />}Import CSV
        <input type="file" accept=".csv,.tsv,.txt" multiple hidden onChange={(e) => { void onFiles(e.target.files); e.target.value = ""; }} />
      </label>
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
  const [sel, setSel] = useState<DrawerData | null>(null);
  const [pg, setPg] = useState(0);
  type Link = BacklinksReport["links"][number];
  const linkItems = (ls: Link[]) => ls.map((l) => ({ primary: short(l.from), secondary: `${l.anchor || "(no anchor)"} → ${short(l.to)} · ${l.dofollow ? "dofollow" : "nofollow"}`, href: l.from }));
  const openDomain = (d: string) => {
    const ls = (data?.links ?? []).filter((l) => l.fromDomain === d || l.fromDomain.endsWith("." + d));
    const info = data?.domains.find((x) => x.domain === d);
    setSel({ title: d, subtitle: "Referring domain", fields: [["Rank", fmt(info?.rank ?? null)], ["Backlinks", fmt(info?.backlinks ?? null)], ["Spam score", String(info?.spamScore ?? "—")], ["First seen", day(info?.firstSeen ?? null)]], itemsTitle: `Links from this domain · ${ls.length} in sample`, items: linkItems(ls), actions: <a className={p.ghost} href={`https://${d}`} target="_blank" rel="noreferrer">Open site</a> });
  };
  const openLink = (l: Link) => setSel({ title: short(l.from), subtitle: l.title ?? "Backlink", fields: [["Anchor", l.anchor || "(no anchor)"], ["Target", short(l.to)], ["Type", l.dofollow ? "dofollow" : "nofollow"], ["Rank", fmt(l.rank)], ["First seen", day(l.firstSeen)], ["Status", l.isLost ? "Lost" : l.isNew ? "New" : "Live"]], actions: <a className={p.ghost} href={l.from} target="_blank" rel="noreferrer">Open source page</a> });
  const openAnchor = (a: string) => {
    const ls = (data?.links ?? []).filter((l) => (l.anchor || "(empty)") === a);
    setSel({ title: a, subtitle: "Anchor text", itemsTitle: `Links with this anchor · ${ls.length} in sample`, items: linkItems(ls) });
  };

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
  const SPAM = /backlink|pbn|dofollow|\bseo\b|\bda ?\d|buy|cheap|casino|poker|slot|betting|888|rank first/i;
  const spamDomain = new Map((data?.domains ?? []).map((d) => [d.domain, d.spamScore ?? 0]));
  const linkToxic = (l: Link) => SPAM.test(l.anchor ?? "") || SPAM.test(l.from) || (spamDomain.get(l.fromDomain) ?? 0) >= 50;
  const mon = (s: string | null) => (s ? new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");
  const page = <T,>(xs: T[]) => xs.slice(pg * 100, pg * 100 + 100);
  const domainRow = (d: BacklinksReport["domains"][number], i: number): LRow => {
    const tox = (d.spamScore ?? 0) >= 50;
    return { key: d.domain, id: `RD-${pg * 100 + i + 1}`, status: tox ? "red" : "green", title: d.domain, hint: `${fmt(d.backlinks)} link${d.backlinks === 1 ? "" : "s"}`,
      pills: [tox ? { label: "Spam", dot: "#eb5757" } : { label: "Clean", dot: "#4cb782" }], metrics: [`spam ${d.spamScore ?? "—"}`, `rank ${fmt(d.rank)}`], date: mon(d.firstSeen), onClick: () => openDomain(d.domain) };
  };
  const linkRow = (l: Link, i: number): LRow => {
    const tox = linkToxic(l);
    return { key: l.from + l.to + i, id: `BL-${pg * 100 + i + 1}`, status: l.isLost ? "gray" : tox ? "red" : "green", title: l.fromDomain || short(l.from), hint: l.anchor || "no anchor",
      pills: [tox ? { label: "PBN", dot: "#eb5757" } : (l.source ? { label: l.source } : { label: l.dofollow ? "dofollow" : "nofollow" }), ...(l.isNew ? [{ label: "New", dot: "#f2c94c" }] : []), ...(l.isLost ? [{ label: "Lost" }] : [])],
      metrics: [short(l.to)], date: mon(l.firstSeen), onClick: () => openLink(l) };
  };
  const pd = page(domains);
  const pl = page(links);
  const domainGroups = [
    { title: "Toxic", status: "red" as const, count: domains.filter((d) => (d.spamScore ?? 0) >= 50).length, rows: pd.filter((d) => (d.spamScore ?? 0) >= 50).map(domainRow) },
    { title: "Clean", status: "green" as const, count: domains.filter((d) => (d.spamScore ?? 0) < 50).length, rows: pd.filter((d) => (d.spamScore ?? 0) < 50).map(domainRow) },
  ];
  const linkGroups = [
    { title: "Toxic", status: "red" as const, count: links.filter(linkToxic).length, rows: pl.filter(linkToxic).map(linkRow) },
    { title: "Live", status: "green" as const, count: links.filter((l) => linkToxic(l) === false).length, rows: pl.filter((l) => linkToxic(l) === false).map(linkRow) },
  ];
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
      {data?.mode === "free" ? <FreeBanner notice={data.notice ?? ""} websiteId={websiteId} onImported={() => void load(false)} /> : null}

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
          <button key={id} className={p.tab} data-on={tab === id ? "true" : "false"} onClick={() => { setTab(id); setPg(0); }}>{label}{n === undefined ? null : <span className={p.tabCount}>{n}</span>}</button>
        ))}
      </div>

      <div className={u.group}>
        <div className={p.toolbar}>
          {tab === "links" ? (["all", "dofollow", "new", "lost"] as const).map((o) => (
            <button key={o} className={p.chip} data-on={only === o ? "true" : "false"} onClick={() => { setOnly(o); setPg(0); }}>{o === "all" ? "All" : o === "dofollow" ? "Dofollow" : o === "new" ? "New" : "Lost"}</button>
          )) : null}
          <input className={p.search} value={q} onChange={(e) => { setQ(e.target.value); setPg(0); }} placeholder="Filter…" />
        </div>
        {data === null ? <div className={p.empty}>{busy ? "Loading backlinks from DataForSEO…" : "No data."}</div>
          : tab === "domains" || tab === "links" ? <LinearList groups={tab === "domains" ? domainGroups : linkGroups} empty="Nothing matches." />
          : (tab as string) === "domains" ? (domains.length === 0 ? <div className={p.empty}>No referring domains found.</div> : (
            <table className={u.table} style={{ border: 0, borderRadius: 0 }}>
              <thead><tr><th>Domain</th><th>Rank</th><th>Backlinks</th><th>Spam score</th><th>First seen</th></tr></thead>
              <tbody>{domains.slice(pg * 100, pg * 100 + 100).map((d) => (
                <tr key={d.domain} data-click="" onClick={() => openDomain(d.domain)}><td><a onClick={(e) => e.stopPropagation()} className={p.page} href={`https://${d.domain}`} target="_blank" rel="noreferrer">{d.domain}</a></td>
                  <td className={p.num}>{fmt(d.rank)}</td><td className={p.num}>{fmt(d.backlinks)}</td>
                  <td className={(d.spamScore ?? 0) >= 50 ? p.down : p.num}>{d.spamScore ?? "—"}</td><td className={p.dim}>{day(d.firstSeen)}</td></tr>
              ))}</tbody>
            </table>
          )) : (tab as string) === "links" ? (links.length === 0 ? <div className={p.empty}>No backlinks match.</div> : (
            <table className={u.table} style={{ border: 0, borderRadius: 0 }}>
              <thead><tr><th>Source page</th><th>Anchor</th><th>Target</th><th>Type</th><th>Rank</th><th>First seen</th><th>Status</th></tr></thead>
              <tbody>{links.slice(pg * 100, pg * 100 + 100).map((l, i) => (
                <tr key={l.from + l.to + i} data-click="" onClick={() => openLink(l)}>
                  <td><a onClick={(e) => e.stopPropagation()} className={p.page} href={l.from} target="_blank" rel="noreferrer" title={l.title ?? undefined}>{short(l.from)}</a></td>
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
              <tbody>{anchors.slice(pg * 100, pg * 100 + 100).map((a) => (
                <tr key={a.anchor} data-click="" onClick={() => openAnchor(a.anchor)}><td>{a.anchor}</td><td className={p.num}>{fmt(a.backlinks)}</td><td className={p.num}>{fmt(a.domains)}</td><td className={p.dim}>{day(a.firstSeen)}</td></tr>
              ))}</tbody>
            </table>
          ))}
      </div>
      {(() => {
        const n = tab === "domains" ? domains.length : tab === "links" ? links.length : anchors.length;
        const pages = Math.ceil(n / 100);
        return pages > 1 ? (
          <div className={p.pager}>
            <button disabled={pg === 0} onClick={() => setPg(pg - 1)}>← Prev</button>
            <span>{pg + 1} / {pages} · {n.toLocaleString()} rows</span>
            <button disabled={pg >= pages - 1} onClick={() => setPg(pg + 1)}>Next →</button>
          </div>
        ) : null;
      })()}
      {sel ? <DetailDrawer data={sel} onClose={() => setSel(null)} /> : null}
    </>
  );
}
