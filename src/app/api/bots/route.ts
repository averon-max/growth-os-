import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireWebsiteAccess, authErrorResponse } from "@/lib/auth-helpers";
import { getCloudflareConnectionWithToken } from "@/lib/integrations/cloudflare/connection-service";
import { fetchCloudflarePageTraffic } from "@/lib/integrations/cloudflare/page-traffic";

export const runtime = "nodejs";
export const maxDuration = 60;

const GROUPS: [RegExp, string][] = [
  [/search engine crawler|search engine$/i, "Search engines"],
  [/\bai\b/i, "AI crawlers & assistants"],
  [/optimization|seo/i, "SEO tools"],
];
const groupOf = (c: string) => GROUPS.find(([re]) => re.test(c))?.[1] ?? "Other bots";
const cache = new Map<string, { at: number; body: unknown }>();

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const websiteId = req.nextUrl.searchParams.get("websiteId") ?? "";
    const days = Math.min(14, Math.max(1, Number(req.nextUrl.searchParams.get("days")) || 7));
    if (websiteId === "") return NextResponse.json({ error: "websiteId is required." }, { status: 400 });
    await requireWebsiteAccess(user.id, websiteId);

    const key = `${websiteId}:${days}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < 15 * 60 * 1000) return NextResponse.json(hit.body);

    // Only the website's own Cloudflare connection: never a global env token (would leak one zone to every tenant).
    const raw = (await getCloudflareConnectionWithToken(websiteId).catch(() => null)) as unknown as Record<string, unknown> | null;
    const nested = (raw?.connection ?? null) as Record<string, unknown> | null;
    const zoneId = String(raw?.zoneId ?? nested?.zoneId ?? "");
    const apiToken = String(raw?.apiToken ?? raw?.token ?? nested?.apiToken ?? "");
    if (zoneId === "" || apiToken === "") return NextResponse.json({ connected: false });

    const until = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
    const { rows, skippedDays } = await fetchCloudflarePageTraffic({ zoneId, apiToken, since, until });

    let total = 0, bots = 0;
    const cats = new Map<string, number>();
    const groups = new Map<string, number>();
    const paths = new Map<string, { total: number; bots: number; cats: Map<string, number> }>();
    const daysMap = new Map<string, { total: number; bots: number }>();
    for (const r of rows) {
      total += r.totalRequests;
      bots += r.verifiedBotRequests;
      const p = paths.get(r.path) ?? { total: 0, bots: 0, cats: new Map() };
      p.total += r.totalRequests;
      p.bots += r.verifiedBotRequests;
      const d = daysMap.get(r.date) ?? { total: 0, bots: 0 };
      d.total += r.totalRequests;
      d.bots += r.verifiedBotRequests;
      for (const c of r.botCategoryBreakdown) {
        cats.set(c.category, (cats.get(c.category) ?? 0) + c.requests);
        groups.set(groupOf(c.category), (groups.get(groupOf(c.category)) ?? 0) + c.requests);
        p.cats.set(c.category, (p.cats.get(c.category) ?? 0) + c.requests);
      }
      paths.set(r.path, p);
      daysMap.set(r.date, d);
    }
    const body = {
      connected: true, since, until, skippedDays,
      totals: { total, bots, share: total ? Math.round((bots / total) * 1000) / 10 : 0 },
      groups: Object.fromEntries(groups),
      categories: [...cats.entries()].map(([category, requests]) => ({ category, group: groupOf(category), requests })).sort((a, b) => b.requests - a.requests),
      pages: [...paths.entries()]
        .map(([path, v]) => ({ path, total: v.total, bots: v.bots, top: [...v.cats.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null }))
        .filter((x) => x.bots > 0).sort((a, b) => b.bots - a.bots).slice(0, 300),
      daily: [...daysMap.entries()].map(([date, v]) => ({ date, ...v })).sort((a, b) => a.date.localeCompare(b.date)),
    };
    cache.set(key, { at: Date.now(), body });
    return NextResponse.json(body);
  } catch (err) {
    console.error("[bots error]", err);
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
