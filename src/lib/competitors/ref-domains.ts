import { dfs, num, rec, str } from "@/lib/dataforseo/client";

/**
 * Referring domains for many sites in ONE DataForSEO request (bulk endpoint, about $0.02 for up to 1000 sites),
 * saved for the "Competitor & backlink" time in Settings, so reloading the page is free.
 */
export async function referringDomains(domains: string[]): Promise<Record<string, number | null>> {
  const targets = [...new Set(domains.map((d) => d.toLowerCase()))].sort().slice(0, 1000);
  if (targets.length === 0) return {};
  try {
    const result = await dfs("backlinks/bulk_referring_domains/live", { targets });
    const out: Record<string, number | null> = {};
    for (const item of (rec(result[0]).items as unknown[] | undefined) ?? []) {
      const r = rec(item);
      const t = (str(r.target) ?? "").toLowerCase().replace(/^www\./, "");
      if (t) out[t] = num(r.referring_main_domains) ?? num(r.referring_domains);
    }
    return out;
  } catch (e) {
    console.warn("[competitors] referring domains:", (e as Error).message);
    return {};
  }
}
