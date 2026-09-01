import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser, requireWebsiteAccess } from "@/lib/auth-helpers";
import { getCMSConnection } from "@/lib/cms/repository";
import { Topbar } from "@/components/dashboard/topbar";
import { Badge } from "@/components/dashboard/ui";
import { CMSConnectForm } from "@/components/dashboard/cms-connect-form";
import styles from "@/components/dashboard/ui.module.css";

const STATUS_TONE: Record<string, "success" | "danger" | "muted"> = {
  CONNECTED: "success",
  ERROR: "danger",
  DISCONNECTED: "muted",
};

export default async function CMSWebsiteDetailPage({ params }: { params: Promise<{ websiteId: string }> }) {
  const { websiteId } = await params;
  const user = await requireUser();

  const website = await requireWebsiteAccess(user.id, websiteId).catch(() => null);
  if (!website) {
    notFound();
  }

  const connection = await getCMSConnection(websiteId);

  return (
    <>
      <Topbar title="CMS" subtitle={website.url} />
      <div className={styles.pageBody} style={{ maxWidth: 480 }}>
        <Link href="/dashboard/cms" className={styles.backLink}>← CMS</Link>

        {connection && (
          <div className={styles.card} style={{ margin: "16px 0 20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className={styles.sectionTitle} style={{ margin: 0 }}>Current status</span>
              <Badge tone={STATUS_TONE[connection.status]}>{connection.status}</Badge>
            </div>
            {connection.lastError && (
              <p className={styles.issueDesc} style={{ marginTop: 8, color: "var(--danger)" }}>{connection.lastError}</p>
            )}
            {connection.lastConnectedAt && (
              <p className={styles.issueDesc} style={{ marginTop: 8 }}>
                Last connected: {connection.lastConnectedAt.toISOString().slice(0, 16).replace("T", " ")}
              </p>
            )}
          </div>
        )}

        <h1 className={styles.pageTitle} style={{ marginTop: connection ? 0 : 16 }}>
          {connection ? "Update connection" : "Connect WordPress"}
        </h1>
        <p className={styles.pageSubtitle}>
          Growth OS applies SEO fixes to this site using a WordPress Application Password.
        </p>

        <CMSConnectForm websiteId={websiteId} currentSiteUrl={connection?.siteUrl ?? website.url} />
      </div>
    </>
  );
}
