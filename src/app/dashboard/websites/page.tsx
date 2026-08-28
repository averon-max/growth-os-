import Link from "next/link";
import { Globe } from "lucide-react";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/dashboard/topbar";
import { EmptyState } from "@/components/dashboard/ui";
import styles from "@/components/dashboard/ui.module.css";

export default async function WebsitesPage() {
  const user = await requireUser();

  const membership = await prisma.workspaceMember.findFirst({ where: { userId: user.id }, select: { workspaceId: true } });

  const websites = membership
    ? await prisma.website.findMany({
        where: { business: { workspaceId: membership.workspaceId } },
        include: { business: { select: { name: true } }, analyses: { orderBy: { createdAt: "desc" }, take: 1 } },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return (
    <>
      <Topbar title="Websites" subtitle={`${websites.length} website${websites.length === 1 ? "" : "s"}`} />
      <div className={styles.pageBody}>
        {websites.length === 0 ? (
          <EmptyState
            icon={Globe}
            title="Add your first website"
            description="Connect a website to start running real SEO analysis."
            actionLabel="Add Website"
            actionHref="/dashboard/add-website"
          />
        ) : (
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
        )}
      </div>
    </>
  );
}
