import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type { PlanStatus } from "@/generated/prisma/client";

const BILLING_WEBHOOK_SECRET = process.env.STRIPE_BILLING_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }
  if (!BILLING_WEBHOOK_SECRET) {
    console.error("STRIPE_BILLING_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, BILLING_WEBHOOK_SECRET);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("Stripe billing webhook signature verification failed:", msg);
    return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await updateTempleByCustomer(sub.customer as string, {
          planStatus: "CANCELLED",
          stripeSubscriptionId: null,
        });
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.customer) {
          await updateTempleByCustomer(invoice.customer as string, { planStatus: "PAST_DUE" });
        }
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string | null };
        // サブスクリプション請求のみ処理（初回以外の自動更新も含む）
        if (invoice.customer && invoice.subscription) {
          await updateTempleByCustomer(invoice.customer as string, { planStatus: "ACTIVE" });
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error(`Billing webhook handler error for ${event.type}:`, err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleSubscriptionChange(sub: Stripe.Subscription) {
  const statusMap: Record<string, PlanStatus> = {
    active: "ACTIVE",
    past_due: "PAST_DUE",
    canceled: "CANCELLED",
    unpaid: "PAST_DUE",
    trialing: "TRIAL",
    paused: "PAST_DUE",
  };

  const planStatus = statusMap[sub.status] ?? "PAST_DUE";

  await updateTempleByCustomer(sub.customer as string, {
    planStatus,
    stripeSubscriptionId: sub.id,
  });
}

async function updateTempleByCustomer(
  customerId: string,
  data: { planStatus?: PlanStatus; stripeSubscriptionId?: string | null }
) {
  await prisma.temple.updateMany({
    where: { stripeCustomerId: customerId },
    data,
  });
}
