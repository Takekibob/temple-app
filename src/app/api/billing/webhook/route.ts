import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import Stripe from "stripe";
import type { PlanStatus } from "@/generated/prisma/enums";

/**
 * POST /api/billing/webhook
 *
 * Stripe サブスクリプション Webhook ハンドラー
 *
 * Stripe Dashboard で登録するエンドポイント URL:
 *   https://[your-domain]/api/billing/webhook
 *
 * リッスンするイベント:
 *   - checkout.session.completed       → ACTIVE に更新
 *   - customer.subscription.updated    → ステータス同期
 *   - customer.subscription.deleted    → CANCELLED に更新
 *   - invoice.payment_failed           → PAST_DUE に更新
 *   - invoice.payment_succeeded        → ACTIVE に戻す
 */
export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_BILLING_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[billing/webhook] STRIPE_BILLING_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[billing/webhook] Signature verification failed:", msg);
    return NextResponse.json({ error: `Webhook signature verification failed: ${msg}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;

        const templeId = session.metadata?.templeId;
        const subscriptionId = session.subscription as string | null;
        if (!templeId || !subscriptionId) break;

        await prisma.temple.update({
          where: { id: templeId },
          data: {
            planStatus: "ACTIVE",
            stripeSubscriptionId: subscriptionId,
          },
        });
        console.log(`[billing/webhook] checkout.session.completed → temple ${templeId} → ACTIVE`);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const temple = await findTempleBySubscriptionOrCustomer(sub.id, sub.customer as string);
        if (!temple) break;

        const planStatus = stripeStatusToPlanStatus(sub.status);
        await prisma.temple.update({
          where: { id: temple.id },
          data: { planStatus, stripeSubscriptionId: sub.id },
        });
        console.log(`[billing/webhook] subscription.updated → temple ${temple.id} → ${planStatus}`);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const temple = await findTempleBySubscriptionOrCustomer(sub.id, sub.customer as string);
        if (!temple) break;

        await prisma.temple.update({
          where: { id: temple.id },
          data: { planStatus: "CANCELLED" },
        });
        console.log(`[billing/webhook] subscription.deleted → temple ${temple.id} → CANCELLED`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const temple = await prisma.temple.findFirst({
          where: { stripeCustomerId: customerId },
          select: { id: true },
        });
        if (!temple) break;

        await prisma.temple.update({
          where: { id: temple.id },
          data: { planStatus: "PAST_DUE" },
        });
        console.log(`[billing/webhook] invoice.payment_failed → temple ${temple.id} → PAST_DUE`);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        // billing_reason = "subscription_create" は checkout.session.completed でハンドル済み
        if (invoice.billing_reason === "subscription_create") break;

        const customerId = invoice.customer as string;
        const temple = await prisma.temple.findFirst({
          where: { stripeCustomerId: customerId },
          select: { id: true, planStatus: true },
        });
        if (!temple) break;

        // PAST_DUE → ACTIVE に戻す
        if (temple.planStatus === "PAST_DUE") {
          await prisma.temple.update({
            where: { id: temple.id },
            data: { planStatus: "ACTIVE" },
          });
          console.log(`[billing/webhook] invoice.payment_succeeded → temple ${temple.id} → ACTIVE`);
        }
        break;
      }

      default:
        // 未処理のイベントは無視
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[billing/webhook] Handler error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** Stripe サブスクリプションステータス → Temple.planStatus 変換 */
function stripeStatusToPlanStatus(stripeStatus: string): PlanStatus {
  switch (stripeStatus) {
    case "active":
      return "ACTIVE";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
    case "cancelled":
      return "CANCELLED";
    case "unpaid":
      return "SUSPENDED";
    default:
      return "PAST_DUE";
  }
}

/** subscriptionId または customerId で寺院を検索 */
async function findTempleBySubscriptionOrCustomer(
  subscriptionId: string,
  customerId: string
) {
  // まず subscriptionId で検索
  let temple = await prisma.temple.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
    select: { id: true },
  });

  // なければ customerId で検索（初回 subscription.updated 時など）
  if (!temple) {
    temple = await prisma.temple.findFirst({
      where: { stripeCustomerId: customerId },
      select: { id: true },
    });
  }

  return temple;
}
