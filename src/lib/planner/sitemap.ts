import { isSafeUrl } from "@/lib/crawler/security";

const MAX_URLS = 5000;
const MAX_SITEMAPS = 40;
const MAX_BYTES = 15_000_000;
const UA = "GrowthOS-SitemapFetcher/1.0";

/** GET with manual redirects; every hop is SSRF-checked. */
async function get(start: string): Promise<string | null> {
  let url = start;
  for (let hop = 0; hop < 4; hop++) {
    const safe = await isSafeUrl(url);
    if (safe.safe === false) return null;
    let res: Response;
    try {
      res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(10000), headers: { "User-Agent": UA } });
    } catch {
      return null;
    }
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (loc === null) return null;
      url = new URL(loc, url).toString();
      continue;
    }
    if (res.ok === false) return null;
    return (await res.text()).slice(0, MAX_BYTES);
  }
  return null;
}

const locs = (xml: string) =>
  [...xml.matchAll(/<loc>\s*(?:<.\[CDATA\[)?\s*([^<\]\s]+)\s*(?:\]\]>)?\s*<\/loc>/gi)].map((m) => m[1].replace(/&amp;/g, "&"));

export interface SitemapResult { urls: string[]; sitemaps: string[]; source: "robots" | "default" | "none" }

export async function fetchSitemapUrls(siteUrl: string): Promise<SitemapResult> {
  const origin = new URL(siteUrl).origin;
  const robots = await get(`${origin}/robots.txt`);
  const fromRobots = robots ? [...robots.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1]) : [];
  const queue = fromRobots.length > 0 ? [...fromRobots] : [`${origin}/sitemap.xml`, `${origin}/sitemap_index.xml`];
  const seen = new Set<string>();
  const urls = new Set<string>();
  const sitemaps: string[] = [];
  while (queue.length > 0 && seen.size < MAX_SITEMAPS && urls.size < MAX_URLS) {
    const sm = queue.shift() as string;
    if (seen.has(sm)) continue;
    seen.add(sm);
    const xml = await get(sm);
    if (xml === null) continue;
    sitemaps.push(sm);
    const found = locs(xml);
    if (/<sitemapindex/i.test(xml)) queue.push(...found);
    else for (const u of found) { if (urls.size >= MAX_URLS) break; urls.add(u); }
  }
  return { urls: [...urls], sitemaps, source: sitemaps.length === 0 ? "none" : fromRobots.length > 0 ? "robots" : "default" };
}
