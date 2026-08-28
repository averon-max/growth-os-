import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getProviderConnection } from "@/lib/keywords/repository";
import { Topbar } from "@/components/dashboard/topbar";
import { EmptyState } from "@/components/dashboard/ui";
import { KeywordsExplorer } from "@/components/dashboard/keywords-explorer";
import { Search, Globe } from "lucide-react";
import styles from "@/components/dashboard/ui.module.css";

export default async function KeywordsPage() {
  const user = await requireUser();

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: user.id },
    select: { workspaceId: true },
  });

  if (!membership) {
    return (
      <>
        <Topbar title="Keywords" />
        <div className={styles.pageBody}>
          <EmptyState icon={Globe} title="No workspace found" description="Your account isn't linked to a workspace yet." />
        </div>
      </>
    );
  }

  const workspaceId = membership.workspaceId;
  const connection = await getProviderConnection(workspaceId, "GOOGLE_SEARCH_CONSOLE");

  if (!connection || connection.status !== "CONNECTED") {
    return (
      <>
        <Topbar title="Keywords" />
        <div className={styles.pageBody}>
          <EmptyState
            icon={Search}
            title="Google Search Console not connected"
            description="Connect Search Console to import keyword rankings, clicks, impressions and CTR."
            actionLabel="Connect Search Console"
            actionHref={`/api/integrations/google/connect?workspaceId=${workspaceId}`}
          />
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title="Keywords" subtitle="Search Console" />
      <div className={styles.pageBody}>
        <KeywordsExplorer workspaceId={workspaceId} />
      </div>
    </>
  );
}
