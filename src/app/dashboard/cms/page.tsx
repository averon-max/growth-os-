import Link from "next/link";
import { Plug, Globe } from "lucide-react";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/dashboard/topbar";
import { EmptyState, Badge } from "@/components/dashboard/ui";
import styles from "@/components/dashboard/ui.module.css";

const STATUS_TONE: Record<string, "success" | "danger" | "muted"> = {
  CONNECTED: "success",
  ERROR: "danger",
  DISCONNECTED: "muted",
};

export default async function CMSPage() {
  const user = await requireUser();

  const membership = await prisma.workspaceMember.findFirst({ where: { userId: user.id }, select: { workspaceId: true } });

  const websites = membership
    ? await prisma.website.findMany({
        where: { business: { workspaceId: membership.workspaceId } },
        include: { business: { select: { name: true } }, cmsConnection: true },
        orderBy: { createdAt: "asc" },
      })
    : [];

  if (websites.length === 0) {
    return (
      <>
        <Topbar title="CMS" />
        <div className={styles.pageBody}>
          <EmptyState
            icon={Globe}
            title="Add a website first"
            description="Connect a website before setting up a CMS integration."
            actionLabel="Add Website"
            actionHref="/dashboard/add-website"
          />
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title="CMS" subtitle={`${websites.length} website${websites.length === 1 ? "" : "s"}`} />
      <div className={styles.pageBody}>
        <div className={styles.group}>
          <div className={styles.groupHeader}>
            <span className={styles.groupLabel}>Websites</span>
            <span className={styles.groupCount}>{websites.length}</span>
          </div>
          {websites.map((w) => {
            const status = w.cmsConnection?.status ?? "DISCONNECTED";
            return (
              <div key={w.id} className={styles.issueRow}>
                <div className={styles.issueMain}>
                  <span className={styles.issueDot} data-tone={STATUS_TONE[status]} />
                  <div style={{ minWidth: 0 }}>
                    <div className={styles.issueTitle}>{w.business.name}</div>
                    <div className={`${styles.issueDesc} ${styles.mono}`}>{w.url}</div>
                  </div>
                </div>
                <div className={styles.issueMeta} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Badge tone={STATUS_TONE[status]}>{status}</Badge>
                  <Link href={`/dashboard/cms/${w.id}`} className={styles.link}>
                    {w.cmsConnection ? "Manage" : "Connect"} →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
