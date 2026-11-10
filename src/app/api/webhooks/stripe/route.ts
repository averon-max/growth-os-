import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { syncSubscription } from "@/lib/billing/stripe-sync";
import { DEFAULT_PLAN_ID } from "@/lib/billing/plans";

export const dynamic = "force-dynamic";

async function workspaceIdFor(subscription: Stripe.Subscription): Promise<string | null> {
  const fromMetadata = subscription.metadata?.workspaceId;
  if (fromMetadata) return fromMetadata;

  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;

  const existing = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
    select: { workspaceId: true },
  });

  return existing?.workspaceId ?? null;
}

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "no webhook secret" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "no signature" }, { status: 400 });
  }

  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    console.error("[stripe-webhook] подпись не сошлась", error);
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  // Stripe повторяет доставку — один и тот же event обрабатываем ровно раз.
  try {
    await prisma.stripeEvent.create({ data: { id: event.id, type: event.type } });
  } catch {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const workspaceId = session.client_reference_id ?? session.metadata?.workspaceId;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        if (workspaceId && subscriptionId) {
          const subscription = await stripe().subscriptions.retrieve(subscriptionId);
          await syncSubscription(workspaceId, subscription);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const workspaceId = await workspaceIdFor(subscription);
        if (workspaceId) await syncSubscription(workspaceId, subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const workspaceId = await workspaceIdFor(subscription);
        if (workspaceId) {
          await prisma.subscription.updateMany({
            where: { workspaceId, source: "stripe" },
            data: {
              plan: DEFAULT_PLAN_ID,
              status: "canceled",
              cancelAtPeriodEnd: false,
            },
          });
        }
        break;
      }

      default:
        break;
    }
  } catch (error) {
    console.error("[stripe-webhook] ошибка обработки", event.type, error);
    // Удаляем отметку, чтобы Stripe повторил доставку.
    await prisma.stripeEvent.delete({ where: { id: event.id } }).catch(() => {});
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
