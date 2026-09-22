import { History, Globe } from "lucide-react";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/dashboard/topbar";
import { EmptyState } from "@/components/dashboard/ui";
import { FixHistoryTable } from "@/components/dashboard/fix-history-table";
import styles from "@/components/dashboard/ui.module.css";

export default async function FixHistoryPage() {
  const user = await requireUser();
  const membership = await prisma.workspaceMember.findFirst({ where: { userId: user.id }, select: { workspaceId: true } });

  if (!membership) return <><Topbar title="Fix History" /><div className={styles.pageBody}><EmptyState icon={Globe} title="No workspace found" description="Your account isn't linked to a workspace yet." /></div></>;

  return (
    <>
      <Topbar title="Fix History" subtitle="Applied SEO fixes" />
      <div className={styles.pageBody}>
        <div className={styles.workspaceIntro}><div><div className={styles.eyebrow}>Change log</div><h1 className={styles.heroTitle}>Fix history</h1><p className={styles.heroSubtitle}>Every applied SEO change, with verification status and audit history.</p></div><div className={styles.iconHeading}><History size={17} /></div></div>
        <div className={styles.tableShell}><FixHistoryTable workspaceId={membership.workspaceId} /></div>
      </div>
    </>
  );
}
