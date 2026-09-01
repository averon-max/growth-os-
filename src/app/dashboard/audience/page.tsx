import { Users, Globe } from "lucide-react";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getAudienceSegments } from "@/lib/audience/repository";
import { Topbar } from "@/components/dashboard/topbar";
import { EmptyState, Stat, Badge } from "@/components/dashboard/ui";
import styles from "@/components/dashboard/ui.module.css";

export default async function AudiencePage() {
  const user = await requireUser();

  const membership = await prisma.workspaceMember.findFirst({ where: { userId: user.id }, select: { workspaceId: true } });
  const website = membership
    ? await prisma.website.findFirst({ where: { business: { workspaceId: membership.workspaceId } }, orderBy: { createdAt: "asc" } })
    : null;

  if (!website) {
    return (
      <>
        <Topbar title="Audience" />
        <div className={styles.pageBody}>
          <EmptyState
            icon={Globe}
            title="Add a website first"
            description="Connect a website before viewing audience data."
            actionLabel="Add Website"
            actionHref="/dashboard/add-website"
          />
        </div>
      </>
    );
  }

  const { segments, pagination } = await getAudienceSegments(website.id);

  if (segments.length === 0) {
    return (
      <>
        <Topbar title="Audience" subtitle={website.url} />
        <div className={styles.pageBody}>
          <EmptyState
            icon={Users}
            title="No audience data yet"
            description="Connect Google Analytics 4 to see visitor segments for this website."
            actionLabel="Connect GA4"
            actionHref="/dashboard/settings"
          />
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title="Audience" subtitle={website.url} />
      <div className={styles.pageBody}>
        <div className={styles.statGrid}>
          <Stat label="Segments" value={String(pagination.total)} />
        </div>
        <div className={styles.group}>
          <div className={styles.groupHeader}>
            <span className={styles.groupLabel}>Audience segments</span>
            <span className={styles.groupCount}>{pagination.total}</span>
          </div>
          {segments.map((segment) => {
            const criteria = segment.criteria as Record<string, string | number>;
            return (
              <div key={segment.id} className={styles.issueRow}>
                <div className={styles.issueMain}>
                  <span className={styles.issueDot} data-tone="accent" />
                  <div style={{ minWidth: 0 }}>
                    <div className={styles.issueTitle}>{segment.name}</div>
                    <div className={styles.issueDesc}>
                      {Object.entries(criteria).map(([key, value]) => `${key}: ${value}`).join(" · ")}
                    </div>
                  </div>
                </div>
                <div className={styles.issueMeta}>
                  {Object.keys(criteria).map((key) => (
                    <Badge key={key} tone="muted">{key}</Badge>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
