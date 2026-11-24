import { prisma } from "@/lib/prisma";
import { getCompletedUtcDayRange } from "@/lib/audience/completed-day-range";
import { syncCloudflareTraffic } from "@/lib/integrations/cloudflare/sync";
import { fetchAndUpsertKeywords } from "@/lib/keywords/ingestion";

const day = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Pulls recent Cloudflare days for one site. A site with no saved days gets the full 30;
 * after that the last 7 are enough (they cover days Cloudflare was still counting).
 */
export async function refreshCloudflareSite(websiteId: string): Promise<void> {
  const connection = await prisma.cloudflareConnection.findUnique({
    where: { websiteId },
    select: { id: true, _count: { select: { snapshots: true } } },
  });
  if (!connection) return;
  const { since, until } = getCompletedUtcDayRange(connection._count.snapshots > 0 ? 7 : 30, new Date());
  await syncCloudflareTraffic({ websiteId, since: day(since), until: day(until) });
  await prisma.cloudflareConnection.update({ where: { websiteId }, data: { updatedAt: new Date() } });
}

/** Daily job: every connected site that wasn't synced in the last 12 hours, one at a time. */
export async function refreshAllCloudflare(budgetMs = 200_000): Promise<{ synced: number; failed: number; skipped: number }> {
  const started = Date.now();
  const stale = await prisma.cloudflareConnection.findMany({
    where: { updatedAt: { lt: new Date(Date.now() - 12 * 3600_000) } },
    select: { websiteId: true },
    orderBy: { updatedAt: "asc" },
  });
  let synced = 0;
  let failed = 0;
  for (const { websiteId } of stale) {
    if (Date.now() - started > budgetMs) break;
    try {
      await refreshCloudflareSite(websiteId);
      synced++;
    } catch (error) {
      failed++;
      console.warn("[cloudflare refresh]", websiteId, error instanceof Error ? error.message : error);
    }
  }
  return { synced, failed, skipped: stale.length - synced - failed };
}

/**
 * Daily job: pull Search Console queries into Keywords for every site of every workspace with Search Console connected.
 * A workspace without any Search Console keywords yet gets 28 days; afterwards the last 7 (Google keeps adjusting recent days).
 * Without this, Keyword Planner and Competitors stayed empty until someone pressed Sync by hand.
 */
export async function refreshAllSearchConsole(budgetMs = 120_000): Promise<{ synced: number; failed: number; skipped: number }> {
  const started = Date.now();
  const connections = await prisma.providerConnection.findMany({
    where: { provider: "GOOGLE_SEARCH_CONSOLE", status: "CONNECTED" },
    select: { workspaceId: true },
  });
  const sites = await prisma.website.findMany({
    where: { business: { workspaceId: { in: connections.map((c) => c.workspaceId) } } },
    select: { url: true, business: { select: { workspaceId: true } } },
  });
  let synced = 0;
  let failed = 0;
  for (const site of sites) {
    if (Date.now() - started > budgetMs) break;
    const workspaceId = site.business.workspaceId;
    try {
      const has = await prisma.keywordSnapshot.findFirst({
        where: { source: "GOOGLE_SEARCH_CONSOLE", keyword: { workspaceId } },
        select: { id: true },
      });
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (has ? 7 : 28) * 86_400_000);
      await fetchAndUpsertKeywords(workspaceId, site.url, { startDate, endDate });
      synced++;
    } catch (error) {
      failed++;
      console.warn("[search console refresh]", site.url, error instanceof Error ? error.message : error);
    }
  }
  return { synced, failed, skipped: sites.length - synced - failed };
}
