import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRequest, limit } from "@/lib/auth-guard";
import { closeBilling } from "@/lib/billing/close";
import { sendMail } from "@/lib/mail";
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
    select: { email: true, isAdmin: true, memberships: { select: { workspaceId: true, role: true } } },
  });
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (typeof body?.confirm !== "string" || body.confirm.trim().toLowerCase() !== user.email.toLowerCase()) {
    return NextResponse.json({ error: "Type your email exactly to confirm." }, { status: 400 });
  }

  const owned = user.memberships.filter((m) => m.role === "OWNER").map((m) => m.workspaceId);

  // Billing first: every subscription the user pays for is cancelled and their card removed.
  // If that fails, nothing is deleted, so the user can never be left paying for an account that no longer exists.
  let billing = { cancelled: 0, customersDeleted: 0 };
  try {
    billing = await closeBilling(owned);
  } catch (e) {
    console.error("[account/delete] billing", (e as Error).message);
    return NextResponse.json({ error: "We couldn't cancel your subscription with our payment processor, so your account was not deleted. Please try again in a few minutes or write to support@hyprlyx.com." }, { status: 502 });
  }

  await prisma.$transaction(async (tx) => {
    for (const workspaceId of owned) {
      const others = await tx.workspaceMember.count({ where: { workspaceId, userId: { not: id } } });
      if (others === 0) await tx.workspace.delete({ where: { id: workspaceId } }); // cascades to all its data
    }
    await tx.user.delete({ where: { id } });
  });

  await sendMail({
    to: user.email,
    subject: "Your Hyprlyx account has been deleted",
    text: [
      "Your Hyprlyx account and its data have been deleted.",
      billing.cancelled > 0 ? "Your subscription was cancelled. You won't be charged again." : "You had no active subscription.",
      billing.customersDeleted > 0 ? "Your saved payment card was removed from Stripe, our payment processor. Past invoices are kept as tax law requires." : "",
      "If you didn't do this, reply to this email right away.",
    ].filter(Boolean).join("\n\n"),
    html: `<p>Your Hyprlyx account and its data have been deleted.</p>${billing.cancelled > 0 ? "<p>Your subscription was cancelled. <b>You won't be charged again.</b></p>" : ""}${billing.customersDeleted > 0 ? "<p>Your saved payment card was removed from Stripe, our payment processor. Past invoices are kept as tax law requires.</p>" : ""}<p>If you didn't do this, reply to this email right away.</p>`,
    replyTo: "support@hyprlyx.com",
  }).catch((e: Error) => console.error("[account/delete] email", e.message));

  return NextResponse.json({ ok: true });
}
