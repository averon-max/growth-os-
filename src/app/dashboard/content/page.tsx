import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/dashboard/topbar";
import { ContentExplorer } from "@/components/dashboard/content-explorer";
import { ContentCreateButton } from "@/components/dashboard/content-create-button";

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ websiteId?: string }>;
}) {
  const user = await requireUser();
  const { websiteId } = await searchParams;

  const workspace = await prisma.workspaceMember
    .findFirst({ where: { userId: user.id }, select: { workspace: { select: { id: true, name: true } } } })
    .then(m => m?.workspace ?? null);

  const websites = workspace
    ? await prisma.website.findMany({
        where: { business: { workspaceId: workspace.id } },
        select: { id: true, url: true },
      })
    : [];

  const activeWebsiteId = websiteId ?? websites[0]?.id ?? "";

  const latestAnalysis = activeWebsiteId
    ? await prisma.analysis.findFirst({
        where: { websiteId: activeWebsiteId },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      })
    : null;

  const opportunities = latestAnalysis
    ? await prisma.opportunity.findMany({
        where: { analysisId: latestAnalysis.id },
        orderBy: { score: "desc" },
        select: { id: true, title: true, reason: true, recommendation: true, score: true },
      })
    : [];

  return (
    <div>
      <Topbar
        title="Content"
        subtitle={workspace?.name ?? ""}
        websiteSwitcher={
          workspace && activeWebsiteId
            ? {
                workspaceId: workspace.id,
                currentWebsiteId: activeWebsiteId,
              }
            : undefined
        }
      />
      {activeWebsiteId ? (
        <ContentCreateButton websiteId={activeWebsiteId} />
      ) : null}
      <ContentExplorer
        websiteId={activeWebsiteId}
        opportunities={opportunities}
      />
    </div>
  );
}
