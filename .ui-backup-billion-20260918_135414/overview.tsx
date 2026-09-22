import Link from "next/link";
import { ArrowUpRight, Globe, Plus, ScanSearch } from "lucide-react";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/dashboard/topbar";
import { EmptyState } from "@/components/dashboard/ui";
import styles from "@/components/dashboard/ui.module.css";

export default async function DashboardOverview() {
  const user = await requireUser();

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    select: { workspaceId: true },
  });

  if (!membership) {
    return (
      <>
        <Topbar title="Overview" />
        <div className={styles.pageBody}>
          <EmptyState icon={Globe} title="No workspace found" description="Your account isn't linked to a workspace yet." />
        </div>
      </>
    );
  }

  const websites = await prisma.website.findMany({
    where: { business: { workspaceId: membership.workspaceId } },
    include: {
      business: { select: { name: true } },
      analyses: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "asc" },
  });

  if (websites.length === 0) {
    return (
      <>
        <Topbar title="Overview" />
        <div className={styles.pageBody}>
          <EmptyState icon={Globe} title="Add your first website" description="Connect a website to start running real SEO analysis." actionLabel="Add Website" actionHref="/dashboard/add-website" />
        </div>
      </>
    );
  }

  const latestAnalyses = websites.map((w) => w.analyses[0]).filter((a): a is NonNullable<typeof a> => Boolean(a));
  const latestOverall = latestAnalyses.length
    ? latestAnalyses.reduce((latest, a) => (a.createdAt > latest.createdAt ? a : latest))
    : null;
  const latestAnalysisIds = latestAnalyses.map((a) => a.id);

  const [criticalIssueCount, opportunityCount] = latestAnalysisIds.length
    ? await Promise.all([
        prisma.sEOIssue.count({ where: { analysisId: { in: latestAnalysisIds }, severity: "CRITICAL" } }),
        prisma.opportunity.count({ where: { analysisId: { in: latestAnalysisIds } } }),
      ])
    : [0, 0];

  return (
    <>
      <Topbar title="Overview" subtitle={`${websites.length} website${websites.length === 1 ? "" : "s"}`} />
      <div className={styles.pageBody}>
        <div className={styles.overviewHeader}>
          <div>
            <div className={styles.eyebrow}>Workspace overview</div>
            <h1 className={styles.heroTitle}>Growth at a glance</h1>
            <p className={styles.heroSubtitle}>Monitor search performance, technical health, and the next actions worth taking.</p>
          </div>
          <Link href="/dashboard/add-website" className={styles.toolbarButton}><Plus size={14} /> Add website</Link>
        </div>

        <div className={styles.metricRow}>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>Websites</span>
            <strong>{websites.length}</strong>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>SEO score</span>
            <strong>{latestOverall?.overallScore ?? "—"}</strong>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>Critical issues</span>
            <strong data-danger={criticalIssueCount > 0}>{criticalIssueCount}</strong>
          </div>
          <div className={styles.metric}>
            <span className={styles.metricLabel}>Opportunities</span>
            <strong>{opportunityCount}</strong>
          </div>
        </div>

        <div className={styles.sectionBar}>
          <div>
            <span className={styles.sectionTitle}>Websites</span>
            <span className={styles.sectionCount}>{websites.length}</span>
          </div>
          <Link href="/dashboard/websites" className={styles.textButton}>View all <ArrowUpRight size={13} /></Link>
        </div>

        <div className={styles.dataList}>
          {websites.map((w) => {
            const latest = w.analyses[0];
            return (
              <div key={w.id} className={styles.dataRow}>
                <div className={styles.dataIdentity}>
                  <div className={styles.siteIcon}><Globe size={14} /></div>
                  <div>
                    <div className={styles.dataTitle}>{w.business.name}</div>
                    <div className={styles.dataSecondary}>{w.url}</div>
                  </div>
                </div>
                <div className={styles.dataValue}>
                  {latest ? <span className={styles.scorePill}>{latest.overallScore ?? "—"}</span> : <span className={styles.muted}>Not analyzed</span>}
                  {latest ? (
                    <Link href={`/dashboard/analysis/${latest.id}`} className={styles.rowAction}>Open <ArrowUpRight size={13} /></Link>
                  ) : (
                    <Link href="/dashboard/seo" className={styles.rowAction}><ScanSearch size={13} /> Analyze</Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
