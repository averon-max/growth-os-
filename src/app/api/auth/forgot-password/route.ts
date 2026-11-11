import { NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/password-reset";
import { checkRequest, clientIp, limit, normalizeEmail } from "@/lib/auth-guard";

export async function POST(req: Request) {
  const bad = checkRequest(req);
  if (bad) return NextResponse.json({ error: bad }, { status: 400 });

  let raw: unknown;
  try {
    raw = (await req.json())?.email;
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  const email = normalizeEmail(raw);
  if (!email) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });

  const ip = clientIp(req.headers);
  const okEmail = await limit("reset:" + email, 3, 60 * 60 * 1000);
  const okIp = await limit("reset-ip:" + ip, 15, 60 * 60 * 1000);

  // Over the limit we silently skip sending, but answer exactly the same — no hint about the account.
  if (okEmail && okIp) {
    const started = Date.now();
    try {
      await requestPasswordReset(email);
    } catch (error) {
      console.error("[forgot-password]", error);
    }
    // Pad to a steady response time so "email exists" (sends mail) isn't slower than "doesn't exist".
    const wait = 900 - (Date.now() - started);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  }

  return NextResponse.json({ ok: true });
}
