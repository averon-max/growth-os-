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
  limit = 50,
  market?: string,
): Promise<WebsiteKeywordContext | null> {
  const website = await prisma.website.findUnique({
    where: { id: websiteId },
    include: { business: true },
  });
  if (!website) return null;

  const hostname = extractHostname(website.url).toLowerCase();
  if (!Number.isInteger(limit) || limit < 1 || limit > 500)
    throw new Error("KEYWORD_CONTEXT_LIMIT_INVALID");
  if (market !== undefined && !/^[A-Za-z]{2}$/.test(market))
    throw new Error("KEYWORD_CONTEXT_MARKET_INVALID");
  // Search Console rows have country/device dimensions: never import
  // Canadian average positions into a US keyword ranking decision.
  const scope = {
    pageUrl: { contains: hostname },
    source: "GOOGLE_SEARCH_CONSOLE",
    ...(market ? { country: market.toLowerCase() } : {}),
  };
  const belongsToWebsite = (pageUrl: string | null): boolean => {
    if (!pageUrl) return false;
    try {
      const host = new URL(pageUrl).hostname.toLowerCase();
      return host === hostname || host === "www." + hostname;
    } catch { return false; }
  };

  const keywords = await prisma.keyword.findMany({
    where: {
      workspaceId: website.business.workspaceId,
      snapshots: { some: scope },
    },
    include: {
      snapshots: {
        where: scope,
        orderBy: { date: "desc" },
        take: 1,
      },
    },
    take: Math.min(500, Math.max(50, limit * 2)),
  });

  const topKeywords = keywords
    .filter((k) => k.snapshots.length > 0 &&
      belongsToWebsite(k.snapshots[0].pageUrl))
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
