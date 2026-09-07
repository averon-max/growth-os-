import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getProviderConnection } from "@/lib/keywords/repository";
import { Topbar } from "@/components/dashboard/topbar";
import { EmptyState } from "@/components/dashboard/ui";
import { KeywordsExplorer } from "@/components/dashboard/keywords-explorer";
import { KeywordSignals } from "@/components/dashboard/keyword-signals";
import { SyncKeywordsButton } from "@/components/dashboard/sync-keywords-button";
import { EnrichVolumeButton } from "@/components/dashboard/enrich-volume-button";
import { KeywordSuggestions } from "@/components/dashboard/keyword-suggestions";
import { IndustryTopKeywords } from "@/components/dashboard/industry-top-keywords";
import { deriveSearchSeed } from "@/lib/keywords/seed-utils";
import { GlobalTrending } from "@/components/dashboard/global-trending";
import { deriveSeedKeyword } from "@/lib/keywords/seed";
import { Search, Globe } from "lucide-react";
import styles from "@/components/dashboard/ui.module.css";

export default async function KeywordsPage({ searchParams }: { searchParams: Promise<{ websiteId?: string }> }) {
  const user = await requireUser();
  const { websiteId } = await searchParams;

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

  const website = websiteId
    ? await prisma.website.findFirst({ where: { id: websiteId, business: { workspaceId } }, include: { business: true } })
    : await prisma.website.findFirst({ where: { business: { workspaceId } }, orderBy: { createdAt: "asc" }, include: { business: true } });

  return (
    <>
      <Topbar
        title="Keywords"
        subtitle="Search Console"
        websiteSwitcher={website ? { workspaceId, currentWebsiteId: website.id } : undefined}
      />
      <div className={styles.pageBody}>
        {website && <SyncKeywordsButton workspaceId={workspaceId} siteUrl={website.url} />}
        <EnrichVolumeButton workspaceId={workspaceId} />
        {website?.business.industry && !website.business.industry.startsWith("http") && (
          <IndustryTopKeywords workspaceId={workspaceId} seed={deriveSearchSeed(website.business.industry)} />
        )}
        <KeywordSuggestions workspaceId={workspaceId} />
        <KeywordSignals workspaceId={workspaceId} />
        <KeywordsExplorer workspaceId={workspaceId} />
      </div>
    </>
  );
}
