import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireWebsiteAccess, authErrorResponse } from "@/lib/auth-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { importBacklinksCsv } from "@/lib/backlinks/free";

export const runtime = "nodejs";

/** POST /api/backlinks/import?websiteId=…&name=file.csv — тело запроса: текст CSV. */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const websiteId = req.nextUrl.searchParams.get("websiteId") ?? "";
    if (websiteId === "") return NextResponse.json({ error: "websiteId is required." }, { status: 400 });
    const website = await requireWebsiteAccess(user.id, websiteId);
    if (rateLimit("backlinks-import:" + user.id, 40, 3600 * 1000) === false) {
      return NextResponse.json({ error: "Too many imports this hour." }, { status: 429 });
    }
    const text = await req.text();
    if (text.length > 10_000_000) return NextResponse.json({ error: "File is too large (max 10 MB)." }, { status: 413 });
    const name = (req.nextUrl.searchParams.get("name") ?? "links.csv").slice(0, 200);
    const host = new URL(website.url).hostname.replace(/^www\./, "").toLowerCase();
    return NextResponse.json(await importBacklinksCsv(website.id, host, text, name));
  } catch (err) {
    console.error("[backlinks import error]", err);
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
