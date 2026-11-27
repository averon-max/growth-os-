"use client";

import Link from "next/link";
import { ArrowUpRight, Check, ScanSearch } from "lucide-react";
import type { TrafficReport, Metric } from "@/lib/traffic/report";
import { change, fmt } from "@/lib/traffic/filters";
import { SitePreview } from "../site-preview";
import { DotMap } from "../dot-map";
import { SeriesChart } from "../series-chart";
import { BarList, StackBar } from "../insights";
import { SEVERITY } from "../insights-tokens";
import type { WidgetType } from "./layout";
import s from "./board.module.css";

/* Everything a widget can show. Built once on the server from saved data: no widget pays for anything. */
export type BoardData = {
  site: { id: string; url: string; host: string; name: string };
  analysis: { id: string; status: string; score: number | null; pages: number | null; when: string | null; version: string } | null;
  severity: { critical: number; high: number; medium: number; low: number };
  gscOn: boolean;
  cfOn: boolean;
  steps: { label: string; href: string; done: boolean }[];
  websites: { id: string; host: string; score: number | null; status: string | null; critical: number; when: string }[];
  report: TrafficReport | null;
  keywords: { keyword: string; volume: number | null; position: number | null; clicks: number }[];
  articles: { id: string; title: string; keyword: string; status: string; when: string }[];
};

const regionName = (() => {
  let names: Intl.DisplayNames | null = null;
  return (code: string) => {
    try {
      names ??= new Intl.DisplayNames(["en"], { type: "region" });
      return names.of(code) ?? code;
    } catch {
      return code;
    }
  };
})();

const STATUS: Record<string, string> = { COMPLETED: "Ready", QUEUED: "Queued", RUNNING: "Scanning", FAILED: "Error" };

function Spark({ values, color }: { values: (number | null)[]; color: string }) {
  const w = 120;
  const h = 32;
  const v = values.map((x) => x ?? 0);
  const max = Math.max(1, ...v);
  const pts = v.map((x, i) => `${((i / Math.max(1, v.length - 1)) * w).toFixed(1)},${(h - 2 - (x / max) * (h - 4)).toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className={s.spark}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" />
    </svg>
  );
}

function MetricRow({ label, m, values, color, show, kind }: { label: string; m: Metric | null; values?: (number | null)[]; color?: string; show: (v: number) => string; kind?: "count" | "rate" | "position" }) {
  const c = m ? change(m.now, m.before, kind) : null;
  return (
    <div className={s.metric}>
      <div>
        <div className={s.metricLabel}>{label}</div>
        <div className={s.metricValue}>
          {m ? show(m.now) : "—"}
          {c && c.tone !== "flat" ? <span className={s[c.tone]}>{c.text}</span> : null}
        </div>
      </div>
      {values && color ? <Spark values={values} color={color} /> : null}
    </div>
  );
}

function Empty({ text, href, action }: { text: string; href: string; action: string }) {
  return (
    <div className={s.empty}>
      <p>{text}</p>
      <a href={href} className={s.button}>{action}</a>
    </div>
  );
}

/** The body of one widget. The board draws the frame, title and handles around it. */
export function WidgetBody({ type, d, w = 6 }: { type: WidgetType; d: BoardData; w?: number }) {
  const wide = w >= 8;
  const q = `?websiteId=${d.site.id}`;
  const r = d.report;
  switch (type) {
    case "site":
      return (
        <div className={s.site}>
          <a href={d.site.url} target="_blank" rel="noreferrer" className={s.preview} aria-label={`Open ${d.site.host}`}>
            <SitePreview url={d.site.url} version={d.analysis?.version ?? "1"} className={s.previewImg} />
          </a>
          <div className={s.siteFoot}>
            <span className={s.siteHost}>{d.site.host}</span>
            <span className={s.muted}>{d.analysis ? `${STATUS[d.analysis.status] ?? d.analysis.status} · score ${d.analysis.score ?? "—"}` : "Not audited yet"}</span>
            <span className={s.siteActions}>
              <Link href={`/dashboard/seo${q}`} className={s.button}><ScanSearch size={14} /> SEO audit</Link>
              <a href={d.site.url} target="_blank" rel="noreferrer" className={s.primary}>Visit <ArrowUpRight size={14} /></a>
            </span>
          </div>
        </div>
      );
    case "seo": {
      const total = d.severity.critical + d.severity.high + d.severity.medium + d.severity.low;
      return (
        <div className={s.seo}>
          <div className={s.seoTop}>
            <Link href={`/dashboard/seo${q}`} className={s.bigLink}>
              <span className={s.big} data-tone={d.analysis?.score == null ? undefined : d.analysis.score >= 80 ? "good" : d.analysis.score >= 50 ? "warn" : "bad"}>{d.analysis?.score ?? "—"}</span>
              <span className={s.muted}>SEO score</span>
            </Link>
            <div className={s.seoFacts}>
              <span><strong>{total}</strong> issues</span>
              <span><strong>{d.analysis?.pages ?? 0}</strong> pages checked</span>
              <span className={s.muted}>{d.analysis?.when ?? "never audited"}</span>
            </div>
          </div>
          <StackBar
            unit="issues"
            parts={[
              { key: "c", label: "Critical", value: d.severity.critical, color: SEVERITY.critical },
              { key: "h", label: "High", value: d.severity.high, color: SEVERITY.high },
              { key: "m", label: "Medium", value: d.severity.medium, color: SEVERITY.medium },
              { key: "l", label: "Low", value: d.severity.low, color: SEVERITY.low },
            ]}
          />
        </div>
      );
    }
    case "google":
      return r?.google.state === "ok" ? (
        <div className={s.metrics}>
          <MetricRow label="Clicks" m={r.totals.clicks} values={r.daily.now.map((x) => x.clicks)} color="#f5a623" show={fmt.n} />
          <MetricRow label="Impressions" m={r.totals.impressions} values={r.daily.now.map((x) => x.impressions)} color="#0090ff" show={fmt.compact} />
          <MetricRow label="Avg. position" m={r.totals.position} show={fmt.pos} kind="position" />
        </div>
      ) : (
        <Empty text="See clicks, impressions and positions from Google." href="/dashboard/settings" action="Connect Search Console" />
      );
    case "traffic":
      return r?.cloudflare.state === "ok" ? (
        <div className={s.metrics}>
          <MetricRow label="Visitors" m={r.totals.visitors} values={r.daily.now.map((x) => x.visitors)} color="#12a594" show={fmt.compact} />
          <MetricRow label="Requests" m={r.totals.requests} show={fmt.compact} />
          <MetricRow label="Verified bots" m={r.totals.botShare} show={(v) => fmt.pct(v)} kind="rate" />
        </div>
      ) : (
        <Empty text="See every visit, country and crawler from Cloudflare." href="/dashboard/settings#cloudflare" action="Connect Cloudflare" />
      );
    case "map":
      return r && r.countries.length ? (
        <DotMap fill withList={wide} limit={12} rows={r.countries.map((c) => ({ code: c.code, label: regionName(c.code), value: c.visits }))} unit="visits" />
      ) : (
        <Empty text="Countries appear once Cloudflare traffic is loaded." href="/dashboard/settings#cloudflare" action="Connect Cloudflare" />
      );
    case "crawlers":
      return r && r.series.bots.length ? (
        <SeriesChart compact title="" description="" days={r.series.bots} unit="bot requests" />
      ) : (
        <Empty text="Crawler activity appears once Cloudflare traffic is loaded." href="/dashboard/settings#cloudflare" action="Connect Cloudflare" />
      );
    case "countries":
      return r && r.series.countries.length ? (
        <SeriesChart
          compact
          title=""
          description=""
          days={r.series.countries}
          labels={Object.fromEntries(r.series.countries.flatMap((x) => Object.keys(x.values)).map((code) => [code, regionName(code)]))}
          unit="visits"
        />
      ) : (
        <Empty text="Daily countries appear once Cloudflare traffic is loaded." href="/dashboard/settings#cloudflare" action="Connect Cloudflare" />
      );
    case "pages":
      return (
        <BarList
          unit="visits"
          empty="No page visits yet."
          rows={(r?.pages ?? []).filter((p) => (p.visits ?? 0) > 0).sort((a, b) => (b.visits ?? 0) - (a.visits ?? 0)).slice(0, 8).map((p) => ({ key: p.path, label: p.path, value: p.visits ?? 0 }))}
        />
      );
    case "setup": {
      const done = d.steps.filter((x) => x.done).length;
      return (
        <div className={s.setup}>
          <div className={s.setupHead}>
            <span>{done === d.steps.length ? "Everything is connected" : `${done} of ${d.steps.length} done`}</span>
            <div className={s.setupBar}><span style={{ width: `${(done / Math.max(1, d.steps.length)) * 100}%` }} /></div>
          </div>
          <ul className={s.steps}>
            {d.steps.map((x) => (
              <li key={x.label}>
                <Link href={x.href} className={s.step} data-done={x.done || undefined}>
                  {x.done ? <Check size={14} className={s.stepCheck} /> : <span className={s.stepDot} />}
                  {x.label}
                  <ArrowUpRight size={14} className={s.stepArrow} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    case "keywords":
      return d.keywords.length === 0 ? (
        <Empty text="Add keywords or analyze the site in the Keyword Planner." href={`/dashboard/keyword-planner${q}`} action="Open Keyword Planner" />
      ) : (
        <table className={s.table}>
          <thead><tr><th>Keyword</th><th>Volume</th><th>Position</th></tr></thead>
          <tbody>
            {d.keywords.map((k) => (
              <tr key={k.keyword}>
                <td><Link href={`/dashboard/keyword-planner${q}`}>{k.keyword}</Link></td>
                <td>{k.volume == null ? "—" : fmt.compact(k.volume)}</td>
                <td>{k.position == null ? "—" : k.position.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    case "articles":
      return d.articles.length === 0 ? (
        <Empty text="No articles yet." href={`/dashboard/content${q}`} action="Write an article" />
      ) : (
        <ul className={s.sites}>
          {d.articles.map((a) => (
            <li key={a.id}>
              <Link href={`/dashboard/content/articles/${a.id}`} className={s.listRow}>
                <span className={s.listMain}><span className={s.siteRowName}>{a.title}</span><span className={s.muted}>{a.keyword}</span></span>
                <span className={s.muted}>{a.status.toLowerCase().replace(/_/g, " ")} · {a.when}</span>
              </Link>
            </li>
          ))}
        </ul>
      );
    case "queries":
      return r && r.queries.length ? (
        <table className={s.table}>
          <thead><tr><th>Query</th><th>Clicks</th><th>Impr.</th><th>Pos.</th></tr></thead>
          <tbody>
            {[...r.queries].sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions).slice(0, 10).map((x) => (
              <tr key={x.query}>
                <td>{x.query}</td>
                <td>{fmt.n(x.clicks)}</td>
                <td>{fmt.compact(x.impressions)}</td>
                <td>{x.position.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <Empty text="Search queries appear once Search Console has data." href="/dashboard/settings" action="Connect Search Console" />
      );
    case "websites":
      return (
        <ul className={s.sites}>
          {d.websites.map((w) => (
            <li key={w.id}>
              <Link href={`/dashboard?websiteId=${w.id}`} className={s.siteRow} data-active={w.id === d.site.id || undefined}>
                <img src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(w.host)}&sz=32`} alt="" width={16} height={16} />
                <span className={s.siteRowName}>{w.host}</span>
                <span className={s.muted}>{w.status ? STATUS[w.status] ?? w.status : "No audit"}</span>
                <span>Score {w.score ?? "—"}</span>
                <span className={s.muted}>{w.critical} critical</span>
                <span className={s.muted}>{w.when}</span>
              </Link>
            </li>
          ))}
        </ul>
      );
  }
}
