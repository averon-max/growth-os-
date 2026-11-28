import "server-only";
import { prisma } from "@/lib/prisma";

/*
 * Every kind of working data Hyprlyx keeps for a workspace, with its size and a Delete button in
 * Settings → Data. Each store counts and deletes with the same WHERE, so after Delete the count is 0
 * (the panel re-reads it to prove it). Never listed (never deletable here): the account, workspaces, websites,
 * keywords and tracked keywords, approved/published articles, briefs, billing.
 */

const SITES = `SELECT w.id FROM "Website" w JOIN "Business" b ON b.id = w."businessId" WHERE b."workspaceId" = $1`;
const ARTICLES = `SELECT ca.id FROM "ContentArticle" ca JOIN "ContentBrief" cb ON cb.id = ca."briefId" WHERE cb."websiteId" IN (${SITES})`;
const CF = `SELECT id FROM "CloudflareConnection" WHERE "websiteId" IN (${SITES})`;

export type Store = { key: string; label: string; help: string; where: string; table: string; warn?: string };

export const STORES: Store[] = [
  {
    key: "plannerReports",
    label: "Keyword Planner reports",
    help: "The saved analysis of each site in the Keyword Planner. Deleting it means the next Analyze is paid again.",
    table: "KeywordSuggestionCache",
    where: `source = 'PLANNER_REPORT' AND normalized IN (SELECT 'planner:' || id FROM (${SITES}) s)`,
    warn: "The next analysis in the Keyword Planner will be paid again.",
  },
  {
    key: "oldAudits",
    label: "Older site audits",
    help: "Every finished audit except the latest one of each site, with their pages and issues. An audit that is still running is never touched.",
    table: "Analysis",
    where: `"websiteId" IN (${SITES}) AND status NOT IN ('QUEUED', 'RUNNING') AND id NOT IN (SELECT DISTINCT ON ("websiteId") id FROM "Analysis" WHERE "websiteId" IN (${SITES}) ORDER BY "websiteId", "completedAt" DESC NULLS LAST, "createdAt" DESC)`,
  },
  {
    key: "competitorScans",
    label: "Competitor scans",
    help: "Saved snapshots of tracked competitors.",
    table: "CompetitorSnapshot",
    where: `"competitorId" IN (SELECT id FROM "Competitor" WHERE "websiteId" IN (${SITES}))`,
  },
  {
    key: "backlinkScans",
    label: "Backlink scans",
    help: "Saved backlink snapshots.",
    table: "BacklinkSnapshot",
    where: `"targetId" IN (SELECT id FROM "BacklinkTarget" WHERE "websiteId" IN (${SITES}))`,
  },
  {
    key: "importedBacklinks",
    label: "Imported backlinks",
    help: "Links imported from CSV files (Search Console, Ahrefs, Bing) and from Bing Webmaster.",
    table: "SiteBacklink",
    where: `"websiteId" IN (${SITES})`,
    warn: "Imported links will be gone until you import the files again.",
  },
  {
    key: "serpReplays",
    label: "Google results saved with articles",
    help: "The search results each article was written from.",
    table: "SerpReplayArtifact",
    where: `"contentArticleId" IN (${ARTICLES})`,
  },
  {
    key: "failedArticles",
    label: "Failed and rejected articles",
    help: "Articles that failed, were rejected or could not be published.",
    table: "ContentArticle",
    where: `status IN ('REJECTED', 'PUBLISH_FAILED', 'BLOCKED_EXTERNAL') AND id IN (${ARTICLES})`,
  },
  {
    key: "drafts",
    label: "Unfinished drafts",
    help: "Drafts and articles in review. Approved and published articles are never deleted.",
    table: "ContentArticle",
    where: `status IN ('DRAFT', 'IN_REVIEW') AND id IN (${ARTICLES})`,
    warn: "Drafts that are not approved yet will be gone.",
  },
  {
    key: "rankingHistory",
    label: "Ranking history",
    help: "Daily Google positions of your keywords from Search Console.",
    table: "KeywordSnapshot",
    where: `"keywordId" IN (SELECT id FROM "Keyword" WHERE "workspaceId" = $1)`,
    warn: "Charts of past positions will start from zero; Search Console can refill the last 16 months.",
  },
  {
    key: "trafficHistory",
    label: "Traffic history",
    help: "Daily Cloudflare visits for each site.",
    table: "TrafficSnapshot",
    where: `"connectionId" IN (${CF})`,
    warn: "Past traffic charts will be empty until Cloudflare syncs again (it keeps about 30 days).",
  },
  {
    key: "pageTrafficHistory",
    label: "Page traffic history",
    help: "Daily Cloudflare visits for each page.",
    table: "PageTrafficSnapshot",
    where: `"connectionId" IN (${CF})`,
    warn: "Past page traffic will be empty until Cloudflare syncs again.",
  },
  {
    key: "audienceHistory",
    label: "Audience history",
    help: "Saved Google Analytics and Cloudflare audience numbers.",
    table: "AudienceSnapshot",
    where: `"segmentId" IN (SELECT id FROM "AudienceSegment" WHERE "websiteId" IN (${SITES}))`,
  },
];

export async function countStores(workspaceId: string): Promise<{ key: string; label: string; help: string; warn?: string; rows: number }[]> {
  return Promise.all(
    STORES.map(async (s) => {
      const r = await prisma
        .$queryRawUnsafe<{ n: bigint }[]>(`SELECT count(*)::bigint AS n FROM "${s.table}" WHERE ${s.where}`, workspaceId)
        .catch((e: Error) => {
          console.error(`[data-stores] count ${s.key}`, e.message);
          return [{ n: BigInt(-1) }];
        });
      return { key: s.key, label: s.label, help: s.help, warn: s.warn, rows: Number(r[0]?.n ?? 0) };
    }),
  );
}

/** Deletes one store for the workspace; returns how many rows were removed. */
export async function deleteStore(workspaceId: string, key: string): Promise<number> {
  const s = STORES.find((x) => x.key === key);
  if (!s) throw new Error("Unknown data kind.");
  return prisma.$executeRawUnsafe(`DELETE FROM "${s.table}" WHERE ${s.where}`, workspaceId);
}
