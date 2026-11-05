import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireWebsiteAccess, authErrorResponse } from "@/lib/auth-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { dfs, num, str, rec } from "@/lib/dataforseo/client";

export const runtime = "nodejs";
// Average organic CTR by position (industry curve): an estimate of each result's SEO value.
const CTR = [0.28, 0.15, 0.1, 0.07, 0.05, 0.04, 0.03, 0.025, 0.02, 0.018];
type Row = { position: number; title: string | null; url: string; domain: string };
const cache = new Map<string, { at: number; rows: Row[] }>();

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const sp = req.nextUrl.searchParams;
    const websiteId = sp.get("websiteId") ?? "";
    const keyword = (sp.get("keyword") ?? "").trim().toLowerCase().slice(0, 200);
    const volume = Math.max(0, Number(sp.get("volume")) || 0);
    if (websiteId === "" || keyword === "") return NextResponse.json({ error: "websiteId and keyword are required." }, { status: 400 });
    const website = await requireWebsiteAccess(user.id, websiteId);
    const ours = new URL(website.url).hostname.replace(/^www\./, "");

    let hit = cache.get(keyword);
    if (hit === undefined || Date.now() - hit.at > 24 * 3600 * 1000) {
      if (rateLimit("serp:" + user.id, 300, 3600 * 1000) === false) return NextResponse.json({ error: "Too many SERP lookups this hour." }, { status: 429 });
      const res = await dfs("serp/google/organic/live/regular", { keyword, location_name: "United States", language_name: "English", depth: 10 });
      const raw = ((rec(res[0]).items as unknown[] | undefined) ?? []).map(rec).filter((x) => x.type === "organic").slice(0, 10);
      hit = { at: Date.now(), rows: raw.map((x) => ({ position: num(x.rank_group) ?? 0, title: str(x.title), url: str(x.url) ?? "", domain: (str(x.domain) ?? "").replace(/^www\./, "") })) };
      cache.set(keyword, hit);
    }
    const items = hit.rows.map((x) => ({ ...x, ours: x.domain === ours || x.domain.endsWith("." + ours), clicks: Math.round(volume * (CTR[x.position - 1] ?? 0.01)) }));
    return NextResponse.json({ items });
  } catch (err) {
    console.error("[planner/serp error]", err);
    if (err instanceof Error && /DataForSEO/i.test(err.message)) return NextResponse.json({ error: err.message }, { status: 502 });
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
