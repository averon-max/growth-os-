import { prisma } from "@/lib/prisma";

export interface WebsiteKeywordContextItem {
  keyword: string;
  volume: number | null;
  difficulty: number | null;
  position: number | null;
  clicks: number;
  impressions: number;
}

export interface WebsiteKeywordContext {
  hostname: string;
  topKeywords: WebsiteKeywordContextItem[];
}

function extractHostname(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
  }
}

/**
 * Loads the best-known keyword performance for a specific website, scoped
 * from the workspace-level Keyword table via KeywordSnapshot.pageUrl
 * (Keyword itself is workspace-scoped, not website-scoped -- see schema).
 * Returns null if the website cannot be resolved. Never throws on empty
 * data -- an empty topKeywords array is a valid, honest result.
 */
export async function getWebsiteKeywordContext(
  websiteId: string,
  limit = 50
): Promise<WebsiteKeywordContext | null> {
  const website = await prisma.website.findUnique({
    where: { id: websiteId },
    include: { business: true },
  });
  if (!website) return null;

  const hostname = extractHostname(website.url);

  const keywords = await prisma.keyword.findMany({
    where: {
      workspaceId: website.business.workspaceId,
      snapshots: { some: { pageUrl: { contains: hostname } } },
    },
    include: {
      snapshots: {
        where: { pageUrl: { contains: hostname } },
        orderBy: { date: "desc" },
        take: 1,
      },
    },
    take: 50,
  });

  const topKeywords = keywords
    .filter((k) => k.snapshots.length > 0)
    .map((k) => ({
      keyword: k.text,
      volume: k.volume,
      difficulty: k.difficulty,
      position: k.snapshots[0].position ? Number(k.snapshots[0].position) : null,
      clicks: k.snapshots[0].clicks ?? 0,
      impressions: k.snapshots[0].impressions ?? 0,
    }))
    .sort((a, b) => b.clicks - a.clicks || b.impressions - a.impressions)
    .slice(0, limit);

  return { hostname, topKeywords };
}
