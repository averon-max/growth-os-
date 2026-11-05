import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/dashboard/topbar";
import { EmptyState } from "@/components/dashboard/ui";
import { CompetitorsTracker } from "@/components/dashboard/competitors-tracker";
import { Globe } from "lucide-react";
import styles from "@/components/dashboard/ui.module.css";

export default async function CompetitorsPage({ searchParams }: { searchParams: Promise<{ websiteId?: string }> }) {
  const user = await requireUser();
  const { websiteId } = await searchParams;
  const membership = await prisma.workspaceMember.findFirst({ where: { userId: user.id }, select: { workspaceId: true } });
  const websites = membership
    ? await prisma.website.findMany({ where: { business: { workspaceId: membership.workspaceId } }, orderBy: { createdAt: "asc" }, select: { id: true, url: true } })
    : [];
  const website = websites.find((w) => w.id === websiteId) ?? websites[0] ?? null;
  return (
    <>
      <Topbar title="Competitors" websiteSwitcher={membership && website ? { workspaceId: membership.workspaceId, currentWebsiteId: website.id } : undefined} />
      <div className={styles.pageBody}>
        {website ? <CompetitorsTracker key={website.id} websiteId={website.id} domain={new URL(website.url).hostname} />
          : <EmptyState icon={Globe} title="No website yet" description="Add a website to track competitors." actionLabel="Add website" actionHref="/dashboard/add-website" />}
      </div>
    </>
  );
}
