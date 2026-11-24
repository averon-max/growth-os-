import { google } from "googleapis";
import { unstable_cache } from "next/cache";
import { getAuthorizedClient, resolveVerifiedSiteUrl } from "@/lib/keywords/gsc-provider";

export type GscDimension = "date" | "page" | "query" | "country" | "device";

export type GscRequest = {
  start: string; // YYYY-MM-DD
  end: string;
  dimensions: GscDimension[];
  rowLimit?: number;
};

export type GscRow = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };

/**
 * Several Search Console reports in one go: one token check, one site lookup, the reports in parallel.
 * Results are kept for a few hours: Search Console updates once a day, and its API takes seconds.
 * Errors are never cached, so a reconnect or a new permission shows up on the next load.
 */
async function runBatch(workspaceId: string, siteUrl: string, requests: GscRequest[]): Promise<GscRow[][]> {
  const auth = await getAuthorizedClient(workspaceId);
  const site = await resolveVerifiedSiteUrl(auth, siteUrl);
  const searchconsole = google.searchconsole({ version: "v1", auth });

  return Promise.all(
    requests.map(async (r) => {
      const res = await searchconsole.searchanalytics.query({
        siteUrl: site,
        requestBody: {
          startDate: r.start,
          endDate: r.end,
          dimensions: r.dimensions,
          rowLimit: r.rowLimit ?? 1000,
          // "all" includes the last days that Google is still filling in, so the dates line up with Cloudflare.
          dataState: "all",
        },
      });
      return (res.data.rows ?? []).map((row) => ({
        keys: row.keys ?? [],
        clicks: row.clicks ?? 0,
        impressions: row.impressions ?? 0,
        ctr: row.ctr ?? 0,
        position: row.position ?? 0,
      }));
    }),
  );
}

export function gscBatch(workspaceId: string, siteUrl: string, requests: GscRequest[], hours = 3): Promise<GscRow[][]> {
  const key = JSON.stringify(requests);
  return unstable_cache(() => runBatch(workspaceId, siteUrl, requests), ["gsc-batch-v1", workspaceId, siteUrl, key], {
    revalidate: hours * 3600,
  })();
}
