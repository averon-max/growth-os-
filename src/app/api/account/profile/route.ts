import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRequest } from "@/lib/auth-guard";
import { sessionUserId } from "../_shared";

export async function PUT(req: Request) {
  const bad = checkRequest(req);
  if (bad) return NextResponse.json({ error: bad }, { status: 400 });
  const id = await sessionUserId();
  if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = typeof body?.name === "string" ? body.name.replace(/[<>\u0000-\u001f]/g, "").trim().slice(0, 80) : "";
  await prisma.user.update({ where: { id }, data: { name: name || null } });
  return NextResponse.json({ ok: true, name });
}
