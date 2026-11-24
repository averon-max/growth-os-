"use client";

import { useEffect, useMemo, useState } from "react";
import type { PageRow, QueryRow } from "@/lib/traffic/report";
import { PAGE_FILTERS, QUERY_FILTERS, change, fmt, type PageFilter, type QueryFilter } from "@/lib/traffic/filters";
import s from "./traffic.module.css";

type Col<T> = { key: string; label: string; value: (r: T) => number | null; cell: (r: T) => React.ReactNode; hint?: string; asc?: boolean };

/** Opens a tab when the page URL ends in #pages-<tab> / #queries-<tab> (the "Worth a look" links). */
function useHashTab<K extends string>(prefix: string, tabs: readonly K[], set: (k: K) => void) {
  useEffect(() => {
    const apply = () => {
      const h = decodeURIComponent(window.location.hash.slice(1));
      if (!h.startsWith(`${prefix}-`)) return;
      const k = h.slice(prefix.length + 1) as K;
      if (tabs.includes(k)) {
        set(k);
        document.getElementById(prefix)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, [prefix, tabs, set]);
}

function Delta({ now, before, kind }: { now: number | null; before: number | null; kind?: "count" | "position" }) {
  if (now === null) return <span className={s.flat}>—</span>;
  const c = change(now, before, kind);
  if (!c) return <span className={s.flat}>—</span>;
  return <span className={s[c.tone]}>{c.text}</span>;
}

function Table<T>({ id, title, hint, rows, cols, rowKey, tabs, tab, setTab, defaultSort, empty }: {
  id: string;
  title: string;
  hint: string;
  rows: T[];
  cols: Col<T>[];
  rowKey: (r: T) => string;
  tabs: { key: string; label: string; count: number }[];
  tab: string;
  setTab: (k: string) => void;
  defaultSort: string;
  empty: string;
}) {
  const [sort, setSort] = useState<{ key: string; desc: boolean }>({ key: defaultSort, desc: true });
  const [limit, setLimit] = useState(25);

  const sorted = useMemo(() => {
    const col = cols.find((c) => c.key === sort.key) ?? cols[0];
    return [...rows].sort((a, b) => {
      const va = col.value(a);
      const vb = col.value(b);
      if (va === null && vb === null) return 0;
      if (va === null) return 1;
      if (vb === null) return -1;
      return sort.desc ? vb - va : va - vb;
    });
  }, [rows, cols, sort]);

  return (
    <section className={s.panel} id={id}>
      <div className={s.panelHead}>
        <h2 className={s.panelTitle}>{title}</h2>
        <span className={s.panelHint}>{hint}</span>
      </div>
      <div className={s.tabs} role="tablist">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={t.key === tab}
            className={t.key === tab ? s.tabOn : s.tab}
            onClick={() => {
              setTab(t.key);
              setLimit(25);
            }}
          >
            {t.label}
            <span className={s.tabCount}>{t.count}</span>
          </button>
        ))}
      </div>
      {sorted.length === 0 ? (
        <p className={s.empty}>{empty}</p>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                {cols.map((c, i) => (
                  <th key={c.key} className={i === 0 ? s.thFirst : undefined} title={c.hint} aria-sort={sort.key === c.key ? (sort.desc ? "descending" : "ascending") : undefined}>
                    {i === 0 ? (
                      c.label
                    ) : (
                      <button
                        type="button"
                        className={s.sortBtn}
                        onClick={() => setSort((p) => (p.key === c.key ? { key: c.key, desc: !p.desc } : { key: c.key, desc: !c.asc }))}
                      >
                        {c.label}
                        {sort.key === c.key ? (sort.desc ? " ↓" : " ↑") : ""}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.slice(0, limit).map((r) => (
                <tr key={rowKey(r)}>
                  {cols.map((c, i) => (
                    <td key={c.key} className={i === 0 ? s.tdFirst : undefined}>
                      {c.cell(r)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {sorted.length > limit ? (
        <button type="button" className={s.more} onClick={() => setLimit((l) => l + 50)}>
          Show more ({sorted.length - limit} left)
        </button>
      ) : null}
    </section>
  );
}

const PAGE_TABS = Object.keys(PAGE_FILTERS) as PageFilter[];
const QUERY_TABS = Object.keys(QUERY_FILTERS) as QueryFilter[];

export function PagesTable({ rows, host, hasCloudflare, hasGoogle }: { rows: PageRow[]; host: string; hasCloudflare: boolean; hasGoogle: boolean }) {
  const [tab, setTab] = useState<PageFilter>("all");
  useHashTab("pages", PAGE_TABS, setTab);
  const base = host.replace(/\/$/, "");

  const available = PAGE_TABS.filter((k) => hasGoogle || (k !== "lowCtr" && k !== "noGoogle"));
  const tabs = available.map((k) => ({ key: k, label: PAGE_FILTERS[k].label, count: rows.filter(PAGE_FILTERS[k].test).length }));
  const shown = rows.filter(PAGE_FILTERS[tab].test);

  const cols: Col<PageRow>[] = [
    {
      key: "path",
      label: "Page",
      value: () => 0,
      cell: (r) => (
        <a href={`${base}${r.path}`} target="_blank" rel="noreferrer" className={s.pathLink} title={`${base}${r.path}`}>
          {r.path}
        </a>
      ),
    },
    ...(hasCloudflare
      ? ([
          { key: "visits", label: "Visits", value: (r) => r.visits, cell: (r) => (r.visits === null ? "—" : fmt.n(r.visits)), hint: "Cloudflare visits from all sources" },
          { key: "visitsDelta", label: "Change", value: (r) => (r.visits ?? 0) - (r.visitsBefore ?? 0), cell: (r) => <Delta now={r.visits} before={r.visitsBefore} /> },
        ] as Col<PageRow>[])
      : []),
    ...(hasGoogle
      ? ([
          { key: "clicks", label: "Google clicks", value: (r) => r.clicks, cell: (r) => (r.clicks === null ? "—" : fmt.n(r.clicks)) },
          { key: "clicksDelta", label: "Change", value: (r) => (r.clicks ?? 0) - (r.clicksBefore ?? 0), cell: (r) => <Delta now={r.clicks} before={r.clicksBefore} /> },
          { key: "impressions", label: "Impressions", value: (r) => r.impressions, cell: (r) => (r.impressions === null ? "—" : fmt.n(r.impressions)) },
          { key: "ctr", label: "CTR", value: (r) => (r.impressions ? r.ctr : null), cell: (r) => (r.impressions ? fmt.pct(r.ctr ?? 0) : "—") },
          { key: "position", label: "Position", asc: true, value: (r) => r.position, cell: (r) => (r.position === null ? "—" : fmt.pos(r.position)) },
        ] as Col<PageRow>[])
      : []),
  ];

  return (
    <Table
      id="pages"
      title="Pages"
      hint={hasCloudflare && hasGoogle ? "Cloudflare visits and Google Search, matched by URL" : hasCloudflare ? "Cloudflare visits" : "Google Search"}
      rows={shown}
      cols={cols}
      rowKey={(r) => r.path}
      tabs={tabs}
      tab={tab}
      setTab={(k) => setTab(k as PageFilter)}
      defaultSort={hasCloudflare ? "visits" : "clicks"}
      empty={tab === "all" ? "No page data for this period yet." : "No pages in this group. Good."}
    />
  );
}

export function QueriesTable({ rows }: { rows: QueryRow[] }) {
  const [tab, setTab] = useState<QueryFilter>("all");
  useHashTab("queries", QUERY_TABS, setTab);
  const tabs = QUERY_TABS.map((k) => ({ key: k, label: QUERY_FILTERS[k].label, count: rows.filter(QUERY_FILTERS[k].test).length }));
  const shown = rows.filter(QUERY_FILTERS[tab].test);

  const cols: Col<QueryRow>[] = [
    {
      key: "query",
      label: "Query",
      value: () => 0,
      cell: (r) => (
        <a href={`https://www.google.com/search?q=${encodeURIComponent(r.query)}`} target="_blank" rel="noreferrer" className={s.pathLink} title="See this search on Google">
          {r.query}
        </a>
      ),
    },
    { key: "clicks", label: "Clicks", value: (r) => r.clicks, cell: (r) => fmt.n(r.clicks) },
    { key: "clicksDelta", label: "Change", value: (r) => r.clicks - (r.clicksBefore ?? 0), cell: (r) => <Delta now={r.clicks} before={r.clicksBefore} /> },
    { key: "impressions", label: "Impressions", value: (r) => r.impressions, cell: (r) => fmt.n(r.impressions) },
    { key: "ctr", label: "CTR", value: (r) => r.ctr, cell: (r) => fmt.pct(r.ctr) },
    { key: "position", label: "Position", asc: true, value: (r) => r.position, cell: (r) => fmt.pos(r.position) },
    {
      key: "positionDelta",
      label: "Moved",
      value: (r) => (r.positionBefore === null ? null : r.positionBefore - r.position),
      cell: (r) => <Delta now={r.position} before={r.positionBefore} kind="position" />,
      hint: "Positions gained (↑) or lost (↓) since the previous period",
    },
  ];

  return (
    <Table
      id="queries"
      title="Search queries"
      hint="What people typed in Google before they saw your site"
      rows={shown}
      cols={cols}
      rowKey={(r) => r.query}
      tabs={tabs}
      tab={tab}
      setTab={(k) => setTab(k as QueryFilter)}
      defaultSort={tab === "almost" ? "impressions" : "clicks"}
      empty={tab === "all" ? "No search queries for this period yet." : "No queries in this group."}
    />
  );
}
