import { NextResponse } from "next/server";
import { requireAdmin, authErrorResponse } from "@/lib/auth-helpers";
import { checkRequest } from "@/lib/auth-guard";
import { runRetention } from "@/lib/retention";
import { audit } from "@/lib/admin/core";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/** Runs the nightly cleanup now, so an admin can see that expired data really is removed. */
export async function POST(req: Request) {
  try {
    const bad = checkRequest(req);
    if (bad) return NextResponse.json({ error: bad }, { status: 400 });
    const admin = await requireAdmin();
    const result = await runRetention("admin");
    const removed = Object.entries(result.deleted).filter(([k]) => !k.endsWith(":error")).reduce((n, [, v]) => n + v, 0);
    await audit(admin, "cleanup.run", { type: "workspace", label: "all workspaces" }, { removed, databaseMB: result.databaseMB });
    return NextResponse.json(result);
  } catch (err) {
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
