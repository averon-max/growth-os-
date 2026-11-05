import { NextRequest, NextResponse } from "next/server";
import { requireUser, requireWebsiteAccess, authErrorResponse } from "@/lib/auth-helpers";
import { rateLimit } from "@/lib/rate-limit";
import { getDomainBacklinks, BacklinksAccessError, BacklinksPaymentError } from "@/lib/backlinks/domain";
import { freeBacklinksReport } from "@/lib/backlinks/free";

export const runtime = "nodejs";
export const maxDuration = 90;

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const websiteId = req.nextUrl.searchParams.get("websiteId") ?? "";
    if (websiteId === "") return NextResponse.json({ error: "websiteId is required." }, { status: 400 });
    const website = await requireWebsiteAccess(user.id, websiteId);
    const refresh = req.nextUrl.searchParams.get("refresh") === "1";
    if (refresh && rateLimit("backlinks:" + user.id, 10, 3600 * 1000) === false) {
      return NextResponse.json({ error: "Too many refreshes this hour." }, { status: 429 });
    }
    const domain = new URL(website.url).hostname.replace(/^www\./, "");
    try {
      return NextResponse.json(await getDomainBacklinks(domain, refresh));
    } catch (err) {
      // нет денег на DataForSEO — бесплатная затычка (импорт CSV + Bing)
      if (err instanceof BacklinksPaymentError) {
        return NextResponse.json(await freeBacklinksReport(website.id, domain, website.url, "DataForSEO balance is empty."));
      }
      throw err;
    }
  } catch (err) {
    if (err instanceof BacklinksAccessError) return NextResponse.json({ error: err.message, access: false }, { status: 402 });
    console.error("[backlinks error]", err);
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
