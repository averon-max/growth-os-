import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isUserAdmin } from "@/lib/auth-helpers";
import { checkRequest } from "@/lib/auth-guard";

export async function PATCH(req: Request) {
  const bad = checkRequest(req);
  if (bad) return NextResponse.json({ error: bad }, { status: 400 });
  const s = await getServerSession(authOptions);
  const uid = (s?.user as { id?: string } | undefined)?.id;
  if (!uid || !(await isUserAdmin(uid))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  const status = ["open", "pending", "closed"].includes(body?.status) ? body.status : null;
  if (typeof body?.id !== "string" || !status) return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  await prisma.supportTicket.update({ where: { id: body.id }, data: { status } });
  return NextResponse.json({ ok: true });
}
