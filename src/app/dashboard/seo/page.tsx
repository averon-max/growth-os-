import { Search } from "lucide-react";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/dashboard/topbar";
import { EmptyState } from "@/components/dashboard/ui";
import styles from "@/components/dashboard/ui.module.css";

const SEVERITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;
const SEVERITY_TONE: Record<string, string> = { CRITICAL: "danger", HIGH: "warning", MEDIUM: "accent", LOW: "muted" };
const ISSUES_FETCH_CAP = 500;

function titleCase(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

export default async function SeoPage() {
  const user = await requireUser();

  const membership = await prisma.workspaceMember.findFirst({ where: { userId: user.id }, select: { workspaceId: true } });
  const website = membership
    ? await prisma.website.findFirst({ where: { business: { workspaceId: membership.workspaceId } }, orderBy: { createdAt: "asc" } })
    : null;
  const analysis = website
    ? await prisma.analysis.findFirst({ where: { websiteId: website.id }, orderBy: { createdAt: "desc" } })
    : null;

  if (!analysis) {
    return (
      <>
        <Topbar title="SEO Issues" />
        <div className={styles.pageBody}>
          <EmptyState
            icon={Search}
            title="Run an analysis to see SEO issues"
            description={website ? "This website hasn't been analyzed yet." : "Add a website to get started."}
            actionLabel={website ? undefined : "Add Website"}
            actionHref={website ? undefined : "/dashboard/add-website"}
          />
        </div>
      </>
    );
  }

  const issues = await prisma.sEOIssue.findMany({
    where: { analysisId: analysis.id },
    orderBy: { createdAt: "desc" },
    take: ISSUES_FETCH_CAP,
  });

  const knownSeverities = new Set<string>(SEVERITY_ORDER);
  const grouped = SEVERITY_ORDER.map((severity) => ({ severity, items: issues.filter((i) => i.severity === severity) })).filter(
    (g) => g.items.length > 0
  );
  const otherItems = issues.filter((i) => !knownSeverities.has(i.severity));

  return (
    <>
      <Topbar title="SEO Issues" subtitle={`${issues.length} issue${issues.length === 1 ? "" : "s"}`} />
      <div className={styles.pageBody}>
        {issues.length === 0 ? (
          <EmptyState icon={Search} title="No issues found" description="This analysis didn't surface any SEO issues." />
        ) : (
          <>
            {grouped.map((group) => (
              <div key={group.severity} className={styles.group}>
                <div className={styles.groupHeader}>
                  <span className={styles.groupLabel}>{titleCase(group.severity)}</span>
                  <span className={styles.groupCount}>{group.items.length}</span>
                </div>
                {group.items.map((issue) => (
                  <div key={issue.id} className={styles.issueRow}>
                    <div className={styles.issueMain}>
                      <span className={styles.issueDot} data-tone={SEVERITY_TONE[issue.severity] ?? "muted"} />
                      <div style={{ minWidth: 0 }}>
                        <div className={styles.issueTitle}>{issue.type}</div>
                        <div className={styles.issueDesc}>{issue.description}</div>
                        <div className={`${styles.issueDesc} ${styles.mono}`} style={{ marginTop: 4 }}>→ {issue.recommendation}</div>
                      </div>
                    </div>
                    <div className={styles.issueMeta}>
                      {issue.pageUrl && (
                        <span className={`${styles.mono} ${styles.truncate}`} title={issue.pageUrl}>{issue.pageUrl}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
            {otherItems.length > 0 && (
              <div className={styles.group}>
                <div className={styles.groupHeader}>
                  <span className={styles.groupLabel}>Other</span>
                  <span className={styles.groupCount}>{otherItems.length}</span>
                </div>
                {otherItems.map((issue) => (
                  <div key={issue.id} className={styles.issueRow}>
                    <div className={styles.issueMain}>
                      <span className={styles.issueDot} data-tone="muted" />
                      <div style={{ minWidth: 0 }}>
                        <div className={styles.issueTitle}>{issue.type}</div>
                        <div className={styles.issueDesc}>{issue.description}</div>
                      </div>
                    </div>
                    <div className={styles.issueMeta}>
                      {issue.pageUrl && (
                        <span className={`${styles.mono} ${styles.truncate}`} title={issue.pageUrl}>{issue.pageUrl}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
