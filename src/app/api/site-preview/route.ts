import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Website screenshot for the Overview, taken by WordPress.com mShots.
 * mShots answers with a "generating" placeholder the first time; that answer is refused here (503, not cached),
 * so Next.js never stores the placeholder and the page simply asks again a few seconds later.
 * The real screenshot is cached for a day and re-encoded by next/image to AVIF/WebP.
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url") ?? "";
  if (!/^https?:\/\/[^\s/]+\.[^\s]+$/i.test(url) || url.length > 500) {
    return NextResponse.json({ error: "Bad url" }, { status: 400 });
  }
  // Only websites added to Hyprlyx: without this the route is an open proxy that screenshots any address on the internet.
  // (No session check: next/image fetches this route without the user's cookies.)
  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    host = "";
  }
  const known = host ? await prisma.website.findFirst({ where: { url: { contains: host, mode: "insensitive" } }, select: { id: true } }).catch(() => null) : null;
  if (!known) return NextResponse.json({ error: "Unknown site" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  const shot = `https://s.wordpress.com/mshots/v1/${encodeURIComponent(url)}?w=1280&h=800`;
  try {
    const res = await fetch(shot, { redirect: "manual", signal: AbortSignal.timeout(15_000), cache: "no-store" });
    const type = res.headers.get("content-type") ?? "";
    if (res.status !== 200 || !/^image\/(jpeg|png|webp)/.test(type)) {
      return new NextResponse(null, { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "5" } });
    }
    return new NextResponse(res.body, {
      status: 200,
      headers: { "Content-Type": type, "Cache-Control": "public, max-age=86400, s-maxage=86400" },
    });
  } catch {
    return new NextResponse(null, { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "5" } });
  }
}
