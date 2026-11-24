import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Check, Globe, ScanSearch } from "lucide-react";

import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/dashboard/topbar";
import { EmptyState } from "@/components/dashboard/ui";
import ui from "@/components/dashboard/ui.module.css";
import { buildTrafficReport, type DayPoint, type Metric } from "@/lib/traffic/report";
import { change, fmt } from "@/lib/traffic/filters";

import s from "./overview.module.css";

export const metadata = { title: "Overview — Hyprlyx" };

const host = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");
const ago = (d: Date) => {
  const m = Math.round((Date.now() - d.getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (m < 48 * 60) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
};
const STATUS: Record<string, { label: string; tone: "ok" | "busy" | "bad" }> = {
  COMPLETED: { label: "Ready", tone: "ok" },
  QUEUED: { label: "Queued", tone: "busy" },
  RUNNING: { label: "Scanning", tone: "busy" },
  FAILED: { label: "Error", tone: "bad" },
};
/** Website screenshot from WordPress.com's public mShots service, served through Next.js as WebP/AVIF. */
const shot = (url: string, version: string) => `https://s.wordpress.com/mshots/v1/${encodeURIComponent(url)}?w=1280&h=800&v=${version}`;

export default async function DashboardOverview({ searchParams }: { searchParams: Promise<{ websiteId?: string }> }) {
  const user = await requireUser();
  const { websiteId } = await searchParams;
  const membership = await prisma.workspaceMember.findFirst({ where: { userId: user.id }, select: { workspaceId: true }, orderBy: { id: "asc" } });

  const websites = membership
    ? await prisma.website.findMany({
        where: { business: { workspaceId: membership.workspaceId } },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          url: true,
          createdAt: true,
          business: { select: { name: true } },
          analyses: { orderBy: { createdAt: "desc" }, take: 1, select: { id: true, status: true, overallScore: true, pagesCount: true, completedAt: true, createdAt: true } },
          cmsConnection: { select: { cmsType: true, status: true } },
          cloudflareConnection: { select: { id: true } },
        },
      })
    : [];

  if (!membership || websites.length === 0) {
    return (
      <>
        <Topbar title="Overview" />
        <div className={ui.pageBody}>
          <EmptyState icon={Globe} title="Add your first website" description="Hyprlyx audits the site, tracks its keywords and connects its traffic." actionLabel="Add website" actionHref="/dashboard/add-website" />
        </div>
      </>
    );
  }

  const site = websites.find((w) => w.id === websiteId) ?? websites[0];
  const analysis = site.analyses[0] ?? null;
  const analysisIds = websites.map((w) => w.analyses[0]?.id).filter((v): v is string => Boolean(v));

  const [gsc, keywordCount, issueRows, report] = await Promise.all([
    prisma.providerConnection.findUnique({
      where: { workspaceId_provider: { workspaceId: membership.workspaceId, provider: "GOOGLE_SEARCH_CONSOLE" } },
      select: { status: true },
    }),
    prisma.keyword.count({ where: { workspaceId: membership.workspaceId } }),
    analysisIds.length
      ? prisma.sEOIssue.groupBy({ by: ["analysisId", "severity"], where: { analysisId: { in: analysisIds } }, _count: { _all: true } })
      : Promise.resolve([] as { analysisId: string; severity: string; _count: { _all: number } }[]),
    buildTrafficReport({ websiteId: site.id, workspaceId: membership.workspaceId, url: site.url, days: 28 }).catch(() => null),
  ]);

  const issues = (id: string | undefined, severity?: string) =>
    issueRows.filter((r) => r.analysisId === id && (!severity || r.severity === severity)).reduce((a, r) => a + r._count._all, 0);
  const status = analysis ? (STATUS[analysis.status] ?? { label: analysis.status, tone: "busy" as const }) : null;
  const critical = issues(analysis?.id, "CRITICAL");
  const gscOn = gsc?.status === "CONNECTED";
  const cfOn = Boolean(site.cloudflareConnection);
  const cmsOn = site.cmsConnection?.status === "CONNECTED";
  const q = `?websiteId=${site.id}`;

  const steps = [
    { done: true, label: "Add website", href: "/dashboard/websites" },
    { done: Boolean(analysis), label: "Run the first SEO audit", href: `/dashboard/seo${q}` },
    { done: gscOn, label: "Connect Search Console", href: "/dashboard/settings" },
    { done: cfOn, label: "Connect Cloudflare", href: "/dashboard/settings#cloudflare" },
    { done: keywordCount > 0, label: "Track keywords", href: `/dashboard/keyword-planner${q}` },
    { done: cmsOn, label: "Connect a CMS for publishing", href: `/dashboard/cms${q}` },
  ];
  const doneCount = steps.filter((x) => x.done).length;
  const version = (analysis?.completedAt ?? analysis?.createdAt ?? site.createdAt).toISOString().slice(0, 10);

  return (
    <>
      <Topbar title="Overview" websiteSwitcher={{ workspaceId: membership.workspaceId, currentWebsiteId: site.id }} />
      <div className={ui.pageBody}>
        <section className={s.card}>
          <header className={s.cardHead}>
            <h2 className={s.cardTitle}>Website</h2>
            <div className={s.actions}>
              <Link href={`/dashboard/seo${q}`} className={s.button}>
                <ScanSearch size={16} strokeWidth={1.6} aria-hidden /> SEO audit
              </Link>
              <a href={site.url} target="_blank" rel="noreferrer" className={s.buttonPrimary}>
                Visit <ArrowUpRight size={14} strokeWidth={1.8} aria-hidden />
              </a>
            </div>
          </header>

          <div className={s.deploy}>
            <a href={site.url} target="_blank" rel="noreferrer" className={s.preview} aria-label={`Open ${host(site.url)} in a new tab`}>
              <Image src={shot(site.url, version)} alt={`Screenshot of ${host(site.url)}`} width={1280} height={800} sizes="(max-width: 900px) 100vw, 520px" quality={75} className={s.previewImg} />
            </a>

            <dl className={s.facts}>
              <div>
                <dt>Website</dt>
                <dd>
                  <span className={s.strong}>{site.business.name}</span>
                </dd>
              </div>
              <div>
                <dt>Domain</dt>
                <dd>
                  <a href={site.url} target="_blank" rel="noreferrer" className={s.link}>
                    {host(site.url)} <ArrowUpRight size={14} strokeWidth={1.8} aria-hidden />
                  </a>
                </dd>
              </div>
              <div className={s.factRow}>
                <div>
                  <dt>Status</dt>
                  <dd>
                    {status ? (
                      <span className={s.status}>
                        <i className={s[status.tone]} aria-hidden /> {status.label}
                      </span>
                    ) : (
                      <span className={s.muted}>Not audited yet</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>SEO score</dt>
                  <dd className={s.strong}>{analysis?.overallScore ?? "—"}</dd>
                </div>
                <div>
                  <dt>Last audit</dt>
                  <dd>{analysis ? ago(analysis.completedAt ?? analysis.createdAt) : "—"}</dd>
                </div>
              </div>
              <div>
                <dt>Connections</dt>
                <dd className={s.chips}>
                  <Conn on={gscOn} label="Search Console" />
                  <Conn on={cfOn} label="Cloudflare" />
                  <Conn on={cmsOn} label={site.cmsConnection ? cmsName(site.cmsConnection.cmsType) : "CMS"} />
                </dd>
              </div>
            </dl>
          </div>

          {analysis ? (
            <Link href={`/dashboard/analysis/${analysis.id}`} className={s.cardFoot}>
              <span className={s.status}>
                <i className={critical ? s.bad : s.ok} aria-hidden /> {critical ? `${critical} critical issue${critical === 1 ? "" : "s"}` : "No critical issues"}
              </span>
              <span className={s.muted}>
                {issues(analysis.id)} issues in total{analysis.pagesCount ? ` · ${analysis.pagesCount} pages checked` : ""}
              </span>
              <span className={s.footLink}>
                Open report <ArrowUpRight size={14} strokeWidth={1.8} aria-hidden />
              </span>
            </Link>
          ) : null}
        </section>

        <div className={s.grid}>
          <section className={s.panel}>
            <header className={s.panelHead}>
              <h2 className={s.panelTitle}>Setup</h2>
              <span className={s.count}>
                {doneCount}/{steps.length}
              </span>
            </header>
            <ul className={s.steps}>
              {steps.map((step) => (
                <li key={step.label}>
                  <Link href={step.href} className={s.step} data-done={step.done || undefined}>
                    <span className={s.stepIcon} aria-hidden>
                      {step.done ? <Check size={12} strokeWidth={2.4} /> : null}
                    </span>
                    <span>{step.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className={s.panel}>
            <header className={s.panelHead}>
              <Link href={`/dashboard/traffic${q}`} className={s.panelTitleLink}>
                Google Search <span className={s.muted}>28d</span>
              </Link>
            </header>
            {report?.google.state === "ok" ? (
              <div className={s.metrics}>
                <MetricRow label="Clicks" m={report.totals.clicks} values={report.daily.now.map((d) => d.clicks)} color="var(--ds-chart-1)" show={fmt.n} />
                <MetricRow label="Impressions" m={report.totals.impressions} values={report.daily.now.map((d) => d.impressions)} color="var(--ds-chart-1)" show={fmt.compact} />
                <MetricRow label="Avg. position" m={report.totals.position} show={fmt.pos} kind="position" />
              </div>
            ) : (
              <ConnectPrompt text="See clicks, impressions and positions from Google." href={report?.google.state === "missing" || report?.google.state === "error" ? report.google.connectUrl : "/dashboard/settings"} action={report?.google.state === "error" ? "Reconnect Search Console" : "Connect Search Console"} />
            )}
          </section>

          <section className={s.panel}>
            <header className={s.panelHead}>
              <Link href={`/dashboard/traffic${q}`} className={s.panelTitleLink}>
                Traffic <span className={s.muted}>28d</span>
              </Link>
            </header>
            {report?.cloudflare.state === "ok" ? (
              <div className={s.metrics}>
                <MetricRow label="Visitors" m={report.totals.visitors} values={report.daily.now.map((d: DayPoint) => d.visitors)} color="var(--ds-chart-2)" show={fmt.compact} />
                <MetricRow label="Requests" m={report.totals.requests} show={fmt.compact} />
                <MetricRow label="Verified bots" m={report.totals.botShare} show={(v) => fmt.pct(v)} kind="rate" neutral />
              </div>
            ) : (
              <ConnectPrompt text="See every visit, country and crawler from Cloudflare." href="/dashboard/settings#cloudflare" action={report?.cloudflare.state === "empty" ? "Load Cloudflare data" : "Connect Cloudflare"} />
            )}
          </section>
        </div>

        <section className={s.listCard}>
          <header className={s.cardHead}>
            <h2 className={s.cardTitle}>Websites</h2>
            <Link href="/dashboard/add-website" className={s.button}>
              Add website
            </Link>
          </header>
          <ul className={s.list}>
            {websites.map((w) => {
              const a = w.analyses[0];
              const st = a ? (STATUS[a.status] ?? { label: a.status, tone: "busy" as const }) : null;
              return (
                <li key={w.id}>
                  <Link href={`/dashboard?websiteId=${w.id}`} className={s.row} data-active={w.id === site.id || undefined}>
                    <img src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host(w.url))}&sz=32`} alt="" width={16} height={16} className={s.favicon} />
                    <span className={s.rowName}>{host(w.url)}</span>
                    <span className={s.rowCell}>{st ? <span className={s.status}><i className={s[st.tone]} aria-hidden /> {st.label}</span> : <span className={s.muted}>No audit</span>}</span>
                    <span className={s.rowCell}>Score {a?.overallScore ?? "—"}</span>
                    <span className={s.rowCell}>{issues(a?.id, "CRITICAL")} critical</span>
                    <span className={s.rowMeta}>{a ? ago(a.completedAt ?? a.createdAt) : ago(w.createdAt)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </>
  );
}

function cmsName(t: string) {
  return t.charAt(0) + t.slice(1).toLowerCase();
}

function Conn({ on, label }: { on: boolean; label: string }) {
  return (
    <span className={s.chip} data-on={on || undefined} title={on ? `${label} connected` : `${label} not connected`}>
      <i className={on ? s.ok : s.off} aria-hidden /> {label}
    </span>
  );
}

function ConnectPrompt({ text, href, action }: { text: string; href: string; action: string }) {
  return (
    <div className={s.prompt}>
      <p>{text}</p>
      <a href={href} className={s.button}>
        {action}
      </a>
    </div>
  );
}

function MetricRow({ label, m, values, color, show, kind, neutral }: { label: string; m: Metric | null; values?: (number | null)[]; color?: string; show: (v: number) => string; kind?: "count" | "rate" | "position"; neutral?: boolean }) {
  const c = m ? change(m.now, m.before, kind) : null;
  return (
    <div className={s.metric}>
      <div>
        <div className={s.metricLabel}>{label}</div>
        <div className={s.metricValue}>
          {m ? show(m.now) : "—"}
          {c && c.tone !== "flat" ? <span className={neutral ? s.flat : s[c.tone]}>{c.text}</span> : null}
        </div>
      </div>
      {values && color ? <Spark values={values} color={color} /> : null}
    </div>
  );
}

/** Small trend line, no axes: shape only, the number is next to it. */
function Spark({ values, color }: { values: (number | null)[]; color: string }) {
  const w = 160;
  const h = 36;
  const v = values.map((x) => x ?? 0);
  const max = Math.max(1, ...v);
  const pts = v.map((x, i) => `${((i / Math.max(1, v.length - 1)) * w).toFixed(1)},${(h - 2 - (x / max) * (h - 4)).toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className={s.spark} aria-hidden>
      <line x1={0} x2={w} y1={h - 1} y2={h - 1} stroke="var(--ds-gray-400)" strokeWidth={1} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
