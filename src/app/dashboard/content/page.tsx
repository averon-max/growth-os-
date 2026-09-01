import { Globe } from "lucide-react";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/dashboard/topbar";
import { EmptyState } from "@/components/dashboard/ui";
import { ContentExplorer } from "@/components/dashboard/content-explorer";
import styles from "@/components/dashboard/ui.module.css";

export default async function ContentPage() {
  const user = await requireUser();

  const membership = await prisma.workspaceMember.findFirst({ where: { userId: user.id }, select: { workspaceId: true } });
  const website = membership
    ? await prisma.website.findFirst({ where: { business: { workspaceId: membership.workspaceId } }, orderBy: { createdAt: "asc" } })
    : null;

  if (!website) {
    return (
      <>
        <Topbar title="Content" />
        <div className={styles.pageBody}>
          <EmptyState icon={Globe} title="Add a website first" description="Connect a website before generating content." actionLabel="Add Website" actionHref="/dashboard/add-website" />
        </div>
      </>
    );
  }

  const analysis = await prisma.analysis.findFirst({ where: { websiteId: website.id }, orderBy: { createdAt: "desc" } });
  const opportunities = analysis
    ? await prisma.opportunity.findMany({ where: { analysisId: analysis.id }, orderBy: { score: "desc" }, take: 50 })
    : [];

  return (
    <>
      <Topbar title="Content" subtitle={website.url} />
      <div className={styles.pageBody}>
        <ContentExplorer websiteId={website.id} opportunities={opportunities} />
      </div>
    </>
  );
}
