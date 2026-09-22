import Link from "next/link";
import { ArrowUpRight, Globe, Plug } from "lucide-react";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/dashboard/topbar";
import { EmptyState, Badge } from "@/components/dashboard/ui";
import styles from "@/components/dashboard/ui.module.css";

const STATUS_TONE: Record<string, "success" | "danger" | "muted"> = { CONNECTED: "success", ERROR: "danger", DISCONNECTED: "muted" };

export default async function CMSPage() {
  const user = await requireUser();
  const membership = await prisma.workspaceMember.findFirst({ where: { userId: user.id }, select: { workspaceId: true } });
  const websites = membership ? await prisma.website.findMany({ where: { business: { workspaceId: membership.workspaceId } }, include: { business: { select: { name: true } }, cmsConnection: true }, orderBy: { createdAt: "asc" } }) : [];

  if (!websites.length) return <><Topbar title="CMS" /><div className={styles.pageBody}><EmptyState icon={Globe} title="Add a website first" description="Connect a website before setting up a CMS integration." actionLabel="Add Website" actionHref="/dashboard/add-website" /></div></>;

  return (
    <>
      <Topbar title="CMS" subtitle="Website connections" />
      <div className={styles.pageBody}>
        <div className={styles.workspaceIntro}><div><div className={styles.eyebrow}>Publishing infrastructure</div><h1 className={styles.heroTitle}>CMS</h1><p className={styles.heroSubtitle}>Connect your publishing stack so Growth OS can safely apply approved fixes.</p></div></div>
        <div className={styles.sectionBar}><div><span className={styles.sectionTitle}>Connections</span><span className={styles.sectionCount}>{websites.length}</span></div></div>
        <div className={styles.dataList}>
          {websites.map((w) => { const status = w.cmsConnection?.status ?? "DISCONNECTED"; return <div key={w.id} className={styles.dataRow}><div className={styles.dataIdentity}><div className={styles.siteIcon}><Plug size={14} /></div><div><div className={styles.dataTitle}>{w.business.name}</div><div className={styles.dataSecondary}>{w.url}</div></div></div><div className={styles.dataValue}><Badge tone={STATUS_TONE[status]}>{status}</Badge><Link href={`/dashboard/cms/${w.id}`} className={styles.rowAction}>{w.cmsConnection ? "Manage" : "Connect"} <ArrowUpRight size={13} /></Link></div></div>; })}
        </div>
      </div>
    </>
  );
}
