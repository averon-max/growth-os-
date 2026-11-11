import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRequest } from "@/lib/auth-guard";
import { normalize } from "@/lib/retention";

async function ownedWorkspace() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return null;
  const m = await prisma.workspaceMember.findFirst({
    where: { userId, role: { in: ["OWNER", "ADMIN"] } },
    orderBy: { createdAt: "asc" },
    select: { workspaceId: true },
  });
  return m?.workspaceId ?? null;
}

export async function GET() {
  const id = await ownedWorkspace();
  if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const w = await prisma.workspace.findUnique({ where: { id }, select: { retention: true } });
  return NextResponse.json({ settings: normalize(w?.retention) });
}

export async function PUT(req: Request) {
  const bad = checkRequest(req);
  if (bad) return NextResponse.json({ error: bad }, { status: 400 });
  const id = await ownedWorkspace();
  if (!id) return NextResponse.json({ error: "Only workspace owners can change this." }, { status: 403 });
  const body = await req.json().catch(() => null);
  const settings = normalize(body?.settings);
  await prisma.workspace.update({ where: { id }, data: { retention: settings } });
  return NextResponse.json({ settings });
}
