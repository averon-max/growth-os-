import Link from "next/link";
import { Search, Globe } from "lucide-react";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/dashboard/topbar";
import { EmptyState } from "@/components/dashboard/ui";
import { RunAnalysisButton } from "@/components/dashboard/run-analysis-button";
import styles from "@/components/dashboard/ui.module.css";

function scoreTone(score: number | null): "success" | "warning" | "danger" | "muted" {
  if (score === null) return "muted";
  if (score >= 70) return "success";
  if (score >= 50) return "warning";
  return "danger";
}

export default async function SeoPage() {
  const user = await requireUser();

  const membership = await prisma.workspaceMember.findFirst({ where: { userId: user.id }, select: { workspaceId: true } });

  const websites = membership
    ? await prisma.website.findMany({
        where: { business: { workspaceId: membership.workspaceId } },
        include: { business: { select: { name: true } }, analyses: { orderBy: { createdAt: "desc" }, take: 1 } },
        orderBy: { createdAt: "asc" },
      })
    : [];

  if (websites.length === 0) {
    return (
      <>
        <Topbar title="SEO" />
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

  return (
    <>
      <Topbar title="SEO" subtitle={`${websites.length} website${websites.length === 1 ? "" : "s"}`} />
      <div className={styles.pageBody}>
        <div className={styles.group}>
          <div className={styles.groupHeader}>
            <span className={styles.groupLabel}>Websites</span>
            <span className={styles.groupCount}>{websites.length}</span>
          </div>
          {websites.map((w) => {
            const latest = w.analyses[0];
            const isRunning = latest && (latest.status === "QUEUED" || latest.status === "RUNNING");
            return (
              <div key={w.id} className={styles.issueRow}>
                <div className={styles.issueMain}>
                  <span className={styles.issueDot} data-tone={scoreTone(latest?.overallScore ?? null)} />
                  <div style={{ minWidth: 0 }}>
                    <div className={styles.issueTitle}>{w.business.name}</div>
                    <div className={`${styles.issueDesc} ${styles.mono}`}>{w.url}</div>
                  </div>
                </div>
                <div className={styles.issueMeta} style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  {latest?.overallScore != null && (
                    <span className={styles.mono} style={{ fontWeight: 600, color: "var(--primary)" }}>{latest.overallScore}</span>
                  )}
                  {isRunning ? (
                    <Link href={`/dashboard/analysis/${latest.id}`} className={styles.link}>In progress →</Link>
                  ) : latest ? (
                    <>
                      <Link href={`/dashboard/analysis/${latest.id}`} className={styles.link}>View →</Link>
                      <RunAnalysisButton websiteId={w.id} />
                    </>
                  ) : (
                    <RunAnalysisButton websiteId={w.id} />
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
