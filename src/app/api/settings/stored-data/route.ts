import { NextResponse } from "next/server";
import { requireUser, authErrorResponse } from "@/lib/auth-helpers";
import { checkRequest } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { countStores, deleteStore } from "@/lib/data-stores";

export const dynamic = "force-dynamic";

/** The workspace the user owns or administers (only they may delete its data). */
async function workspace(userId: string) {
  const m = await prisma.workspaceMember.findFirst({ where: { userId, role: { in: ["OWNER", "ADMIN"] } }, orderBy: { createdAt: "asc" }, select: { workspaceId: true } });
  return m?.workspaceId ?? null;
}

/** GET: every kind of saved data with its row count. */
export async function GET() {
  try {
    const user = await requireUser();
    const ws = await workspace(user.id);
    if (!ws) return NextResponse.json({ error: "Only workspace owners can see this." }, { status: 403 });
    return NextResponse.json({ stores: await countStores(ws) });
  } catch (err) {
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}

/** DELETE ?store=key: deletes it, then counts again so the answer proves it is gone. */
export async function DELETE(req: Request) {
  try {
    const bad = checkRequest(req);
    if (bad) return NextResponse.json({ error: bad }, { status: 400 });
    const user = await requireUser();
    const ws = await workspace(user.id);
    if (!ws) return NextResponse.json({ error: "Only workspace owners can delete data." }, { status: 403 });
    const key = new URL(req.url).searchParams.get("store") ?? "";
    const deleted = await deleteStore(ws, key);
    const stores = await countStores(ws);
    const left = stores.find((s) => s.key === key)?.rows ?? 0;
    console.log(`[stored-data] workspace ${ws} deleted ${deleted} rows of ${key}; ${left} left`);
    return NextResponse.json({ deleted, left, stores });
  } catch (err) {
    if (err instanceof Error && err.message === "Unknown data kind.") return NextResponse.json({ error: err.message }, { status: 400 });
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
