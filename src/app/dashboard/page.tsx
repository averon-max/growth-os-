import Link from "next/link";
import { Globe } from "lucide-react";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/dashboard/topbar";
import { EmptyState, Stat } from "@/components/dashboard/ui";
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

  const workspaceId = membership.workspaceId;

  const websites = await prisma.website.findMany({
    where: { business: { workspaceId } },
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
          <EmptyState
            icon={Globe}
            title="Add your first website"
            description="Connect a website to start running real SEO analysis."
            actionLabel="Add Website"
            actionHref="/dashboard/add-website"
          />
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
        <div className={styles.statGrid}>
          <Stat label="Websites" value={String(websites.length)} />
          <Stat label="Latest SEO Score" value={latestOverall?.overallScore != null ? String(latestOverall.overallScore) : "—"} />
          <Stat label="Critical Issues" value={String(criticalIssueCount)} />
          <Stat label="Opportunities" value={String(opportunityCount)} />
        </div>

        <div className={styles.group}>
          <div className={styles.groupHeader}>
            <span className={styles.groupLabel}>Websites</span>
            <span className={styles.groupCount}>{websites.length}</span>
          </div>
          {websites.map((w) => {
            const latest = w.analyses[0];
            return (
              <div key={w.id} className={styles.issueRow}>
                <div className={styles.issueMain}>
                  <span className={styles.issueDot} data-tone={latest ? "success" : "muted"} />
                  <div style={{ minWidth: 0 }}>
                    <div className={styles.issueTitle}>{w.business.name}</div>
                    <div className={`${styles.issueDesc} ${styles.mono}`}>{w.url}</div>
                  </div>
                </div>
                <div className={styles.issueMeta}>
                  {latest ? (
                    <Link href={`/dashboard/analysis/${latest.id}`} className={styles.link}>View analysis →</Link>
                  ) : (
                    <span className={styles.awaitingLabel}>Awaiting analysis</span>
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
