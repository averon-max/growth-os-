import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runRetention } from "@/lib/retention";
import { refreshAllCloudflare, refreshAllSearchConsole } from "@/lib/traffic/refresh";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/** Called once a day by Vercel Cron. Vercel sends "Authorization: Bearer $CRON_SECRET". */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  const got = req.headers.get("authorization") ?? "";
  const want = `Bearer ${secret}`;
  const ok = secret.length >= 32 && got.length === want.length && timingSafeEqual(Buffer.from(got), Buffer.from(want));
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await runRetention();
  console.log("[retention]", JSON.stringify(result));

  // Same daily run keeps every connected Cloudflare site up to date (one cron instead of two).
  const cloudflare = await refreshAllCloudflare(110_000).catch((error) => ({ error: error instanceof Error ? error.message : "failed" }));
  console.log("[cloudflare refresh]", JSON.stringify(cloudflare));

  // …and pulls Search Console queries into Keywords, so Keyword Planner and Competitors never sit empty.
  const searchConsole = await refreshAllSearchConsole(110_000).catch((error) => ({ error: error instanceof Error ? error.message : "failed" }));
  console.log("[search console refresh]", JSON.stringify(searchConsole));

  return NextResponse.json({ ok: true, ...result, cloudflare, searchConsole });
}
