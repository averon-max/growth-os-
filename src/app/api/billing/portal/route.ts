import { NextResponse } from "next/server";
import { requireUser, requireWorkspaceAccess, authErrorResponse } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { stripe, isStripeConfigured } from "@/lib/stripe";

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Оплата пока не настроена" }, { status: 503 });
  }

  try {
    const user = await requireUser();
    const body = await request.json().catch(() => ({}));
    const workspaceId = body?.workspaceId;

    if (typeof workspaceId !== "string" || !workspaceId) {
      return NextResponse.json({ error: "Не указан воркспейс" }, { status: 400 });
    }

    const { role } = await requireWorkspaceAccess(user.id, workspaceId);
    if (role !== "OWNER") {
      return NextResponse.json({ error: "Подпиской управляет владелец воркспейса" }, { status: 403 });
    }

    const sub = await prisma.subscription.findUnique({ where: { workspaceId } });
    if (!sub?.stripeCustomerId) {
      return NextResponse.json({ error: "У воркспейса нет оплаты через Stripe" }, { status: 400 });
    }

    const base = (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
    const portal = await stripe().billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: `${base}/dashboard`,
    });

    return NextResponse.json({ url: portal.url });
  } catch (error) {
    const mapped = authErrorResponse(error);
    if (mapped.status === 500) console.error("[portal]", error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
