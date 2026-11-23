import { NextResponse } from "next/server";
import { requireUser, authErrorResponse } from "@/lib/auth-helpers";
import { checkRequest } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { stripe, isStripeConfigured } from "@/lib/stripe";

/** Opens Stripe's billing portal for the workspace this user owns (update card, download invoices). */
export async function POST(req: Request) {
  try {
    const bad = checkRequest(req);
    if (bad) return NextResponse.json({ error: bad }, { status: 400 });
    if (!isStripeConfigured()) return NextResponse.json({ error: "Billing is not available right now." }, { status: 503 });
    const user = await requireUser();
    const m = await prisma.workspaceMember.findFirst({ where: { userId: user.id, role: "OWNER" }, orderBy: { id: "asc" }, select: { workspaceId: true } });
    const sub = m ? await prisma.subscription.findUnique({ where: { workspaceId: m.workspaceId } }) : null;
    if (!sub?.stripeCustomerId) return NextResponse.json({ error: "There is no billing account yet. Choose a plan first." }, { status: 400 });
    const base = (process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
    const portal = await stripe().billingPortal.sessions.create({ customer: sub.stripeCustomerId, return_url: `${base}/dashboard/settings/billing` });
    return NextResponse.json({ url: portal.url });
  } catch (err) {
    const s = err as { type?: string; message?: string };
    if (typeof s?.type === "string" && s.type.startsWith("Stripe")) {
      console.error("[portal-self]", s.message);
      return NextResponse.json({ error: "The billing portal isn't available right now. Write to support@hyprlyx.com and we'll help." }, { status: 502 });
    }
    const { status, body } = authErrorResponse(err);
    return NextResponse.json(body, { status });
  }
}
