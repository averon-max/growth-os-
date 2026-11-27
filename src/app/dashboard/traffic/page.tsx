import Link from "next/link";
import { after } from "next/server";
import { Globe } from "lucide-react";

import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/dashboard/topbar";
import { EmptyState } from "@/components/dashboard/ui";
import ui from "@/components/dashboard/ui.module.css";
import { buildTrafficReport, REPORT_DAYS, type Metric, type ReportDays, type TrafficReport } from "@/lib/traffic/report";
import { refreshCloudflareSite } from "@/lib/traffic/refresh";
import { PAGE_FILTERS, QUERY_FILTERS, change, fmt } from "@/lib/traffic/filters";

import { DailyChart } from "./daily-chart";
import { PagesTable, QueriesTable } from "./report-tables";
import { SyncButton } from "./sync-button";
import { CountryMap } from "@/components/dashboard/country-map";
import { SeriesChart } from "@/components/dashboard/series-chart";
import s from "./traffic.module.css";

export const metadata = { title: "Traffic report — Hyprlyx" };

const shortDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return m < 60 ? `${Math.max(1, m)} min ago` : m < 48 * 60 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} days ago`;
};
const regionName = (() => {
  const names = new Intl.DisplayNames(["en"], { type: "region" });
  return (code: string) => {
    try {
      return names.of(code) ?? code;
    } catch {
      return code;
    }
  };
})();

export default async function TrafficPage({ searchParams }: { searchParams: Promise<{ websiteId?: string; days?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const days = (REPORT_DAYS as readonly number[]).includes(Number(params.days)) ? (Number(params.days) as ReportDays) : 28;

  const membership = await prisma.workspaceMember.findFirst({ where: { userId: user.id }, select: { workspaceId: true }, orderBy: { id: "asc" } });
  const website = membership
    ? await prisma.website.findFirst({
        where: { business: { workspaceId: membership.workspaceId }, ...(params.websiteId ? { id: params.websiteId } : {}) },
        orderBy: { createdAt: "asc" },
        select: { id: true, url: true },
      })
    : null;

  if (!membership || !website) {
    return (
      <>
        <Topbar title="Traffic report" />
        <div className={ui.pageBody}>
          <EmptyState icon={Globe} title="Add a website first" description="The report compares Cloudflare and Search Console for one of your sites." actionLabel="Add Website" actionHref="/dashboard/add-website" />
        </div>
      </>
    );
  }

  const report = await buildTrafficReport({ websiteId: website.id, workspaceId: membership.workspaceId, url: website.url, days });

  // Keep Cloudflare fresh without making anyone wait: if the last sync is old, pull new days after this page is sent.
  const cf = report.cloudflare;
  if (cf.state !== "missing" && Date.now() - new Date(cf.lastSync).getTime() > 6 * 3600_000) {
    after(() => refreshCloudflareSite(website.id).catch((e) => console.warn("[traffic report] background sync", e instanceof Error ? e.message : e)));
  }

  const host = website.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const href = (d: number) => `/dashboard/traffic?websiteId=${website.id}&days=${d}`;
  const insights = buildInsights(report);

  return (
    <>
      <Topbar title="Traffic report" subtitle={host} websiteSwitcher={{ workspaceId: membership.workspaceId, currentWebsiteId: website.id }} />
      <div className={ui.pageBody}>
        <header className={s.head}>
          <div>
            <h1 className={s.title}>Traffic report</h1>
            <p className={s.sub}>
              {shortDate(report.range.start)} – {shortDate(report.range.end)}, compared with the {days} days before
            </p>
          </div>
          <nav className={s.periods} aria-label="Period">
            {REPORT_DAYS.map((d) => (
              <Link key={d} href={href(d)} className={d === days ? s.periodOn : s.period} aria-current={d === days ? "page" : undefined} prefetch={false}>
                {d} days
              </Link>
            ))}
          </nav>
        </header>

        <Sources report={report} websiteId={website.id} />

        {insights.summary ? <p className={s.summary}>{insights.summary}</p> : null}

        <div className={s.cards}>
          {([
            { label: "Google clicks", m: report.totals.clicks, show: fmt.n, href: "#daily" },
            { label: "Impressions", m: report.totals.impressions, show: fmt.compact, href: "#daily" },
            { label: "CTR", m: report.totals.ctr, show: (v: number) => fmt.pct(v), kind: "rate", href: "#pages" },
            { label: "Avg. position", m: report.totals.position, show: fmt.pos, kind: "position", href: "#pages" },
            { label: "Visitors", m: report.totals.visitors, show: fmt.compact, href: "#daily", hint: "Unique visitors per day, added up" },
            { label: "Requests", m: report.totals.requests, show: fmt.compact, href: "#pages" },
            { label: "Verified bots", m: report.totals.botShare, show: (v: number) => fmt.pct(v), kind: "rate", neutral: true, href: "/dashboard/bots", hint: "Share of requests from search engines and other verified crawlers" },
          ] as Card[]).map((k) => {
            const c = k.m ? change(k.m.now, k.m.before, k.kind) : null;
            return (
              <a key={k.label} href={k.href} className={s.card} title={k.hint}>
                <span className={s.cardLabel}>{k.label}</span>
                <span className={s.cardValue}>{k.m ? k.show(k.m.now) : "—"}</span>
                <span className={c ? (k.neutral ? s.flat : s[c.tone]) : s.flat}>{c ? c.text : k.m ? "no earlier data" : "not connected"}</span>
              </a>
            );
          })}
        </div>

        {insights.items.length ? (
          <section className={s.panel}>
            <div className={s.panelHead}>
              <h2 className={s.panelTitle}>Worth a look</h2>
            </div>
            <ul className={s.insights}>
              {insights.items.map((i) => (
                <li key={i.key}>
                  <span className={s.insightCount}>{i.count}</span>
                  <span className={s.insightText}>{i.text}</span>
                  <a href={i.href} className={s.insightLink}>
                    Show
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <DailyChart now={report.daily.now} before={report.daily.before} days={days} />

        <PagesTable rows={report.pages} host={website.url} hasCloudflare={report.cloudflare.state === "ok"} hasGoogle={report.google.state === "ok"} />

        {report.google.state === "ok" ? <QueriesTable rows={report.queries} /> : null}

        <section className={s.panel} id="countries">
          <div className={s.panelHead}>
            <h2 className={s.panelTitle}>Countries</h2>
            <span className={s.panelHint}>last {days} days</span>
          </div>
          <CountryMap rows={report.countries} daily={days === 28 ? report.series.countries : undefined} />
        </section>

        <SeriesChart
          title="Visits by country"
          description="Share of each day's Cloudflare visits by country."
          days={report.series.countries}
          labels={Object.fromEntries(report.series.countries.flatMap((d) => Object.keys(d.values)).map((code) => [code, regionName(code)]))}
          unit="visits"
        />
        <SeriesChart title="Top pages" description="Share of each day's visits among the most visited pages." days={report.series.pages} unit="visits" initialMode="lines" />
        <SeriesChart title="Crawlers" description="Requests from verified bots each day, by category (search engines, AI crawlers, monitors)." days={report.series.bots} unit="bot requests" />

        <div className={s.split}>
          <section className={s.panel} id="devices">
            <div className={s.panelHead}>
              <h2 className={s.panelTitle}>Devices</h2>
              <span className={s.panelHint}>Share of each source</span>
            </div>
            <Shares
              rows={report.devices.map((d) => ({ key: d.device, label: d.device.charAt(0).toUpperCase() + d.device.slice(1), a: d.visits, b: d.clicks }))}
              aLabel="Visits"
              bLabel="Google clicks"
            />
          </section>
          <section className={s.panel} id="google-countries">
            <div className={s.panelHead}>
              <h2 className={s.panelTitle}>Countries in Google</h2>
              <span className={s.panelHint}>Cloudflare visits vs. Google clicks</span>
            </div>
            <Shares
              rows={report.countries.slice(0, 8).map((c) => ({ key: c.code, label: regionName(c.code), a: c.visits, b: c.clicks }))}
              aLabel="Visits"
              bLabel="Google clicks"
            />
          </section>
        </div>

        <p className={s.footnote}>
          Cloudflare counts every visit to the site, including direct, social and other search engines. Search Console counts only Google Search and leaves out
          rare queries it keeps private, so query totals can be lower than the click total. Google&rsquo;s last 1–2 days are still being filled in.
        </p>
      </div>
    </>
  );
}

function Sources({ report, websiteId }: { report: TrafficReport; websiteId: string }) {
  const cf = report.cloudflare;
  const g = report.google;
  return (
    <div className={s.sources}>
      <div className={s.source}>
                <span className={s.sourceName}>Cloudflare</span>
        {cf.state === "missing" ? (
          <>
            <span className={s.sourceText}>Not connected</span>
            <Link href="/dashboard/settings#cloudflare" className={s.sourceAction}>
              Connect
            </Link>
          </>
        ) : cf.state === "empty" ? (
          <>
            <span className={s.sourceText}>Connected, no data yet</span>
            <SyncButton websiteId={websiteId} label="Load data" />
          </>
        ) : (
          <>
            <span className={s.sourceText}>
              Data to {shortDate(cf.dataTo)} · synced {ago(cf.lastSync)}
              {cf.daysBefore < report.days - 1 ? " · previous period not fully synced yet" : ""}
            </span>
            <SyncButton websiteId={websiteId} label="Sync now" quiet />
          </>
        )}
      </div>
      <div className={s.source}>
                <span className={s.sourceName}>Search Console</span>
        {g.state === "ok" ? (
          <span className={s.sourceText}>Connected</span>
        ) : g.state === "missing" ? (
          <>
            <span className={s.sourceText}>Not connected</span>
            <a href={g.connectUrl} className={s.sourceAction}>
              Connect
            </a>
          </>
        ) : (
          <>
            <span className={s.sourceText}>{g.message}</span>
            <a href={g.connectUrl} className={s.sourceAction}>
              Reconnect
            </a>
          </>
        )}
      </div>
    </div>
  );
}

type Card = { label: string; m: Metric | null; show: (v: number) => string; kind?: "count" | "rate" | "position"; neutral?: boolean; hint?: string; href: string };

function Shares({ rows, aLabel, bLabel }: { rows: { key: string; label: string; a: number; b: number | null }[]; aLabel: string; bLabel: string }) {
  const aTotal = rows.reduce((x, r) => x + r.a, 0);
  const hasB = rows.some((r) => r.b !== null);
  const bTotal = rows.reduce((x, r) => x + (r.b ?? 0), 0);
  if (!rows.length) return <p className={s.empty}>No data for this period yet.</p>;
  return (
    <div className={s.shares}>
      <div className={s.shareLegend}>
        <span>
          <i className={s.swatchA} /> {aLabel}
        </span>
        {hasB ? (
          <span>
            <i className={s.swatchB} /> {bLabel}
          </span>
        ) : null}
      </div>
      {rows.map((r) => {
        const pa = aTotal ? r.a / aTotal : 0;
        const pb = bTotal && r.b !== null ? r.b / bTotal : 0;
        return (
          <div key={r.key} className={s.share} title={`${r.label}: ${fmt.n(r.a)} ${aLabel.toLowerCase()}${hasB ? `, ${fmt.n(r.b ?? 0)} ${bLabel.toLowerCase()}` : ""}`}>
            <span className={s.shareName}>{r.label}</span>
            <span className={s.shareBars}>
              <span className={s.barA} style={{ width: `${pa * 100}%` }} />
              {hasB ? <span className={s.barB} style={{ width: `${pb * 100}%` }} /> : null}
            </span>
            <span className={s.shareNums}>
              {fmt.pct(pa, 0)}
              {hasB ? <em>{fmt.pct(pb, 0)}</em> : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function buildInsights(r: TrafficReport) {
  const items: { key: string; count: number; text: string; href: string }[] = [];
  const add = (key: string, count: number, text: string, href: string) => {
    if (count > 0) items.push({ key, count, text, href });
  };
  const pages = (f: keyof typeof PAGE_FILTERS) => r.pages.filter(PAGE_FILTERS[f].test).length;
  const queries = (f: keyof typeof QUERY_FILTERS) => r.queries.filter(QUERY_FILTERS[f].test).length;

  add("losing", pages("losing"), "pages lost at least 30% of their visits or Google clicks.", "#pages-losing");
  add("almost", queries("almost"), "queries rank on page 2 (positions 9–20). A better page could move them to page 1.", "#queries-almost");
  add("lowCtr", pages("lowCtr"), "pages show up on Google page 1 but get under half the usual clicks. Rewrite their title and description.", "#pages-lowCtr");
  add("noGoogle", r.google.state === "ok" ? pages("noGoogle") : 0, "pages get visits but no clicks from Google. They may need search-focused content or internal links.", "#pages-noGoogle");
  add("growing", pages("growing"), "pages grew by at least 30%. See what they have in common.", "#pages-growing");

  // One plain sentence on the period.
  const parts: string[] = [];
  const t = r.totals;
  const say = (m: Metric | null, noun: string) => {
    if (!m) return;
    const c = change(m.now, m.before);
    parts.push(`${noun === "Google clicks" ? "Google sent" : "Cloudflare saw"} ${fmt.n(m.now)} ${noun === "Google clicks" ? "clicks" : "visitors"}${c && c.tone !== "flat" ? ` (${c.text} vs. the ${r.days} days before)` : ""}`);
  };
  say(t.clicks, "Google clicks");
  say(t.visitors, "visitors");
  let summary = parts.length ? `${parts.join(". ")}.` : "";
  if (t.clicks && t.visitors && t.visitors.now > 0) {
    summary += ` Google clicks equal about ${fmt.pct(Math.min(1, t.clicks.now / t.visitors.now), 0)} of the visitor count.`;
  }
  return { items, summary: summary.trim() };
}
