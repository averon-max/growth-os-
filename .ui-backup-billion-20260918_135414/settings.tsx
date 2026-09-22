import Link from "next/link";
import { Building2, Globe, Cable } from "lucide-react";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getProviderConnection } from "@/lib/keywords/repository";
import { Topbar } from "@/components/dashboard/topbar";
import { EmptyState, Badge } from "@/components/dashboard/ui";
import styles from "@/components/dashboard/ui.module.css";

const CMS_STATUS_TONE: Record<string, "success" | "danger" | "muted"> = {
  CONNECTED: "success",
  ERROR: "danger",
  DISCONNECTED: "muted",
};

export default async function SettingsPage() {
  const user = await requireUser();

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    select: { role: true, workspace: { select: { id: true, name: true, createdAt: true } } },
  });

  if (!membership) {
    return (
      <>
        <Topbar title="Settings" />
        <div className={styles.pageBody}>
          <EmptyState icon={Building2} title="No workspace found" description="Your account isn't linked to a workspace yet." />
        </div>
      </>
    );
  }

  const { workspace, role } = membership;

  const websites = await prisma.website.findMany({
    where: { business: { workspaceId: workspace.id } },
    include: { business: { select: { name: true } }, cmsConnection: true },
    orderBy: { createdAt: "asc" },
  });

  const gscConnection = await getProviderConnection(workspace.id, "GOOGLE_SEARCH_CONSOLE");

  return (
    <>
      <Topbar title="Settings" subtitle={workspace.name} />
      <div className={styles.pageBody} style={{ maxWidth: 640 }}>
        <div className={styles.group}>
          <div className={styles.groupHeader}>
            <span className={styles.groupLabel}>Workspace</span>
          </div>
          <div className={styles.issueRow}>
            <div className={styles.issueMain}>
              <Building2 size={16} style={{ color: "var(--secondary)", marginTop: 2, flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div className={styles.issueTitle}>{workspace.name}</div>
                <div className={styles.issueDesc}>
                  Your role: {role} · Created {workspace.createdAt.toISOString().slice(0, 10)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.group}>
          <div className={styles.groupHeader}>
            <span className={styles.groupLabel}>Websites</span>
            <span className={styles.groupCount}>{websites.length}</span>
          </div>
          {websites.length === 0 ? (
            <div className={styles.issueRow}>
              <div className={styles.issueDesc}>No websites yet.</div>
              <Link href="/dashboard/add-website" className={styles.link}>Add website →</Link>
            </div>
          ) : (
            websites.map((w) => {
              const cmsStatus = w.cmsConnection?.status ?? "DISCONNECTED";
              return (
                <div key={w.id} className={styles.issueRow}>
                  <div className={styles.issueMain}>
                    <Globe size={16} style={{ color: "var(--secondary)", marginTop: 2, flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div className={styles.issueTitle}>{w.business.name}</div>
                      <div className={`${styles.issueDesc} ${styles.mono}`}>{w.url}</div>
                    </div>
                  </div>
                  <div className={styles.issueMeta} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Badge tone={CMS_STATUS_TONE[cmsStatus]}>CMS: {cmsStatus}</Badge>
                    <Link href={`/dashboard/cms/${w.id}`} className={styles.link}>Manage →</Link>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className={styles.group}>
          <div className={styles.groupHeader}>
            <span className={styles.groupLabel}>Integrations</span>
          </div>
          <div className={styles.issueRow}>
            <div className={styles.issueMain}>
              <Cable size={16} style={{ color: "var(--secondary)", marginTop: 2, flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <div className={styles.issueTitle}>Google Search Console</div>
                <div className={styles.issueDesc}>Keyword rankings, clicks, impressions and CTR.</div>
              </div>
            </div>
            <div className={styles.issueMeta}>
              <Badge tone={gscConnection?.status === "CONNECTED" ? "success" : "muted"}>
                {gscConnection?.status ?? "DISCONNECTED"}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
