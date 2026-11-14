import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRequest, limit } from "@/lib/auth-guard";
import { sessionUserId } from "../_shared";

export async function POST(req: Request) {
  const bad = checkRequest(req);
  if (bad) return NextResponse.json({ error: bad }, { status: 400 });
  const id = await sessionUserId();
  if (!id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await limit("delete-account:" + id, 3, 60 * 60 * 1000))) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const user = await prisma.user.findUnique({
    where: { id },
    select: { email: true, memberships: { select: { workspaceId: true, role: true } } },
  });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (typeof body?.confirm !== "string" || body.confirm.trim().toLowerCase() !== user.email) {
    return NextResponse.json({ error: "Type your email exactly to confirm." }, { status: 400 });
  }

  const owned = user.memberships.filter((m) => m.role === "OWNER").map((m) => m.workspaceId);
  const paid = await prisma.subscription.findFirst({
    where: { workspaceId: { in: owned }, source: "stripe", status: { in: ["active", "trialing", "past_due"] }, plan: { not: "FREE" } },
    select: { id: true },
  });
  if (paid) {
    return NextResponse.json({ error: "Cancel your paid subscription first (Settings → Billing), then delete the account." }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    for (const workspaceId of owned) {
      const others = await tx.workspaceMember.count({ where: { workspaceId, userId: { not: id } } });
      if (others === 0) await tx.workspace.delete({ where: { id: workspaceId } }); // cascades to all its data
    }
    await tx.user.delete({ where: { id } });
  });
  return NextResponse.json({ ok: true });
}
