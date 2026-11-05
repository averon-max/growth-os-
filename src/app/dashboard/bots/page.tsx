import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { Topbar } from "@/components/dashboard/topbar";
import { EmptyState } from "@/components/dashboard/ui";
import { BotsClient } from "@/components/dashboard/bots-client";
import { Globe } from "lucide-react";
import styles from "@/components/dashboard/ui.module.css";

export default async function BotsPage({ searchParams }: { searchParams: Promise<{ websiteId?: string }> }) {
  const user = await requireUser();
  const { websiteId } = await searchParams;
  const membership = await prisma.workspaceMember.findFirst({ where: { userId: user.id }, select: { workspaceId: true } });
  const websites = membership
    ? await prisma.website.findMany({ where: { business: { workspaceId: membership.workspaceId } }, orderBy: { createdAt: "asc" }, select: { id: true, url: true } })
    : [];
  const website = websites.find((w) => w.id === websiteId) ?? websites[0] ?? null;
  return (
    <>
      <Topbar title="Bots & crawlers" websiteSwitcher={membership && website ? { workspaceId: membership.workspaceId, currentWebsiteId: website.id } : undefined} />
      <div className={styles.pageBody}>
        {website ? <BotsClient key={website.id} websiteId={website.id} domain={new URL(website.url).hostname} />
          : <EmptyState icon={Globe} title="No website yet" description="Add a website to see bot traffic." actionLabel="Add website" actionHref="/dashboard/add-website" />}
      </div>
    </>
  );
}
