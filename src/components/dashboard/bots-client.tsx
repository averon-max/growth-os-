"use client";
import { useCallback, useEffect, useState } from "react";
import { readCache, writeCache } from "@/lib/client-cache";
import { Loader2, RefreshCw } from "lucide-react";
import { DetailDrawer, type DrawerData } from "./detail-drawer";
import u from "./ui.module.css";
import p from "./planner.module.css";
import { BarList, Columns, InsightCard, InsightGrid, KpiStrip, StackBar } from "./insights";

const GROUP_COLOR: Record<string, string> = { "Search engines": "#30a46c", "AI crawlers & assistants": "#8e4ec6", "SEO tools": "#f5a623", "Other bots": "#0090ff" };
const isAsset = (path: string) => /^\/_next\/|\.(js|css|png|jpe?g|webp|svg|ico|woff2?|map|txt|xml)$/i.test(path);

interface BotsData {
  connected: boolean; since?: string; until?: string; skippedDays?: { date: string; reason: string }[];
  totals?: { total: number; bots: number; share: number }; groups?: Record<string, number>;
  categories?: { category: string; group: string; requests: number }[];
  pages?: { path: string; total: number; bots: number; top: string | null }[];
  daily?: { date: string; total: number; bots: number }[];
}
type Tab = "categories" | "pages" | "daily";
const fmt = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(n >= 1e4 ? 0 : 1) + "K" : String(n));

export function BotsClient({ websiteId, domain }: { websiteId: string; domain: string }) {
  const [days, setDays] = useState(7);
  const [data, setData] = useState<BotsData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("categories");
  const [sel, setSel] = useState<DrawerData | null>(null);

  const load = useCallback(async () => {
    setBusy(true); setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { const cached = readCache<any>(`bots:${websiteId}:${days}`); if (cached) { setData(cached); } }
      const res = await fetch(`/api/bots?websiteId=${encodeURIComponent(websiteId)}&days=${days}`);
      const json = await res.json();
      if (res.ok === false) throw new Error(json.error ?? "Could not load bot traffic.");
      setData(json);
      writeCache(`bots:${websiteId}:${days}`, json);
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
          <KpiStrip
            items={[
              { key: "req", label: "Requests", value: t ? fmt(t.total) : "—", sub: "people and bots", color: "#0090ff" },
              { key: "bots", label: "Verified bots", value: t ? fmt(t.bots) : "—", sub: t ? `${t.share}% of all requests` : undefined, color: "#ededed" },
              { key: "se", label: "Search engines", value: data ? fmt(g["Search engines"] ?? 0) : "—", sub: "Google, Bing and others", color: GROUP_COLOR["Search engines"] },
              { key: "ai", label: "AI crawlers", value: data ? fmt(g["AI crawlers & assistants"] ?? 0) : "—", sub: "ChatGPT, Claude, Perplexity…", color: GROUP_COLOR["AI crawlers & assistants"] },
              { key: "seo", label: "SEO tools", value: data ? fmt(g["SEO tools"] ?? 0) : "—", sub: "Ahrefs, Semrush…", color: GROUP_COLOR["SEO tools"] },
            ]}
          />
          {data && (data.categories ?? []).length > 0 ? (
            <InsightGrid>
              <InsightCard title="Who crawls you" meta={t ? `${fmt(t.bots)} bot requests` : undefined}>
                <StackBar unit="req" parts={Object.entries(g as Record<string, number>).sort((a, b) => b[1] - a[1]).map(([name, n]) => ({ key: name, label: name, value: n, color: GROUP_COLOR[name] ?? "#3a3a3a", onClick: () => setTab("categories") }))} />
              </InsightCard>
              <InsightCard title="Bot requests per day" meta={`${days} days`}>
                <Columns height={110} unit="bot requests" cols={(data.daily ?? []).map((d) => ({ key: d.date, label: d.date.slice(5), value: d.bots, hint: `${fmt(d.total)} requests in total`, color: "#8e4ec6", onClick: () => setTab("daily") }))} />
              </InsightCard>
              <InsightCard title="Most crawled pages" action={<button type="button" onClick={() => setTab("pages")}>All pages</button>}>
                <BarList empty="No page data." rows={(data.pages ?? []).filter((x) => !isAsset(x.path)).sort((a, b) => b.bots - a.bots).slice(0, 6).map((x) => ({ key: x.path, label: x.path, value: x.bots, hint: x.top ? `Mostly ${x.top}` : undefined, onClick: () => setTab("pages") }))} />
              </InsightCard>
            </InsightGrid>
          ) : null}
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
                      <tr key={c.category} data-click="" onClick={() => { const pg = (data?.pages ?? []).filter((x) => x.top === c.category); setSel({ title: c.category, subtitle: c.group, fields: [["Requests", fmt(c.requests)], ["Share of bots", t && t.bots ? `${Math.round((c.requests / t.bots) * 1000) / 10}%` : "—"]], itemsTitle: `Pages where it is the top bot · ${pg.length}`, items: pg.map((x) => ({ primary: x.path, secondary: `${fmt(x.bots)} bot requests · ${fmt(x.total)} total` })) }); }}><td>{c.category}</td><td className={p.dim}>{c.group}</td><td className={p.num}>{fmt(c.requests)}</td>
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
      {sel ? <DetailDrawer data={sel} onClose={() => setSel(null)} /> : null}
    </>
  );
}
