import { Globe } from "lucide-react";

import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/dashboard/topbar";
import { EmptyState } from "@/components/dashboard/ui";
import { Board } from "@/components/dashboard/board/board";
import type { BoardData } from "@/components/dashboard/board/widgets";
import { DEFAULT_LAYOUT, sanitize } from "@/components/dashboard/board/layout";
import ui from "@/components/dashboard/ui.module.css";
import { buildTrafficReport } from "@/lib/traffic/report";


export const metadata = { title: "Overview — Hyprlyx" };

const host = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");
const ago = (d: Date) => {
  const m = Math.round((Date.now() - d.getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (m < 48 * 60) return `${Math.round(m / 60)}h ago`;
  return `${Math.round(m / 1440)}d ago`;
};

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
  const critical = issues(analysis?.id, "CRITICAL");
  const gscOn = gsc?.status === "CONNECTED";
  const cfOn = Boolean(site.cloudflareConnection);
  const q = `?websiteId=${site.id}`;

  const steps = [
    { done: true, label: "Add website", href: "/dashboard/websites" },
    { done: Boolean(analysis), label: "Run the first SEO audit", href: `/dashboard/seo${q}` },
    { done: gscOn, label: "Connect Search Console", href: "/dashboard/settings" },
    { done: cfOn, label: "Connect Cloudflare", href: "/dashboard/settings#cloudflare" },
    { done: keywordCount > 0, label: "Track keywords", href: `/dashboard/keyword-planner${q}` },
  ];
  const version = (analysis?.completedAt ?? analysis?.createdAt ?? site.createdAt).toISOString().slice(0, 10);

  const saved = await prisma.appSetting.findUnique({ where: { key: `board:${user.id}` } }).catch(() => null);
  const layout = sanitize(saved?.value) ?? DEFAULT_LAYOUT;
  const data: BoardData = {
    site: { id: site.id, url: site.url, host: host(site.url), name: site.business.name },
    analysis: analysis
      ? { id: analysis.id, status: analysis.status, score: analysis.overallScore, pages: analysis.pagesCount, when: ago(analysis.completedAt ?? analysis.createdAt), version }
      : null,
    severity: { critical, high: issues(analysis?.id, "HIGH"), medium: issues(analysis?.id, "MEDIUM"), low: issues(analysis?.id, "LOW") },
    gscOn,
    cfOn,
    steps,
    websites: websites.map((w) => ({
      id: w.id,
      host: host(w.url),
      score: w.analyses[0]?.overallScore ?? null,
      status: w.analyses[0]?.status ?? null,
      critical: issues(w.analyses[0]?.id, "CRITICAL"),
      when: w.analyses[0] ? ago(w.analyses[0].completedAt ?? w.analyses[0].createdAt) : ago(w.createdAt),
    })),
    report: report ? JSON.parse(JSON.stringify(report)) : null,
  };

  return (
    <>
      <Topbar title="Overview" websiteSwitcher={{ workspaceId: membership.workspaceId, currentWebsiteId: site.id }} />
      <div className={ui.pageBody}>
        <Board key={site.id} data={data} initial={layout} />
      </div>
    </>
  );
}


