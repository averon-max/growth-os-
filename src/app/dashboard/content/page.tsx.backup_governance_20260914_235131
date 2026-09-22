import { Globe } from "lucide-react";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/dashboard/topbar";
import { EmptyState } from "@/components/dashboard/ui";
import { ContentExplorer } from "@/components/dashboard/content-explorer";
import styles from "@/components/dashboard/ui.module.css";

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ websiteId?: string }> }) {
  const user = await requireUser();
  const { websiteId } = await searchParams;

  const membership = await prisma.workspaceMember.findFirst({ where: { userId: user.id }, select: { workspaceId: true } });
  const website = membership
    ? websiteId
      ? await prisma.website.findFirst({ where: { id: websiteId, business: { workspaceId: membership.workspaceId } } })
      : await prisma.website.findFirst({ where: { business: { workspaceId: membership.workspaceId } }, orderBy: { createdAt: "asc" } })
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
      <Topbar
        title="Content"
        subtitle={website.url}
        websiteSwitcher={membership ? { workspaceId: membership.workspaceId, currentWebsiteId: website.id } : undefined}
      />
      <div className={styles.pageBody}>
        <ContentExplorer websiteId={website.id} opportunities={opportunities} />
      </div>
    </>
  );
}
