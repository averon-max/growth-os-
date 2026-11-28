import { NextResponse } from "next/server";
import { requireAdmin, authErrorResponse } from "@/lib/auth-helpers";
import { checkRequest } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/admin/core";
import { setBudgetOverride } from "@/lib/billing/data-budget";

/*
 * Admin only: set one workspace's paid-data allowance in USD. Body: { workspaceId, perDay, perMonth }.
 * null (or empty) = use the plan's allowance. Every change is written to the audit log.
 */
const amount = (v: unknown): number | null | "bad" => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 1000 ? Math.round(n * 100) / 100 : "bad";
};

export async function POST(request: Request) {
  try {
    const bad = checkRequest(request);
    if (bad) return NextResponse.json({ error: bad }, { status: 400 });
    const admin = await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const workspaceId = typeof body?.workspaceId === "string" ? body.workspaceId : "";
    const perDay = amount(body?.perDay);
    const perMonth = amount(body?.perMonth);
    if (!workspaceId || perDay === "bad" || perMonth === "bad") return NextResponse.json({ error: "Amounts must be between $0 and $1,000." }, { status: 400 });
    const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { id: true } });
    if (!ws) return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
    await setBudgetOverride(workspaceId, { perDay, perMonth });
    await audit(admin, "budget.set", { type: "workspace", id: workspaceId }, { perDay, perMonth });
    return NextResponse.json({ ok: true, perDay, perMonth });
  } catch (err) {
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
