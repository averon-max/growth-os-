import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireUser, authErrorResponse } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { DEFAULT_LAYOUT, sanitize } from "@/components/dashboard/board/layout";

/* The overview board layout of the signed-in user. */
const keyOf = (userId: string) => `board:${userId}`;

export async function GET() {
  try {
    const user = await requireUser();
    const row = await prisma.appSetting.findUnique({ where: { key: keyOf(user.id) } });
    return NextResponse.json({ layout: sanitize(row?.value) ?? DEFAULT_LAYOUT });
  } catch (err) {
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = (await req.json().catch(() => null)) as { layout?: unknown; reset?: boolean } | null;
    if (body?.reset) {
      await prisma.appSetting.deleteMany({ where: { key: keyOf(user.id) } });
      return NextResponse.json({ layout: DEFAULT_LAYOUT });
    }
    const layout = sanitize(body?.layout);
    if (!layout) return NextResponse.json({ error: "Invalid layout." }, { status: 400 });
    await prisma.appSetting.upsert({
      where: { key: keyOf(user.id) },
      create: { key: keyOf(user.id), value: layout as unknown as Prisma.InputJsonValue },
      update: { value: layout as unknown as Prisma.InputJsonValue },
    });
    return NextResponse.json({ layout });
  } catch (err) {
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
