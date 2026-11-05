import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/dashboard/topbar";
import { EmptyState } from "@/components/dashboard/ui";
import { PlannerClient } from "@/components/dashboard/planner-client";
import { Globe } from "lucide-react";
import styles from "@/components/dashboard/ui.module.css";

export default async function KeywordPlannerPage({ searchParams }: { searchParams: Promise<{ websiteId?: string }> }) {
  const user = await requireUser();
  const { websiteId } = await searchParams;
  const membership = await prisma.workspaceMember.findFirst({ where: { userId: user.id }, select: { workspaceId: true } });
  const websites = membership
    ? await prisma.website.findMany({ where: { business: { workspaceId: membership.workspaceId } }, orderBy: { createdAt: "asc" }, select: { id: true, url: true } })
    : [];
  const website = websites.find((w) => w.id === websiteId) ?? websites[0] ?? null;

  return (
    <>
      <Topbar title="Keyword Planner" websiteSwitcher={membership && website ? { workspaceId: membership.workspaceId, currentWebsiteId: website.id } : undefined} />
      <div className={styles.pageBody}>
        {membership && website ? (
          <PlannerClient key={website.id} websiteId={website.id} workspaceId={membership.workspaceId} domain={new URL(website.url).hostname} />
        ) : (
          <EmptyState icon={Globe} title="No website yet" description="Add a website to analyze its keywords." actionLabel="Add website" actionHref="/dashboard/add-website" />
        )}
      </div>
    </>
  );
}
