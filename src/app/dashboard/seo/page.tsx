import Link from "next/link";
import { ArrowUpRight, Globe, ScanSearch } from "lucide-react";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/dashboard/topbar";
import { EmptyState } from "@/components/dashboard/ui";
import { RunAnalysisButton } from "@/components/dashboard/run-analysis-button";
import { BarList, Columns, InsightCard, InsightGrid, KpiStrip, StackBar } from "@/components/dashboard/insights";
import { TONE } from "@/components/dashboard/insights-tokens";
import styles from "@/components/dashboard/ui.module.css";
import s from "./seo.module.css";

/*
 * SEO audit: the results of the latest crawl of one website, as numbers and charts.
 * Everything comes from saved analyses (free to view); "Run analysis" starts a new crawl.
 */

const SEVERITIES = [
  { key: "CRITICAL", label: "Critical", color: TONE.bad },
  { key: "HIGH", label: "High", color: "#ec4899" },
  { key: "MEDIUM", label: "Medium", color: TONE.warn },
  { key: "LOW", label: "Low", color: "#0a84ff" },
] as const;
const RANK: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

const TYPE_LABEL: Record<string, string> = {
  MISSING_TITLE: "Missing title",
  TITLE_TOO_LONG: "Title too long",
  TITLE_TOO_SHORT: "Title too short",
  DUPLICATE_TITLE: "Duplicate title",
  MISSING_META_DESCRIPTION: "Missing meta description",
  META_DESCRIPTION_TOO_LONG: "Meta description too long",
  DUPLICATE_META_DESCRIPTION: "Duplicate meta description",
  MISSING_H1: "Missing H1",
  MULTIPLE_H1: "More than one H1",
  MISSING_CANONICAL: "Missing canonical",
  IMAGE_MISSING_ALT: "Images without alt text",
  THIN_CONTENT: "Thin content",
  MISSING_SCHEMA: "No structured data",
  ORPHAN_PAGE: "Orphan page",
  BROKEN_INTERNAL_LINK: "Broken internal link",
};
const typeLabel = (t: string) => TYPE_LABEL[t] ?? t.toLowerCase().replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
const tone = (n: number | null) => (n === null ? undefined : n >= 80 ? "good" : n >= 50 ? "warn" : "bad");
const path = (u: string | null) => {
  if (!u) return "Whole site";
  try {
    const x = new URL(u);
    return x.pathname === "/" ? "/" : x.pathname.replace(/\/$/, "");
  } catch {
    return u;
  }
};
const ago = (d: Date) => {
  const h = Math.round((Date.now() - d.getTime()) / 36e5);
  return h < 1 ? "just now" : h < 48 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
};

export default async function SeoPage({ searchParams }: { searchParams: Promise<{ websiteId?: string }> }) {
  const user = await requireUser();
  const { websiteId } = await searchParams;
  const membership = await prisma.workspaceMember.findFirst({ where: { userId: user.id }, select: { workspaceId: true } });
  const workspaceId = membership?.workspaceId ?? null;
  const website = workspaceId
    ? await prisma.website.findFirst({
        where: { business: { workspaceId }, ...(websiteId ? { id: websiteId } : {}) },
        orderBy: { createdAt: "asc" },
      })
    : null;

  if (!workspaceId || !website) {
    return (
      <>
        <Topbar title="SEO audit" />
        <div className={styles.pageBody}>
          <EmptyState icon={Globe} title="No websites" description="Add a website to run an audit." actionLabel="Add website" actionHref="/dashboard/add-website" />
        </div>
      </>
    );
  }

  const analyses = await prisma.analysis.findMany({
    where: { websiteId: website.id },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: { id: true, status: true, overallScore: true, technicalScore: true, contentScore: true, structureScore: true, indexabilityScore: true, pagesCount: true, createdAt: true, completedAt: true },
  });
  const latest = analyses.find((a) => a.status === "COMPLETED" || a.overallScore !== null) ?? null;
  const running = analyses[0] && analyses[0] !== latest && analyses[0].status !== "FAILED" ? analyses[0] : null;
  const issues = latest
    ? await prisma.sEOIssue.findMany({
        where: { analysisId: latest.id },
        select: { id: true, type: true, severity: true, pageUrl: true, description: true, recommendation: true },
      })
    : [];
  const host = new URL(website.url).hostname.replace(/^www\./, "");

  const head = (
    <header className={s.head}>
      <div>
        <h1 className={s.title}>SEO audit</h1>
        <p className={s.meta}>
          {host}
          {latest ? ` · last crawl ${ago(latest.completedAt ?? latest.createdAt)} · ${latest.pagesCount ?? 0} pages checked` : " · not crawled yet"}
          {running ? " · a new crawl is running" : ""}
        </p>
      </div>
      <div className={s.actions}>
        {latest ? (
          <Link className={s.button} href={`/dashboard/analysis/${latest.id}`}>
            Full report <ArrowUpRight size={14} />
          </Link>
        ) : null}
        <RunAnalysisButton websiteId={website.id} className={s.primary} label="Run new audit" />
      </div>
    </header>
  );

  if (!latest) {
    return (
      <>
        <Topbar title="SEO audit" websiteSwitcher={{ workspaceId, currentWebsiteId: website.id }} />
        <div className={styles.pageBody}>
          {head}
          <EmptyState icon={ScanSearch} title="No audit yet" description="Run an analysis: Hyprlyx crawls the site and checks titles, descriptions, headings, links, images and structured data on every page." />
        </div>
      </>
    );
  }

  const bySeverity = SEVERITIES.map((sv) => ({ ...sv, value: issues.filter((i) => i.severity.toUpperCase() === sv.key).length }));
  const byType = new Map<string, number>();
  const byPage = new Map<string, number>();
  for (const i of issues) {
    byType.set(i.type, (byType.get(i.type) ?? 0) + 1);
    const p = path(i.pageUrl);
    byPage.set(p, (byPage.get(p) ?? 0) + 1);
  }
  const history = [...analyses].filter((a) => a.overallScore !== null).reverse();
  const prev = history.length > 1 ? history[history.length - 2].overallScore : null;
  const change = latest.overallScore !== null && prev !== null ? latest.overallScore - prev : null;
  const top = [...issues].sort((a, b) => (RANK[a.severity.toUpperCase()] ?? 9) - (RANK[b.severity.toUpperCase()] ?? 9)).slice(0, 25);
  const scoreItems = [
    ["overall", "SEO score", latest.overallScore, change === null ? "first crawl" : `${change >= 0 ? "+" : ""}${change} since last crawl`],
    ["tech", "Technical", latest.technicalScore, "status codes, canonicals, links"],
    ["content", "Content", latest.contentScore, "titles, descriptions, text"],
    ["structure", "Structure", latest.structureScore, "headings, schema, images"],
    ["index", "Indexability", latest.indexabilityScore, "what Google can index"],
  ] as const;

  return (
    <>
      <Topbar title="SEO audit" websiteSwitcher={{ workspaceId, currentWebsiteId: website.id }} />
      <div className={styles.pageBody}>
        {head}

        <KpiStrip
          items={[
            ...scoreItems.map(([key, label, value, sub]) => ({ key, label, value: value ?? "—", sub, tone: tone(value) as "good" | "warn" | "bad" | undefined })),
            { key: "issues", label: "Issues", value: issues.length, sub: `${bySeverity[0].value + bySeverity[1].value} critical or high` },
          ]}
        />

        <InsightGrid>
          <InsightCard title="Issues by severity" meta={`${issues.length} total`}>
            <StackBar unit="issues" parts={bySeverity.map((sv) => ({ key: sv.key, label: sv.label, value: sv.value, color: sv.color }))} />
          </InsightCard>
          <InsightCard title="SEO score over time" meta={`${history.length} ${history.length === 1 ? "crawl" : "crawls"}`}>
            <Columns
              height={110}
              cols={history.map((a) => ({
                key: a.id,
                label: a.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                value: a.overallScore ?? 0,
                color: (a.overallScore ?? 0) >= 80 ? TONE.good : (a.overallScore ?? 0) >= 50 ? TONE.warn : TONE.bad,
              }))}
            />
          </InsightCard>
          <InsightCard title="Pages with most issues">
            <BarList empty="No page-level issues." rows={[...byPage.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([p, n]) => ({ key: p, label: p, value: n }))} />
          </InsightCard>
          <InsightCard title="Most common problems" span={3}>
            <BarList
              empty="No issues found. Nice."
              rows={[...byType.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([t, n]) => {
                  const sev = issues.find((i) => i.type === t)?.severity.toUpperCase() ?? "LOW";
                  return { key: t, label: typeLabel(t), value: n, color: SEVERITIES.find((x) => x.key === sev)?.color };
                })}
            />
          </InsightCard>
        </InsightGrid>

        <section className={s.panel}>
          <header className={s.panelHead}>
            <h2 className={s.panelTitle}>Fix first</h2>
            <span className={s.panelMeta}>most severe {top.length} of {issues.length}</span>
            <Link className={s.panelLink} href={`/dashboard/analysis/${latest.id}`}>All issues and page previews</Link>
          </header>
          {top.length === 0 ? (
            <p className={s.empty}>No issues in the latest crawl.</p>
          ) : (
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Severity</th>
                    <th>Problem</th>
                    <th>Page</th>
                    <th>How to fix</th>
                  </tr>
                </thead>
                <tbody>
                  {top.map((i) => {
                    const sv = SEVERITIES.find((x) => x.key === i.severity.toUpperCase());
                    return (
                      <tr key={i.id}>
                        <td><span className={s.sev} style={{ color: sv?.color }}><i style={{ background: sv?.color }} />{sv?.label ?? i.severity}</span></td>
                        <td className={s.problem}><strong>{typeLabel(i.type)}</strong><span>{i.description}</span></td>
                        <td className={s.page}>{i.pageUrl ? <a href={i.pageUrl} target="_blank" rel="noreferrer">{path(i.pageUrl)}</a> : "Whole site"}</td>
                        <td className={s.fix}>{i.recommendation}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
