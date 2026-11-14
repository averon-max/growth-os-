import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkRequest, limit, passwordProblem } from "@/lib/auth-guard";
import { sessionUserId } from "../_shared";

export async function POST(req: Request) {
  const bad = checkRequest(req);
  if (bad) return NextResponse.json({ error: bad }, { status: 400 });
  const id = await sessionUserId();
  if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await limit("pw-change:" + id, 5, 15 * 60 * 1000))) {
    return NextResponse.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const current = typeof body?.current === "string" ? body.current : "";
  const next = typeof body?.next === "string" ? body.next : "";

  const user = await prisma.user.findUnique({ where: { id }, select: { email: true, passwordHash: true } });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await bcrypt.compare(current, user.passwordHash))) {
    return NextResponse.json({ error: "Current password is wrong." }, { status: 400 });
  }
  const problem = await passwordProblem(next, user.email);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  // Changing passwordChangedAt signs out every session, including this one; the client logs in again.
  await prisma.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(next, 12), passwordChangedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
