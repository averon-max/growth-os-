import { Target } from "lucide-react";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/dashboard/topbar";
import { EmptyState } from "@/components/dashboard/ui";
import styles from "@/components/dashboard/ui.module.css";

const PRIORITY_ORDER = ["HIGH", "MEDIUM", "LOW"] as const;
const PRIORITY_TONE: Record<string, string> = { HIGH: "warning", MEDIUM: "accent", LOW: "muted" };
const OPPORTUNITIES_FETCH_CAP = 500;

function titleCase(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase();
}

export default async function OpportunitiesPage() {
  const user = await requireUser();

  const membership = await prisma.workspaceMember.findFirst({ where: { userId: user.id }, select: { workspaceId: true } });
  const website = membership
    ? await prisma.website.findFirst({ where: { business: { workspaceId: membership.workspaceId } }, orderBy: { createdAt: "asc" } })
    : null;
  const analysis = website
    ? await prisma.analysis.findFirst({ where: { websiteId: website.id }, orderBy: { createdAt: "desc" } })
    : null;

  const opportunities = analysis
    ? await prisma.opportunity.findMany({ where: { analysisId: analysis.id }, orderBy: { score: "desc" }, take: OPPORTUNITIES_FETCH_CAP })
    : [];

  const knownPriorities = new Set<string>(PRIORITY_ORDER);
  const grouped = PRIORITY_ORDER.map((priority) => ({ priority, items: opportunities.filter((o) => o.priority === priority) })).filter(
    (g) => g.items.length > 0
  );
  const otherItems = opportunities.filter((o) => !knownPriorities.has(o.priority));

  return (
    <>
      <Topbar title="Opportunities" subtitle={`${opportunities.length} opportunit${opportunities.length === 1 ? "y" : "ies"}`} />
      <div className={styles.pageBody}>
        {opportunities.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No opportunities yet"
            description={analysis ? "This analysis didn't surface any opportunities." : "Run an analysis to surface growth opportunities."}
            actionLabel={website ? undefined : "Add Website"}
            actionHref={website ? undefined : "/dashboard/add-website"}
          />
        ) : (
          <>
            {grouped.map((group) => (
              <div key={group.priority} className={styles.group}>
                <div className={styles.groupHeader}>
                  <span className={styles.groupLabel}>{titleCase(group.priority)}</span>
                  <span className={styles.groupCount}>{group.items.length}</span>
                </div>
                {group.items.map((o) => (
                  <div key={o.id} className={styles.issueRow}>
                    <div className={styles.issueMain}>
                      <span className={styles.issueDot} data-tone={PRIORITY_TONE[o.priority] ?? "muted"} />
                      <div style={{ minWidth: 0 }}>
                        <div className={styles.issueTitle}>{o.title}</div>
                        <div className={styles.issueDesc}>{o.reason}</div>
                        <div className={`${styles.issueDesc} ${styles.mono}`} style={{ marginTop: 4 }}>→ {o.recommendation}</div>
                      </div>
                    </div>
                    <div className={styles.issueMeta}>
                      <span className={styles.mono} style={{ fontWeight: 600, color: "var(--primary)" }}>{o.score}</span>
                      <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: 2 }}>
                        {o.affectedPages} page{o.affectedPages === 1 ? "" : "s"}
                      </div>
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
                {otherItems.map((o) => (
                  <div key={o.id} className={styles.issueRow}>
                    <div className={styles.issueMain}>
                      <span className={styles.issueDot} data-tone="muted" />
                      <div style={{ minWidth: 0 }}>
                        <div className={styles.issueTitle}>{o.title}</div>
                        <div className={styles.issueDesc}>{o.reason}</div>
                      </div>
                    </div>
                    <div className={styles.issueMeta}>
                      <span className={styles.mono} style={{ fontWeight: 600, color: "var(--primary)" }}>{o.score}</span>
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
