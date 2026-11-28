import { NextResponse } from "next/server";
import { googleTokens, handOver, purgeLooseRows, revokeGoogleTokens } from "@/lib/account-purge";
import { requireAdmin, authErrorResponse } from "@/lib/auth-helpers";
import { checkRequest } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { requestPasswordReset } from "@/lib/password-reset";
import { audit } from "@/lib/admin/core";
import { closeBilling } from "@/lib/billing/close";
import { blockedKey, forgetBlocked } from "@/lib/billing/blocked";

/*
 * Actions on one user. Body: { userId, action, ... }
 *   setAdmin { isAdmin }   make or remove an admin (never yourself)
 *   sections { blocked }   close dashboard sections for this user (list of section keys; [] opens all)
 *   signOut                end every session on every device
 *   sendReset              email a password reset link
 *   delete { confirm }     delete the account; confirm must be the user's email.
 *                          Workspaces where they are the only member are deleted with all their data.
 */
export async function POST(request: Request) {
  try {
    const bad = checkRequest(request);
    if (bad) return NextResponse.json({ error: bad }, { status: 400 });
    const admin = await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const userId = body?.userId;
    // Old admin page sent { userId, isAdmin } without an action.
    const action = typeof body?.action === "string" ? body.action : typeof body?.isAdmin === "boolean" ? "setAdmin" : "";
    if (typeof userId !== "string" || !userId) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, isAdmin: true, memberships: { select: { workspaceId: true, role: true } } },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const target = { type: "user" as const, id: user.id, label: user.email };
    const self = user.id === admin.id;

    switch (action) {
      case "setAdmin": {
        if (typeof body.isAdmin !== "boolean") return NextResponse.json({ error: "Invalid data" }, { status: 400 });
        if (self && !body.isAdmin) return NextResponse.json({ error: "You can't remove your own admin rights." }, { status: 400 });
        await prisma.user.update({ where: { id: user.id }, data: { isAdmin: body.isAdmin } });
        await audit(admin, body.isAdmin ? "admin.grant" : "admin.remove", target);
        return NextResponse.json({ ok: true });
      }
      case "sections": {
        const list = Array.isArray(body.blocked) ? [...new Set((body.blocked as unknown[]).filter((x): x is string => typeof x === "string" && /^[a-z-]{2,40}$/.test(x)))] : null;
        if (!list) return NextResponse.json({ error: "Invalid data" }, { status: 400 });
        const key = blockedKey(user.id);
        if (list.length === 0) await prisma.appSetting.deleteMany({ where: { key } });
        else await prisma.appSetting.upsert({ where: { key }, create: { key, value: list }, update: { value: list } });
        forgetBlocked(user.id);
        await audit(admin, "user.sections", target, { blocked: list });
        return NextResponse.json({ ok: true, blocked: list });
      }
      case "signOut": {
        await prisma.user.update({ where: { id: user.id }, data: { passwordChangedAt: new Date() } });
        await audit(admin, "user.signout_all", target);
        return NextResponse.json({ ok: true });
      }
      case "sendReset": {
        await requestPasswordReset(user.email);
        await audit(admin, "user.send_reset", target);
        return NextResponse.json({ ok: true });
      }
      case "delete": {
        if (self) return NextResponse.json({ error: "You can't delete your own account here." }, { status: 400 });
        if (user.isAdmin) return NextResponse.json({ error: "Remove admin rights first." }, { status: 400 });
        if (typeof body.confirm !== "string" || body.confirm.trim().toLowerCase() !== user.email.toLowerCase()) {
          return NextResponse.json({ error: "Type the user's email exactly to confirm." }, { status: 400 });
        }
        const owned = user.memberships.filter((m) => m.role === "OWNER").map((m) => m.workspaceId);
        // Stop billing first (cancel subscriptions now, delete the Stripe customer and its cards). If Stripe fails, nothing is deleted.
        let billing = { cancelled: 0, customersDeleted: 0 };
        try {
          billing = await closeBilling(owned);
        } catch (e) {
          return NextResponse.json({ error: `Stripe refused, nothing was deleted: ${(e as Error).message}` }, { status: 502 });
        }
        const solo: string[] = [];
        const shared: string[] = [];
        for (const workspaceId of owned) {
          const others = await prisma.workspaceMember.count({ where: { workspaceId, userId: { not: user.id } } });
          (others === 0 ? solo : shared).push(workspaceId);
        }
        const tokens = await googleTokens(solo);
        await prisma.$transaction(async (tx) => {
          await handOver(tx, shared, user.id);
          await purgeLooseRows(tx, solo);
          for (const workspaceId of solo) await tx.workspace.delete({ where: { id: workspaceId } });
          await tx.user.delete({ where: { id: user.id } });
        });
        const googleRevoked = await revokeGoogleTokens(tokens);
        await audit(admin, "user.delete", target, { removedWorkspaces: solo.length, handedOver: shared.length, googleRevoked, ...billing });
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    const mapped = authErrorResponse(error);
    if (mapped.status === 500) console.error("[admin/user]", error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
