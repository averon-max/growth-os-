import { NextResponse } from "next/server";
import { completePasswordReset } from "@/lib/password-reset";
import { checkRequest, clientIp, limit } from "@/lib/auth-guard";

export async function POST(req: Request) {
  const bad = checkRequest(req);
  if (bad) return NextResponse.json({ error: bad }, { status: 400 });

  let token = "";
  let password = "";
  try {
    const body = await req.json();
    token = typeof body?.token === "string" ? body.token.slice(0, 200) : "";
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (!token) return NextResponse.json({ error: "This link is invalid." }, { status: 400 });

  if (!(await limit("reset-confirm-ip:" + clientIp(req.headers), 15, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  const result = await completePasswordReset(token, password);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.reason === "weak" ? result.message : "This link has expired or was already used. Request a new one." },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true });
}
