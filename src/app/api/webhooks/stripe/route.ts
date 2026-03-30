import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

// Next.js App Router では bodyParser を無効化不要
// request.text() で生のボディを取得できる
export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("Stripe webhook signature verification failed:", msg);
    return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        await handleChargeRefunded(charge);
        break;
      }
      default:
        // 未処理のイベントは無視
        break;
    }
  } catch (err) {
    console.error(`Webhook handler error for ${event.type}:`, err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { eventId, memberId, numGuests: numGuestsStr } = session.metadata ?? {};
  if (!eventId || !memberId) {
    console.error("checkout.session.completed: missing eventId or memberId in metadata");
    return;
  }
  const numGuests = Number(numGuestsStr ?? "1");

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent as Stripe.PaymentIntent | null)?.id ?? null;

  // 冪等性: 既に PAID なら処理しない
  const existing = await prisma.eventParticipation.findUnique({
    where: { eventId_memberId: { eventId, memberId } },
  });
  if (existing?.paymentStatus === "PAID") return;

  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return;

  const paymentAmount = event.fee * numGuests;

  // 決済完了後に参加レコードを作成（またはキャンセル済みを更新）
  const participation = existing
    ? await prisma.eventParticipation.update({
        where: { id: existing.id },
        data: {
          numGuests,
          status: "CONFIRMED",
          paymentStatus: "PAID",
          paymentAmount,
          stripeSessionId: session.id,
          stripePaymentIntentId: paymentIntentId,
        },
        include: { event: true },
      })
    : await prisma.eventParticipation.create({
        data: {
          eventId,
          memberId,
          numGuests,
          status: "CONFIRMED",
          paymentStatus: "PAID",
          paymentAmount,
          stripeSessionId: session.id,
          stripePaymentIntentId: paymentIntentId,
        },
        include: { event: true },
      });

  // お布施テーブルに EVENT_FEE として記録
  await prisma.ofuse.create({
    data: {
      templeId: participation.event.templeId,
      memberId,
      type: "EVENT_FEE",
      amount: paymentAmount,
      paidAt: new Date(),
      paymentMethod: "ONLINE",
      receiptIssued: false,
      notes: `イベント「${participation.event.title}」参加費 ${numGuests}名`,
    },
  });
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const paymentIntentId =
    typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : (charge.payment_intent as Stripe.PaymentIntent | null)?.id ?? null;

  if (!paymentIntentId) {
    console.error("charge.refunded: missing payment_intent");
    return;
  }

  // stripePaymentIntentId で参加レコードを特定して返金済みに更新
  await prisma.eventParticipation.updateMany({
    where: { stripePaymentIntentId: paymentIntentId },
    data: { paymentStatus: "REFUNDED" },
  });
}
