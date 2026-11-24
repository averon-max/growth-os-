"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Loader2, RefreshCw, Search, Upload } from "lucide-react";
import type { BacklinksReport } from "@/lib/backlinks/domain";
import { DetailDrawer, type DrawerData } from "./detail-drawer";
import s from "./backlinks.module.css";

type Tab = "domains" | "links" | "anchors";
type Only = "all" | "dofollow" | "new" | "lost";
type Link = BacklinksReport["links"][number];
type Domain = BacklinksReport["domains"][number];
type Anchor = BacklinksReport["anchors"][number];

const PAGE = 50;
const fmt = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e4 ? `${Math.round(n / 1e3)}K` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : n.toLocaleString("en-US");
const date = (v: string | null) => (v ? new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—");
const short = (url: string) => {
  try {
    const x = new URL(url);
    return x.hostname.replace(/^www\./, "") + (x.pathname === "/" ? "" : x.pathname);
  } catch {
    return url;
  }
};
/** Anchors and URLs that read like paid link schemes (PBNs, "DA 50 backlinks", casinos). */
const SPAM = /backlink|pbn|dofollow|\bseo\b|\bda ?\d|buy|cheap|casino|poker|slot|betting|888|rank first/i;

function useSort<T>(rows: T[], cols: Record<string, (r: T) => number | string | null>, initial: string) {
  const [sort, setSort] = useState({ key: initial, desc: true });
  const sorted: T[] = useMemo<T[]>(() => {
    const get = cols[sort.key];
    if (!get) return rows;
    return [...rows].sort((a, b) => {
      const x = get(a);
      const y = get(b);
      if (x === null) return 1;
      if (y === null) return -1;
      const d = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
      return sort.desc ? -d : d;
    });
  }, [rows, cols, sort]);
  const th = (key: string, label: string, align: "left" | "right" = "right") => (
    <th className={align === "right" ? s.num : undefined} aria-sort={sort.key === key ? (sort.desc ? "descending" : "ascending") : undefined}>
      <button type="button" className={s.sort} onClick={() => setSort((p) => ({ key, desc: p.key === key ? !p.desc : true }))}>
        {label}
        <span className={s.arrow} aria-hidden>
          {sort.key === key ? (sort.desc ? "↓" : "↑") : ""}
        </span>
      </button>
    </th>
  );
  return { sorted, th };
}

function FreeBanner({ notice, websiteId, onImported }: { notice: string; websiteId: string; onImported: () => void }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setMsg(null);
    const notes: string[] = [];
    try {
      for (const f of Array.from(files)) {
        const res = await fetch(`/api/backlinks/import?websiteId=${encodeURIComponent(websiteId)}&name=${encodeURIComponent(f.name)}`, {
          method: "POST",
          headers: { "content-type": "text/csv" },
          body: await f.text(),
        });
        const j = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
        if (!res.ok) throw new Error(j.error ?? `Import of ${f.name} failed.`);
        notes.push(j.message ?? f.name);
      }
      setMsg(notes.join(" "));
      onImported();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={s.notice}>
      <span className={s.noticeTag}>Free mode</span>
      <span className={s.noticeText}>{msg ?? notice.replace(/^Free mode — /, "")}</span>
      <label className={s.button}>
        {busy ? <Loader2 size={14} className={s.spin} /> : <Upload size={14} />} Import CSV
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
  const [only, setOnly] = useState<Only>("all");
  const [q, setQ] = useState("");
  const [pg, setPg] = useState(0);
  const [sel, setSel] = useState<DrawerData | null>(null);

  const load = useCallback(async (refresh: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/backlinks?websiteId=${encodeURIComponent(websiteId)}${refresh ? "&refresh=1" : ""}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not load backlinks.");
      setData(json);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [websiteId]);
  useEffect(() => { void load(false); }, [load]);

  const spamBy = useMemo(() => new Map((data?.domains ?? []).map((d) => [d.domain, d.spamScore ?? 0])), [data]);
  const toxicLink = useCallback((l: Link) => SPAM.test(l.anchor ?? "") || SPAM.test(l.from) || (spamBy.get(l.fromDomain) ?? 0) >= 50, [spamBy]);
  const toxicDomain = (d: Domain) => (d.spamScore ?? 0) >= 50;

  const ql = q.trim().toLowerCase();
  const allLinks = data?.links ?? [];
  const links = allLinks.filter((l) => (only === "all" || (only === "dofollow" && l.dofollow) || (only === "new" && l.isNew) || (only === "lost" && l.isLost)) && (!ql || l.from.toLowerCase().includes(ql) || (l.anchor ?? "").toLowerCase().includes(ql)));
  const domains = (data?.domains ?? []).filter((d) => !ql || d.domain.includes(ql));
  const anchors = (data?.anchors ?? []).filter((a) => !ql || a.anchor.toLowerCase().includes(ql));
  const anchorTotal = (data?.anchors ?? []).reduce((a, x) => a + (x.backlinks ?? 0), 0);

  const dSort = useSort<Domain>(domains, useMemo(() => ({ domain: (d: Domain) => d.domain, backlinks: (d: Domain) => d.backlinks, rank: (d: Domain) => d.rank, spam: (d: Domain) => d.spamScore, seen: (d: Domain) => d.firstSeen }), []), "backlinks");
  const lSort = useSort<Link>(links, useMemo(() => ({ from: (l: Link) => l.from, rank: (l: Link) => l.rank, seen: (l: Link) => l.firstSeen }), []), "rank");
  const aSort = useSort<Anchor>(anchors, useMemo(() => ({ anchor: (a: Anchor) => a.anchor, backlinks: (a: Anchor) => a.backlinks, domains: (a: Anchor) => a.domains, seen: (a: Anchor) => a.firstSeen }), []), "backlinks");

  const linkItems = (ls: Link[]) => ls.map((l) => ({ primary: short(l.from), secondary: `${l.anchor || "(no anchor)"} → ${short(l.to)} · ${l.dofollow ? "dofollow" : "nofollow"}`, href: l.from }));
  const openDomain = (d: Domain) => {
    const ls = allLinks.filter((l) => l.fromDomain === d.domain || l.fromDomain.endsWith(`.${d.domain}`));
    setSel({
      title: d.domain,
      subtitle: toxicDomain(d) ? "Referring domain · looks spammy" : "Referring domain",
      fields: [["Domain rank", fmt(d.rank)], ["Backlinks to you", fmt(d.backlinks)], ["Spam score", d.spamScore === null ? "—" : `${d.spamScore}/100`], ["First seen", date(d.firstSeen)]],
      itemsTitle: `Links from this domain (${ls.length} in the sample)`,
      items: linkItems(ls),
      actions: <a className={s.button} href={`https://${d.domain}`} target="_blank" rel="noreferrer">Open site <ArrowUpRight size={14} /></a>,
    });
  };
  const openLink = (l: Link) =>
    setSel({
      title: short(l.from),
      subtitle: l.title ?? "Backlink",
      fields: [["Anchor", l.anchor || "(no anchor)"], ["Points to", short(l.to)], ["Type", l.dofollow ? "dofollow" : "nofollow"], ["Page rank", fmt(l.rank)], ["First seen", date(l.firstSeen)], ["Status", l.isLost ? "Lost" : l.isNew ? "New" : "Live"]],
      actions: <a className={s.button} href={l.from} target="_blank" rel="noreferrer">Open source page <ArrowUpRight size={14} /></a>,
    });
  const openAnchor = (a: Anchor) => {
    const ls = allLinks.filter((l) => (l.anchor || "(empty)") === a.anchor);
    setSel({ title: a.anchor, subtitle: "Anchor text", fields: [["Backlinks", fmt(a.backlinks)], ["Referring domains", fmt(a.domains)], ["First seen", date(a.firstSeen)]], itemsTitle: `Links with this anchor (${ls.length} in the sample)`, items: linkItems(ls) });
  };

  const sum = data?.summary;
  const go = (t: Tab, o: Only = "all") => {
    setTab(t);
    setOnly(o);
    setPg(0);
  };
  const stats: { label: string; value: string; hint: string; active: boolean; onClick?: () => void; tone?: "good" | "bad" }[] = [
    { label: "Referring domains", value: fmt(sum?.referringDomains), hint: "Different sites that link to you", active: tab === "domains", onClick: () => go("domains") },
    { label: "Backlinks", value: fmt(sum?.backlinks), hint: "All links pointing to the site", active: tab === "links" && only === "all", onClick: () => go("links") },
    { label: "Dofollow", value: sum?.dofollowShare == null ? "—" : `${sum.dofollowShare}%`, hint: "Links that pass ranking value", active: tab === "links" && only === "dofollow", onClick: () => go("links", "dofollow") },
    { label: "New", value: data ? String(allLinks.filter((l) => l.isNew).length) : "—", hint: "New links in the latest sample", active: tab === "links" && only === "new", onClick: () => go("links", "new"), tone: "good" },
    { label: "Lost", value: data ? String(allLinks.filter((l) => l.isLost).length) : "—", hint: "Links that disappeared", active: tab === "links" && only === "lost", onClick: () => go("links", "lost"), tone: "bad" },
    { label: "Domain rank", value: fmt(sum?.rank), hint: "DataForSEO authority score of the domain, 0–1000", active: false },
  ];

  const rows = tab === "domains" ? dSort.sorted.length : tab === "links" ? lSort.sorted.length : aSort.sorted.length;
  const pages = Math.max(1, Math.ceil(rows / PAGE));
  const slice = <T,>(xs: T[]) => xs.slice(pg * PAGE, pg * PAGE + PAGE);

  return (
    <>
      <header className={s.head}>
        <div>
          <h1 className={s.title}>Backlinks</h1>
          <p className={s.meta}>
            {data ? `${data.domain} · updated ${new Date(data.generatedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : `${domain} · links from other sites, by DataForSEO`}
          </p>
        </div>
        <button type="button" className={s.button} disabled={busy} onClick={() => void load(true)}>
          {busy ? <Loader2 size={14} className={s.spin} /> : <RefreshCw size={14} />} Refresh
        </button>
      </header>

      {error ? <p className={s.error} role="alert">{error}</p> : null}
      {data?.mode === "free" ? <FreeBanner notice={data.notice ?? ""} websiteId={websiteId} onImported={() => void load(false)} /> : null}

      <div className={s.stats}>
        {stats.map((st) =>
          st.onClick ? (
            <button key={st.label} type="button" className={s.stat} data-active={st.active || undefined} onClick={st.onClick} title={st.hint}>
              <span className={s.statLabel}>{st.label}</span>
              <span className={s.statValue} data-tone={st.tone}>{st.value}</span>
            </button>
          ) : (
            <div key={st.label} className={s.stat} title={st.hint}>
              <span className={s.statLabel}>{st.label}</span>
              <span className={s.statValue}>{st.value}</span>
            </div>
          ),
        )}
      </div>

      <section className={s.panel}>
        <div className={s.toolbar}>
          <div className={s.tabs} role="tablist">
            {([["domains", "Referring domains", data?.domains.length], ["links", "Backlinks", data?.links.length], ["anchors", "Anchors", data?.anchors.length]] as [Tab, string, number | undefined][]).map(([id, label, n]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} className={s.tab} data-active={tab === id || undefined} onClick={() => go(id)}>
                {label}
                {n === undefined ? null : <span className={s.tabCount}>{n}</span>}
              </button>
            ))}
          </div>
          {tab === "links" ? (
            <div className={s.segment}>
              {(["all", "dofollow", "new", "lost"] as const).map((o) => (
                <button key={o} type="button" data-active={only === o || undefined} onClick={() => { setOnly(o); setPg(0); }}>
                  {o === "all" ? "All" : o === "dofollow" ? "Dofollow" : o === "new" ? "New" : "Lost"}
                </button>
              ))}
            </div>
          ) : null}
          <label className={s.search}>
            <Search size={14} aria-hidden />
            <input value={q} onChange={(e) => { setQ(e.target.value); setPg(0); }} placeholder={tab === "anchors" ? "Filter anchors" : tab === "links" ? "Filter by page or anchor" : "Filter domains"} />
          </label>
        </div>

        {data === null ? (
          <p className={s.empty}>{busy ? "Loading backlinks…" : "No data yet. Press Refresh."}</p>
        ) : rows === 0 ? (
          <p className={s.empty}>Nothing matches this filter.</p>
        ) : (
          <div className={s.tableWrap}>
            {tab === "domains" ? (
              <table className={s.table}>
                <thead>
                  <tr>
                    {dSort.th("domain", "Domain", "left")}
                    <th>Quality</th>
                    {dSort.th("backlinks", "Links to you")}
                    {dSort.th("rank", "Domain rank")}
                    {dSort.th("spam", "Spam score")}
                    {dSort.th("seen", "First seen")}
                  </tr>
                </thead>
                <tbody>
                  {slice(dSort.sorted).map((d) => (
                    <tr key={d.domain} tabIndex={0} onClick={() => openDomain(d)} onKeyDown={(e) => e.key === "Enter" && openDomain(d)}>
                      <td className={s.primary}>
                        <img src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(d.domain)}&sz=32`} alt="" width={16} height={16} className={s.favicon} />
                        {d.domain}
                      </td>
                      <td><Quality bad={toxicDomain(d)} /></td>
                      <td className={s.num}>{fmt(d.backlinks)}</td>
                      <td className={s.num}>{fmt(d.rank)}</td>
                      <td className={s.num} data-tone={toxicDomain(d) ? "bad" : undefined}>{d.spamScore ?? "—"}</td>
                      <td className={s.num}>{date(d.firstSeen)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : tab === "links" ? (
              <table className={s.table}>
                <thead>
                  <tr>
                    {lSort.th("from", "Source page", "left")}
                    <th>Anchor</th>
                    <th>Points to</th>
                    <th>Type</th>
                    {lSort.th("rank", "Page rank")}
                    {lSort.th("seen", "First seen")}
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {slice(lSort.sorted).map((l, i) => (
                    <tr key={l.from + l.to + i} tabIndex={0} onClick={() => openLink(l)} onKeyDown={(e) => e.key === "Enter" && openLink(l)}>
                      <td className={s.primary} title={l.from}>
                        <img src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(l.fromDomain)}&sz=32`} alt="" width={16} height={16} className={s.favicon} />
                        <span className={s.clip}>{short(l.from)}</span>
                      </td>
                      <td className={s.clip} title={l.anchor ?? ""}>{l.anchor || <span className={s.muted}>(no anchor)</span>}</td>
                      <td className={s.clip}>{short(l.to)}</td>
                      <td><span className={s.pill} data-tone={l.dofollow ? "good" : undefined}>{l.dofollow ? "dofollow" : "nofollow"}</span></td>
                      <td className={s.num}>{fmt(l.rank)}</td>
                      <td className={s.num}>{date(l.firstSeen)}</td>
                      <td>{l.isLost ? <span className={s.pill} data-tone="bad">Lost</span> : toxicLink(l) ? <Quality bad /> : l.isNew ? <span className={s.pill} data-tone="new">New</span> : <span className={s.muted}>Live</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className={s.table}>
                <thead>
                  <tr>
                    {aSort.th("anchor", "Anchor text", "left")}
                    {aSort.th("backlinks", "Backlinks")}
                    <th className={s.shareHead}>Share of links</th>
                    {aSort.th("domains", "Referring domains")}
                    {aSort.th("seen", "First seen")}
                  </tr>
                </thead>
                <tbody>
                  {slice(aSort.sorted).map((a) => {
                    const share = anchorTotal ? (a.backlinks ?? 0) / anchorTotal : 0;
                    return (
                      <tr key={a.anchor} tabIndex={0} onClick={() => openAnchor(a)} onKeyDown={(e) => e.key === "Enter" && openAnchor(a)}>
                        <td className={s.primary} title={a.anchor}>
                          <span className={s.clip}>{a.anchor}</span>
                          {SPAM.test(a.anchor) ? <Quality bad /> : null}
                        </td>
                        <td className={s.num}>{fmt(a.backlinks)}</td>
                        <td className={s.shareCell}>
                          <span className={s.bar}><span style={{ width: `${Math.max(2, share * 100)}%` }} /></span>
                          <span className={s.shareValue}>{Math.round(share * 100)}%</span>
                        </td>
                        <td className={s.num}>{fmt(a.domains)}</td>
                        <td className={s.num}>{date(a.firstSeen)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {pages > 1 ? (
          <div className={s.pager}>
            <span>
              {pg * PAGE + 1}–{Math.min(rows, (pg + 1) * PAGE)} of {rows.toLocaleString("en-US")}
            </span>
            <button type="button" className={s.button} disabled={pg === 0} onClick={() => setPg(pg - 1)}>Previous</button>
            <button type="button" className={s.button} disabled={pg >= pages - 1} onClick={() => setPg(pg + 1)}>Next</button>
          </div>
        ) : null}
      </section>

      {sel ? <DetailDrawer data={sel} onClose={() => setSel(null)} /> : null}
    </>
  );
}

function Quality({ bad }: { bad?: boolean }) {
  return (
    <span className={s.quality} data-bad={bad || undefined} title={bad ? "Looks like a paid or spam link. Google may ignore it or treat it as a link scheme." : "No spam signals"}>
      <i aria-hidden /> {bad ? "Spam" : "Clean"}
    </span>
  );
}
