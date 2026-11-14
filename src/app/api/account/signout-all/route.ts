import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRequest } from "@/lib/auth-guard";
import { sessionUserId } from "../_shared";

export async function POST(req: Request) {
  const bad = checkRequest(req);
  if (bad) return NextResponse.json({ error: bad }, { status: 400 });
  const id = await sessionUserId();
  if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.user.update({ where: { id }, data: { passwordChangedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
