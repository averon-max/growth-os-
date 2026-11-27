"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { readCache, writeCache } from "@/lib/client-cache";
import { ArrowUpRight, Loader2, RefreshCw, Search, Upload } from "lucide-react";
import type { BacklinksReport } from "@/lib/backlinks/domain";
import { DetailDrawer, type DrawerData } from "./detail-drawer";
import s from "./backlinks.module.css";
import { BarList, Columns, InsightCard, InsightGrid, Meter, StackBar, TONE, fmtNum } from "./insights";

type Tab = "domains" | "links" | "anchors";
type Only = "all" | "dofollow" | "nofollow" | "new" | "lost";
type Qual = "all" | "clean" | "watch" | "spam";
const qualOf = (spam: number | null): Exclude<Qual, "all"> => ((spam ?? 0) >= 50 ? "spam" : (spam ?? 0) >= 30 ? "watch" : "clean");
type Link = BacklinksReport["links"][number];
type Domain = BacklinksReport["domains"][number];
type Anchor = BacklinksReport["anchors"][number];

const PAGE = 50;
const fmt = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e4 ? `${Math.round(n / 1e3)}K` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : n.toLocaleString("en-US");
// DataForSEO dates look like "2024-03-01 10:20:30 +00:00", which Safari cannot parse: make them ISO first.
const toDate = (v: string) => new Date(/^\d{4}-\d{2}-\d{2} /.test(v) ? v.replace(" ", "T").replace(/ ([+-]\d{2}):?(\d{2})$/, "$1:$2") : v);
const date = (v: string | null) => {
  if (!v) return "—";
  const d = toDate(v);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
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
  const [qual, setQual] = useState<Qual>("all");
  const [q, setQ] = useState("");
  const [pg, setPg] = useState(0);
  const [sel, setSel] = useState<DrawerData | null>(null);

  const load = useCallback(async (refresh: boolean) => {
    setBusy(true);
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { const cached = readCache<any>(`backlinks:${websiteId}`); if (cached) { if (!refresh) setData(cached); } }
      const res = await fetch(`/api/backlinks?websiteId=${encodeURIComponent(websiteId)}${refresh ? "&refresh=1" : ""}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not load backlinks.");
      setData(json);
      writeCache(`backlinks:${websiteId}`, json);
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
  const links = allLinks.filter((l) => (only === "all" || (only === "dofollow" && l.dofollow) || (only === "nofollow" && !l.dofollow) || (only === "new" && l.isNew) || (only === "lost" && l.isLost)) && (!ql || l.from.toLowerCase().includes(ql) || (l.anchor ?? "").toLowerCase().includes(ql)));
  const domains = (data?.domains ?? []).filter((d) => (qual === "all" || qualOf(d.spamScore) === qual) && (!ql || d.domain.includes(ql)));
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
  const allDomains = data?.domains ?? [];
  const qualCount = (q: Exclude<Qual, "all">) => allDomains.filter((d) => qualOf(d.spamScore) === q).length;
  const pickQual = (q: Qual) => { go("domains"); setQual((p) => (p === q ? "all" : q)); };
  const pickOnly = (o: Only) => { go("links", only === o && tab === "links" ? "all" : o); };
  const rankBuckets: [string, number, number][] = [["0", 0, 0], ["1–100", 1, 100], ["101–200", 101, 200], ["201–300", 201, 300], ["301–500", 301, 500], ["500+", 501, 1e9]];
  const months = (() => {
    const out: { key: string; label: string; value: number }[] = [];
    const now = new Date();
    for (let k = 11; k >= 0; k--) {
      const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
      out.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString("en-US", { month: "short" }), value: 0 });
    }
    for (const d of allDomains) {
      if (!d.firstSeen) continue;
      const x = toDate(d.firstSeen);
      const hit = out.find((m) => m.key === `${x.getFullYear()}-${x.getMonth()}`);
      if (hit) hit.value += 1;
    }
    return out;
  })();
  const newCount = allLinks.filter((l) => l.isNew).length;
  const lostCount = allLinks.filter((l) => l.isLost).length;

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

      <InsightGrid>
        <InsightCard title="Link profile" meta={sum?.rank == null ? undefined : `rank ${sum.rank} / 1000`}>
          <div className={s.profile}>
            <button type="button" className={s.profileNum} data-active={tab === "domains" || undefined} onClick={() => { go("domains"); setQual("all"); }}>
              <span>Referring domains</span>
              <strong>{fmt(sum?.referringDomains)}</strong>
            </button>
            <button type="button" className={s.profileNum} data-active={(tab === "links" && only === "all") || undefined} onClick={() => go("links")}>
              <span>Backlinks</span>
              <strong>{fmt(sum?.backlinks)}</strong>
            </button>
          </div>
          <Meter value={sum?.rank ?? null} max={1000} good={300} warn={100} label={`Domain rank ${fmt(sum?.rank)} of 1000 · DataForSEO authority score`} />
        </InsightCard>

        <InsightCard title="Link quality" meta="by spam score: under 30 · 30–49 · 50+">
          <StackBar
            unit="domains"
            parts={[
              { key: "clean", label: "Clean", value: qualCount("clean"), color: TONE.good, active: qual === "clean", onClick: () => pickQual("clean") },
              { key: "watch", label: "Watch", value: qualCount("watch"), color: TONE.warn, active: qual === "watch", onClick: () => pickQual("watch") },
              { key: "spam", label: "Spam", value: qualCount("spam"), color: TONE.bad, active: qual === "spam", onClick: () => pickQual("spam") },
            ]}
          />
        </InsightCard>

        <InsightCard title="Link types" meta={sum?.dofollowShare == null ? undefined : `${sum.dofollowShare}% dofollow overall`}>
          <StackBar
            unit="links"
            parts={[
              { key: "do", label: "Dofollow", value: allLinks.filter((l) => l.dofollow).length, color: "#0090ff", active: tab === "links" && only === "dofollow", onClick: () => pickOnly("dofollow") },
              { key: "no", label: "Nofollow", value: allLinks.filter((l) => !l.dofollow).length, color: "#8e4ec6", active: tab === "links" && only === "nofollow", onClick: () => pickOnly("nofollow") },
              { key: "new", label: "New", value: newCount, color: "#12a594", active: tab === "links" && only === "new", onClick: () => pickOnly("new") },
              { key: "lost", label: "Lost", value: lostCount, color: TONE.bad, active: tab === "links" && only === "lost", onClick: () => pickOnly("lost") },
            ]}
          />
        </InsightCard>

        <InsightCard title="Top anchors" action={<button type="button" onClick={() => go("anchors")}>All anchors</button>}>
          <BarList
            empty="No anchor texts yet."
            rows={(data?.anchors ?? []).slice(0, 6).map((a) => ({ key: a.anchor, label: a.anchor || "(no anchor)", value: a.backlinks ?? 0, color: SPAM.test(a.anchor) ? TONE.bad : undefined, onClick: () => openAnchor(a) }))}
          />
        </InsightCard>

        <InsightCard title="Rank of linking sites">
          <Columns
            unit="domains"
            cols={rankBuckets.map(([label, lo, hi], i) => ({ key: label, label, value: allDomains.filter((d) => (d.rank ?? 0) >= lo && (d.rank ?? 0) <= hi).length, color: ["#3a3a3a", "#e5484d", "#f5a623", "#12a594", "#0090ff", "#30a46c"][i] }))}
          />
        </InsightCard>

        <InsightCard title="New linking domains" meta={`last 12 months · ${fmtNum(months.reduce((a, m) => a + m.value, 0))} total`}>
          <Columns unit="domains" cols={months.map((m) => ({ ...m, color: "#0090ff" }))} />
        </InsightCard>
      </InsightGrid>

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
              {(["all", "dofollow", "nofollow", "new", "lost"] as const).map((o) => (
                <button key={o} type="button" data-active={only === o || undefined} onClick={() => { setOnly(o); setPg(0); }}>
                  {o === "all" ? "All" : o === "dofollow" ? "Dofollow" : o === "nofollow" ? "Nofollow" : o === "new" ? "New" : "Lost"}
                </button>
              ))}
            </div>
          ) : null}
          {tab === "domains" && qual !== "all" ? (
            <button type="button" className={s.chip} onClick={() => setQual("all")}>
              {qual === "spam" ? "Spam" : qual === "watch" ? "Watch" : "Clean"} only <span aria-hidden>×</span>
            </button>
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
                      <td>
                        <span className={s.primary}>
                          <img src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(d.domain)}&sz=32`} alt="" width={16} height={16} className={s.favicon} />
                          <span className={s.clip}>{d.domain}</span>
                        </span>
                      </td>
                      <td><Quality spam={d.spamScore} /></td>
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
                      <td title={l.from}>
                        <span className={s.primary}>
                          <img src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(l.fromDomain)}&sz=32`} alt="" width={16} height={16} className={s.favicon} />
                          <span className={s.clip}>{short(l.from)}</span>
                        </span>
                      </td>
                      <td className={s.clip} title={l.anchor ?? ""}>{l.anchor || <span className={s.muted}>(no anchor)</span>}</td>
                      <td className={s.clip}>{short(l.to)}</td>
                      <td><span className={s.pill} data-tone={l.dofollow ? "good" : undefined}>{l.dofollow ? "dofollow" : "nofollow"}</span></td>
                      <td className={s.num}>{fmt(l.rank)}</td>
                      <td className={s.num}>{date(l.firstSeen)}</td>
                      <td>{l.isLost ? <span className={s.pill} data-tone="bad">Lost</span> : toxicLink(l) ? <Quality spam={100} /> : l.isNew ? <span className={s.pill} data-tone="new">New</span> : <span className={s.muted}>Live</span>}</td>
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
                        <td title={a.anchor}>
                          <span className={s.primary}>
                            <span className={s.clip}>{a.anchor}</span>
                            {SPAM.test(a.anchor) ? <Quality spam={100} /> : null}
                          </span>
                        </td>
                        <td className={s.num}>{fmt(a.backlinks)}</td>
                        <td>
                          <span className={s.shareCell}>
                            <span className={s.bar}><span style={{ width: `${Math.max(2, share * 100)}%` }} /></span>
                            <span className={s.shareValue}>{Math.round(share * 100)}%</span>
                          </span>
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

function Quality({ spam }: { spam: number | null }) {
  const q = qualOf(spam);
  const title = q === "spam" ? "Looks like a paid or spam link. Google may ignore it or treat it as a link scheme." : q === "watch" ? "Some spam signals. Worth a look." : "No spam signals";
  return (
    <span className={s.quality} data-q={q} title={title}>
      <i aria-hidden /> {q === "spam" ? "Spam" : q === "watch" ? "Watch" : "Clean"}
    </span>
  );
}
