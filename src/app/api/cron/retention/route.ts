import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runRetention } from "@/lib/retention";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/** Called once a day by Vercel Cron. Vercel sends "Authorization: Bearer $CRON_SECRET". */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  const got = req.headers.get("authorization") ?? "";
  const want = `Bearer ${secret}`;
  const ok = secret.length >= 32 && got.length === want.length && timingSafeEqual(Buffer.from(got), Buffer.from(want));
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const started = Date.now();
  const result = await runRetention();
  console.log("[retention]", JSON.stringify(result));
  return NextResponse.json({ ok: true, ms: Date.now() - started, ...result });
}
