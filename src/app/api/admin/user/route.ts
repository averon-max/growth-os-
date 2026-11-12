import { NextResponse } from "next/server";
import { requireAdmin, authErrorResponse } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const userId = body?.userId;
    const isAdmin = body?.isAdmin;

    if (typeof userId !== "string" || typeof isAdmin !== "boolean") {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    // Не даём снять права с самого себя — иначе можно запереть себя снаружи.
    if (userId === admin.id && !isAdmin) {
      return NextResponse.json(
        { error: "You can't remove your own admin rights" },
        { status: 400 }
      );
    }

    await prisma.user.update({ where: { id: userId }, data: { isAdmin } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const mapped = authErrorResponse(error);
    if (mapped.status === 500) console.error("[admin/user]", error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
