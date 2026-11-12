"use client";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, RefreshCw, Search, Sparkles } from "lucide-react";
import type { PlannerKeyword, PlannerReport } from "@/lib/planner/analyze";
import { WriterButton } from "./writer-button";
import { DetailDrawer, type DrawerData } from "./detail-drawer";
import { KeywordCard } from "./keyword-card";
import u from "./ui.module.css";
import p from "./planner.module.css";

type Tab = "keywords" | "wins" | "pages" | "gaps" | "cannibal" | "clusters" | "research";
type SortKey = "volume" | "kd" | "cpc" | "position" | "clicks" | "impressions";
interface Suggestion { keyword: string; searchVolume: number | null; competitionLevel: string | null; cpc: number | null; keywordDifficulty: number | null; monthlySearches: { year: number; month: number; searchVolume: number }[]; trend: { yearly: number | null } | null }

const fmt = (n: number | null) => (n === null ? "—" : n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + "K" : String(Math.round(n)));
const money = (n: number | null) => (n === null ? "—" : "$" + n.toFixed(2));
const kdLevel = (kd: number | null) => (kd === null ? undefined : kd < 30 ? "easy" : kd < 60 ? "mid" : "hard");
const short = (url: string) => { try { const x = new URL(url); return x.pathname === "/" ? x.hostname : x.pathname; } catch { return url; } };
const PAGE = 50;

const CHIPS: { id: string; label: string; test: (k: PlannerKeyword) => boolean }[] = [
  { id: "tracked", label: "Tracked", test: (k) => k.sources.includes("Tracked") },
  { id: "kd", label: "KD < 30", test: (k) => (k.kd === null ? false : k.kd < 30) },
  { id: "vol", label: "Vol > 1K", test: (k) => (k.volume ?? 0) > 1000 },
  { id: "cpc", label: "CPC > $2", test: (k) => (k.cpc ?? 0) > 2 },
  { id: "top10", label: "Top 10", test: (k) => (k.position === null ? false : k.position <= 10) },
  { id: "strike", label: "Positions 4–20", test: (k) => (k.position === null ? false : k.position >= 4 && k.position <= 20) },
  { id: "nopage", label: "No page", test: (k) => k.page === null },
  { id: "commercial", label: "Commercial", test: (k) => k.intent === "Commercial" || k.intent === "Transactional" },
];

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={u.statCard}>
      <div className={u.statHeader}><p className={u.statLabel}>{label}</p><span className={u.statAccent} style={{ background: color, color }} /></div>
      <p className={u.statValue}>{value}</p>
    </div>
  );
}

function KeywordTable({ rows, websiteId, showWrite, onOpen, onTrack }: { rows: PlannerKeyword[]; websiteId: string; showWrite?: boolean; onOpen?: (k: PlannerKeyword) => void; onTrack?: (k: string[]) => void }) {
  const [sort, setSort] = useState<SortKey>("volume");
  const [dir, setDir] = useState<1 | -1>(-1);
  const [page, setPage] = useState(0);
  const sorted = useMemo(() => {
    const v = (k: PlannerKeyword) => (k[sort] ?? (dir === -1 ? -Infinity : Infinity)) as number;
    return [...rows].sort((a, b) => (v(a) - v(b)) * dir);
  }, [rows, sort, dir]);
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const th = (key: SortKey, label: string) => (
    <th className={p.th} onClick={() => { if (sort === key) setDir(dir === -1 ? 1 : -1); else { setSort(key); setDir(key === "position" || key === "kd" ? 1 : -1); } }}>
      {label}{sort === key ? (dir === -1 ? " ↓" : " ↑") : ""}
    </th>
  );
  if (rows.length === 0) return <div className={p.empty}>Nothing here.</div>;
  return (
    <>
      <table className={u.table} style={{ border: 0, borderRadius: 0 }}>
        <thead><tr><th>Keyword</th><th>Intent</th>{th("volume", "Volume")}{th("kd", "KD")}{th("cpc", "CPC")}{th("position", "Position")}{th("clicks", "Clicks")}{th("impressions", "Impr.")}<th>Page</th><th>Source</th>{showWrite ? <th /> : null}<th /></tr></thead>
        <tbody>
          {sorted.slice(cur * PAGE, cur * PAGE + PAGE).map((k) => (
            <tr key={k.keyword} data-click="" onClick={() => onOpen?.(k)}>
              <td>{k.keyword}</td>
              <td className={p.dim}>{k.intent}</td>
              <td className={p.num}>{fmt(k.volume)}</td>
              <td>{k.kd === null ? <span className={p.dim}>—</span> : <span className={p.kd} data-l={kdLevel(k.kd)}>{k.kd}</span>}</td>
              <td className={p.num}>{money(k.cpc)}</td>
              <td className={p.num}>{k.position === null ? <span className={p.dim}>—</span> : k.position}</td>
              <td className={p.num}>{k.clicks ? fmt(k.clicks) : <span className={p.dim}>0</span>}</td>
              <td className={p.num}>{k.impressions ? fmt(k.impressions) : <span className={p.dim}>0</span>}</td>
              <td>{k.page ? <a onClick={(e) => e.stopPropagation()} className={p.page} href={k.page} target="_blank" rel="noreferrer">{short(k.page)}</a> : <span className={p.dim}>No page</span>}</td>
              <td>{k.sources.map((s) => <span key={s} className={p.src}>{s}</span>)}</td>
              {showWrite ? <td onClick={(e) => e.stopPropagation()}><WriterButton websiteId={websiteId} initialKeyword={k.keyword} label="Write" compact /></td> : null}
              <td onClick={(e) => e.stopPropagation()}>{k.sources.includes("Tracked") ? <span className={p.up} title="Tracked">✓</span> : <button className={p.linkBtn} title="Track this keyword" onClick={() => onTrack?.([k.keyword])}>+</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {pages > 1 ? (
        <div className={p.pager}>
          <button disabled={cur === 0} onClick={() => setPage(cur - 1)}>← Prev</button>
          <span>{cur + 1} / {pages} · {sorted.length} keywords</span>
          <button disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>Next →</button>
        </div>
      ) : null}
    </>
  );
}

function Research({ workspaceId, websiteId, seeds, onAdd, onOpen }: { workspaceId: string; websiteId: string; seeds: string[]; onAdd: (k: string[]) => void; onOpen: (k: string) => void }) {
  const [seed, setSeed] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Suggestion[] | null>(null);
  type Gap = { keyword: string; volume: number | null; kd: number | null; from: string; their: number | null };
  const [gaps, setGaps] = useState<Gap[] | null>(null);
  useEffect(() => {
    let off = false;
    fetch(`/api/competitors/tracked?websiteId=${encodeURIComponent(websiteId)}`)
      .then((r) => r.json())
      .then((d: { tracked?: { domain: string; keywords: { keyword: string; volume: number | null; kd: number | null; their: number | null; ours: number | null }[] }[] }) => {
        if (off) return;
        const best = new Map<string, Gap>();
        const PLATFORM = /(^|\.)(google|youtube|facebook|amazon|wikipedia|reddit|linkedin|instagram|pinterest|tiktok|quora|twitter|x|apple|bing|yahoo|yelp|medium)\.[a-z.]+$/i;
        for (const c of (d.tracked ?? []).filter((t) => PLATFORM.test(t.domain) === false)) for (const k of c.keywords) {
          const gap = (k.their === null ? false : k.their <= 10) && (k.ours === null || k.ours > 20);
          if (gap && best.has(k.keyword) === false) best.set(k.keyword, { keyword: k.keyword, volume: k.volume, kd: k.kd, from: c.domain, their: k.their });
        }
        setGaps([...best.values()].sort((a, b) => (b.volume ?? 0) - (a.volume ?? 0)).slice(0, 40));
      })
      .catch(() => { if (off === false) setGaps([]); });
    return () => { off = true; };
  }, [websiteId]);
  async function run(e: React.FormEvent) {
    e.preventDefault();
    await runSeed(seed);
  }
  async function runSeed(value: string) {
    const sd = value.trim();
    if (sd === "") return;
    setSeed(sd);
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/keywords/explore?workspaceId=${encodeURIComponent(workspaceId)}&seed=${encodeURIComponent(sd)}&limit=50`);
      const data = await res.json();
      if (res.ok === false) throw new Error(data.error ?? "Research failed.");
      setRows(data.suggestions ?? []);
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  return (
    <>
      <form className={p.toolbar} onSubmit={run}>
        <Search size={14} className={p.dim} />
        <input className={p.search} style={{ marginLeft: 0, flex: 1 }} value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="Any seed keyword, e.g. credit monitoring" />
        <button className={p.run} disabled={busy || seed.trim() === ""}>{busy ? <Loader2 size={13} className={p.spin} /> : null}Research</button>
      </form>
      {error ? <div className={p.err} style={{ margin: 12 }}>{error}</div> : null}
      {rows === null ? (
        <div>
          {seeds.length > 0 ? <div className={p.toolbar}><span className={p.count} style={{ marginRight: 4 }}>Suggested seeds</span>{seeds.map((s) => <button key={s} className={p.chip} onClick={() => void runSeed(s)}>{s}</button>)}</div> : null}
          {gaps === null ? <div className={p.empty}>Loading competitor gap suggestions…</div> : gaps.length === 0 ? <div className={p.empty}>Enter a seed or click a suggestion. Track competitors on the Competitors page to get gap keywords here.</div> : (
            <table className={u.table} style={{ border: 0, borderRadius: 0 }}>
              <thead><tr><th>Suggested from competitors</th><th>Volume</th><th>KD</th><th>Competitor</th><th>Their position</th><th /></tr></thead>
              <tbody>{gaps.map((g) => (
                <tr key={g.keyword} data-click="" onClick={() => void runSeed(g.keyword)}>
                  <td>{g.keyword}</td>
                  <td className={p.num}>{fmt(g.volume)}</td>
                  <td>{g.kd === null ? <span className={p.dim}>—</span> : <span className={p.kd} data-l={kdLevel(g.kd)}>{g.kd}</span>}</td>
                  <td className={p.dim}>{g.from}</td>
                  <td className={p.num}>{g.their ?? "—"}</td>
                  <td onClick={(e) => e.stopPropagation()}><button className={p.chip} onClick={() => onAdd([g.keyword])}>+ Track</button></td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
      ) : rows.length === 0 ? <div className={p.empty}>No related keywords found.</div> : (
        <table className={u.table} style={{ border: 0, borderRadius: 0 }}>
          <thead><tr><th>Keyword</th><th>Volume</th><th>12 months</th><th>Trend (yr)</th><th>KD</th><th>CPC</th><th>Competition</th><th /></tr></thead>
          <tbody>
            {rows.map((r) => {
              const pts = r.monthlySearches.slice(0, 12).reverse();
              const max = Math.max(1, ...pts.map((x) => x.searchVolume));
              const yr = r.trend?.yearly ?? null;
              return (
                <tr key={r.keyword} data-click="" onClick={() => onOpen(r.keyword)}>
                  <td>{r.keyword}</td>
                  <td className={p.num}>{fmt(r.searchVolume)}</td>
                  <td><span className={p.spark}>{pts.map((x, i) => <span key={i} style={{ height: `${Math.max(8, (x.searchVolume / max) * 100)}%` }} />)}</span></td>
                  <td className={yr === null ? p.dim : yr >= 0 ? p.up : p.down}>{yr === null ? "—" : `${yr > 0 ? "+" : ""}${yr}%`}</td>
                  <td>{r.keywordDifficulty === null ? <span className={p.dim}>—</span> : <span className={p.kd} data-l={kdLevel(r.keywordDifficulty)}>{r.keywordDifficulty}</span>}</td>
                  <td className={p.num}>{money(r.cpc)}</td>
                  <td className={p.dim}>{r.competitionLevel ?? "—"}</td>
                  <td onClick={(e) => e.stopPropagation()}><button className={p.chip} onClick={() => onAdd([r.keyword])}>+ Track</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}

export function PlannerClient({ websiteId, workspaceId, domain }: { websiteId: string; workspaceId: string; domain: string }) {
  const [report, setReport] = useState<PlannerReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("keywords");
  const [chips, setChips] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<DrawerData | null>(null);
  useEffect(() => {
    const f = sel?.serpFor;
    if (f === undefined || sel?.extra) return;
    let off = false;
    setSel((s) => (s ? { ...s, extraLoading: true, extraTitle: "Top Google results" } : s));
    fetch(`/api/planner/serp?websiteId=${encodeURIComponent(websiteId)}&keyword=${encodeURIComponent(f.keyword)}&volume=${f.volume}`)
      .then((r) => r.json())
      .then((d: { error?: string; items?: { position: number; domain: string; ours: boolean; clicks: number; title: string | null; url: string }[] }) => {
        if (off) return;
        const items = d.items ?? [];
        setSel((s) => (s && s.serpFor === f ? {
          ...s, extraLoading: false,
          extraTitle: d.error ? `Top results unavailable: ${d.error}` : `Top ${items.length} Google results · SEO value = est. clicks / mo`,
          extra: items.map((it) => ({ primary: `#${it.position}  ${it.domain}${it.ours ? "  (you)" : ""}`, secondary: `${it.position <= 3 ? "Top 3 · " : it.position <= 5 ? "Top 5 · " : ""}~${fmt(it.clicks)} clicks/mo · ${it.title ?? ""}`, href: it.url })),
        } : s));
      })
      .catch(() => { if (off === false) setSel((s) => (s ? { ...s, extraLoading: false, extra: [], extraTitle: "Top results unavailable" } : s)); });
    return () => { off = true; };
  }, [sel?.serpFor, websiteId]);
  const [card, setCard] = useState<string | null>(null);
  const openKw = (k: PlannerKeyword) => setCard(k.keyword);
  const openKwDetails = (k: PlannerKeyword) => setSel({
    title: k.keyword, serpFor: { keyword: k.keyword, volume: k.volume ?? 0 }, subtitle: `${k.intent} · cluster “${k.cluster}”`,
    fields: [["Volume / mo", fmt(k.volume)], ["Difficulty", k.kd === null ? "—" : String(k.kd)], ["CPC", money(k.cpc)], ["Position", k.position === null ? "—" : String(k.position)], ["Clicks · 28d", fmt(k.clicks)], ["Impressions · 28d", fmt(k.impressions)], ["Sources", k.sources.join(", ")]],
    itemsTitle: `Ranking pages · ${k.pages.length}`, items: k.pages.map((x) => ({ primary: short(x), href: x })),
    actions: <>{k.sources.includes("Tracked") ? <button className={p.ghost} onClick={() => void removeKeyword(k.keyword)}>Stop tracking</button> : <button className={p.ghost} onClick={() => void addKeywords([k.keyword])}>Track</button>}<WriterButton websiteId={websiteId} initialKeyword={k.keyword} label="Write article" compact /><a className={p.ghost} href={`https://www.google.com/search?q=${encodeURIComponent(k.keyword)}`} target="_blank" rel="noreferrer">Google SERP</a><button className={p.ghost} onClick={() => { setQ(k.cluster); setChips([]); setTab("keywords"); setSel(null); }}>Show cluster</button></>,
  });

  const [addText, setAddText] = useState("");
  const [adding, setAdding] = useState(false);
  async function addKeywords(list: string[]) {
    const kws = list.map((x) => x.trim()).filter(Boolean);
    if (kws.length === 0) { setError("Type one or more keywords, separated by commas, then press Track."); return; }
    setAdding(true); setError(null);
    try {
      const res = await fetch("/api/planner/keywords", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ websiteId, keywords: kws }) });
      const data = await res.json().catch(() => ({}));
      if (res.ok === false) throw new Error(data.error ?? "Could not add keywords.");
      setAddText("");
      await analyze(false);
    } catch (err) { setError((err as Error).message); } finally { setAdding(false); }
  }
  async function removeKeyword(keyword: string) {
    await fetch("/api/planner/keywords", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ websiteId, keyword }) });
    setSel(null);
    await analyze(false);
  }
  async function analyze(refresh: boolean) {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/planner/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ websiteId, refresh }) });
      const data = await res.json();
      if (res.ok === false) throw new Error(data.error ?? "Analysis failed.");
      setReport(data);
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  const filtered = useMemo(() => {
    if (report === null) return [];
    const ql = q.trim().toLowerCase();
    const active = CHIPS.filter((c) => chips.includes(c.id));
    return report.keywords.filter((k) => (ql === "" || k.keyword.includes(ql) || k.cluster === ql) && active.every((c) => c.test(k)));
  }, [report, chips, q]);

  const t = report?.totals;
  const wins = report ? report.keywords.filter((k) => (k.position === null ? false : k.position >= 4 && k.position <= 20) && (k.volume ?? 0) > 0) : [];
  const gaps = report ? report.keywords.filter((k) => k.page === null) : [];
  const cannibal = report ? report.keywords.filter((k) => k.pageCount > 1) : [];
  const maxVol = report ? Math.max(1, ...report.clusters.map((c) => c.volume)) : 1;
  const TABS: [Tab, string, number | null][] = [
    ["keywords", "Keywords", t?.keywords ?? null], ["wins", "Quick wins", report ? wins.length : null], ["pages", "Pages", report?.sitemap.pages ?? null],
    ["gaps", "Gaps", report ? gaps.length : null], ["cannibal", "Cannibalization", report ? cannibal.length : null],
    ["clusters", "Clusters", report?.clusters.length ?? null], ["research", "Research", null],
  ];

  return (
    <>
      <div className={u.compactHeader}>
        <div>
          <h1 className={u.compactTitle}>Keyword Planner</h1>
          <div className={u.compactMeta}>
            {report ? `${report.domain} · ${report.sitemap.pages} pages in sitemap · updated ${new Date(report.generatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}${report.fromCache ? " (cached)" : ""}` : `${domain} · sitemap, Search Console, Google rankings and global keyword data`}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <form style={{ display: "flex", gap: 6 }} onSubmit={(e) => { e.preventDefault(); void addKeywords(addText.split(/[,\n]/)); }}>
            <input className={p.search} style={{ marginLeft: 0, minWidth: 260 }} value={addText} onChange={(e) => setAddText(e.target.value)} placeholder="Add keywords, comma separated" />
            <button className={p.ghost} disabled={adding}>{adding ? <Loader2 size={13} className={p.spin} /> : <Plus size={13} />}Track</button>
          </form>
          {report ? <button className={p.ghost} disabled={busy} onClick={() => analyze(true)}><RefreshCw size={13} className={busy ? p.spin : undefined} />Refresh</button> : null}
          {report === null ? <button className={p.run} disabled={busy} onClick={() => analyze(false)}>{busy ? <Loader2 size={13} className={p.spin} /> : <Sparkles size={13} />}{busy ? "Analyzing site…" : "Analyze site"}</button> : null}
        </div>
      </div>

      {error ? <div className={p.err}>{error}</div> : null}
      {report?.warnings.map((w) => <div key={w} className={p.note}>{w}</div>)}

      <div className={`${u.statGrid} ${p.stat6}`}>
        <Stat label="Keywords" value={t ? fmt(t.keywords) : "—"} color="#3b82f6" />
        <Stat label="Search volume / mo" value={t ? fmt(t.volume) : "—"} color="#60a5fa" />
        <Stat label="Clicks · 28d" value={t ? fmt(t.clicks) : "—"} color="#4daf6d" />
        <Stat label="Impressions · 28d" value={t ? fmt(t.impressions) : "—"} color="#93c5fd" />
        <Stat label="Top 10" value={t ? `${t.top10}` : "—"} color="#7dd3a0" />
        <Stat label="Positions 4–20" value={t ? `${t.striking}` : "—"} color="#c9a644" />
      </div>

      <div className={p.tabs}>
        {TABS.map(([id, label, n]) => (
          <button key={id} className={p.tab} data-on={tab === id ? "true" : "false"} onClick={() => setTab(id)}>
            {label}{n === null ? null : <span className={p.tabCount}>{n}</span>}
          </button>
        ))}
      </div>

      <div className={u.group}>
        {tab === "research" ? <Research workspaceId={workspaceId} websiteId={websiteId} seeds={[...new Set([...(report?.clusters ?? []).slice(0, 10).map((c) => c.name), ...(report?.keywords ?? []).slice(0, 10).map((k) => k.keyword)])]} onAdd={(k) => void addKeywords(k)} onOpen={setCard} /> : report === null ? (
          <div className={p.empty}>{busy ? "Fetching sitemap, Search Console data, Google rankings and global metrics…" : "Click Analyze site to fetch every page and keyword of the site."}</div>
        ) : tab === "keywords" ? (
          <>
            <div className={p.toolbar}>
              {CHIPS.map((c) => <button key={c.id} className={p.chip} data-on={chips.includes(c.id) ? "true" : "false"} onClick={() => setChips(chips.includes(c.id) ? chips.filter((x) => x !== c.id) : [...chips, c.id])}>{c.label}</button>)}
              <input className={p.search} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter keywords…" />
              <span className={p.count}>{filtered.length}</span>
            </div>
            <KeywordTable key={chips.join() + q} rows={filtered} websiteId={websiteId} onOpen={openKw} onTrack={(k) => void addKeywords(k)} />
          </>
        ) : tab === "wins" ? <KeywordTable rows={wins} websiteId={websiteId} onOpen={openKw} onTrack={(k) => void addKeywords(k)} />
          : tab === "gaps" ? <KeywordTable rows={gaps} websiteId={websiteId} onOpen={openKw} onTrack={(k) => void addKeywords(k)} showWrite />
          : tab === "cannibal" ? (
            cannibal.length === 0 ? <div className={p.empty}>No keyword is split across several pages.</div> : (
              <table className={u.table} style={{ border: 0, borderRadius: 0 }}>
                <thead><tr><th>Keyword</th><th>Pages competing</th><th>Clicks</th><th>Position</th><th>URLs</th></tr></thead>
                <tbody>{cannibal.map((k) => (
                  <tr key={k.keyword}><td>{k.keyword}</td><td className={p.num}>{k.pageCount}</td><td className={p.num}>{fmt(k.clicks)}</td><td className={p.num}>{k.position ?? "—"}</td>
                    <td>{k.pages.slice(0, 4).map((x) => <a key={x} className={p.page} href={x} target="_blank" rel="noreferrer">{short(x)}</a>)}</td></tr>
                ))}</tbody>
              </table>
            )
          ) : tab === "clusters" ? (
            <table className={u.table} style={{ border: 0, borderRadius: 0 }}>
              <thead><tr><th>Cluster</th><th>Keywords</th><th>Volume</th><th /><th>Avg KD</th><th>Avg position</th></tr></thead>
              <tbody>{report.clusters.map((c) => (
                <tr key={c.name}>
                  <td><button className={p.linkBtn} onClick={() => { setQ(c.name); setChips([]); setTab("keywords"); }}>{c.name}</button></td>
                  <td className={p.num}>{c.keywords}</td><td className={p.num}>{fmt(c.volume)}</td>
                  <td><div className={p.bar}><div className={p.barFill} style={{ width: `${(c.volume / maxVol) * 100}%` }} /></div></td>
                  <td>{c.avgKd === null ? <span className={p.dim}>—</span> : <span className={p.kd} data-l={kdLevel(c.avgKd)}>{Math.round(c.avgKd)}</span>}</td>
                  <td className={p.num}>{c.avgPosition ?? "—"}</td>
                </tr>
              ))}</tbody>
            </table>
          ) : (
            report.pages.length === 0 ? <div className={p.empty}>No pages found in the sitemap.</div> : (
              <table className={u.table} style={{ border: 0, borderRadius: 0 }}>
                <thead><tr><th>Page</th><th>Keywords</th><th>Top keyword</th><th>Clicks</th><th>Impressions</th><th>Best position</th><th>Article</th></tr></thead>
                <tbody>{[...report.pages].sort((a, b) => b.clicks - a.clicks || b.keywords - a.keywords).slice(0, 500).map((pg) => (
                  <tr key={pg.url}>
                    <td><a className={p.page} href={pg.url} target="_blank" rel="noreferrer">{pg.path}</a></td>
                    <td className={pg.keywords === 0 ? p.down : p.num}>{pg.keywords}</td>
                    <td className={pg.topKeyword ? undefined : p.dim}>{pg.topKeyword ?? "—"}</td>
                    <td className={p.num}>{fmt(pg.clicks)}</td><td className={p.num}>{fmt(pg.impressions)}</td>
                    <td className={p.num}>{pg.bestPosition ?? "—"}</td>
                    <td>{pg.hasArticle ? <span className={`${u.badge} ${u.badgeSuccess}`}>Hyprlyx</span> : <span className={p.dim}>—</span>}</td>
                  </tr>
                ))}</tbody>
              </table>
            )
          )}
      </div>
      {sel ? <DetailDrawer data={sel} onClose={() => setSel(null)} /> : null}
      {card ? <KeywordCard keyword={card} workspaceId={workspaceId} websiteId={websiteId} tracked={report?.keywords.find((x) => x.keyword === card)?.sources.includes("Tracked") ?? false} onChanged={() => void analyze(false)} onClose={() => setCard(null)} /> : null}
    </>
  );
}
