import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

const PRICE_ID = process.env.STRIPE_SUBSCRIPTION_PRICE_ID;

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

// POST /api/billing/create-subscription — Stripe Checkout Session 作成（subscription モード）
export async function POST() {
  try {
    const authUser = await requireAdmin();

    if (!PRICE_ID) {
      return NextResponse.json({ error: "サービスの設定が完了していません。管理者にお問い合わせください。" }, { status: 500 });
    }

    const temple = await prisma.temple.findUnique({
      where: { id: authUser.templeId },
      select: { id: true, name: true, planStatus: true, stripeCustomerId: true },
    });

    if (!temple) {
      return NextResponse.json({ error: "寺院が見つかりません" }, { status: 404 });
    }

    if (temple.planStatus === "ACTIVE") {
      return NextResponse.json({ error: "既にサブスクリプションが有効です" }, { status: 400 });
    }

    // Stripe Customer を取得または作成
    let customerId = temple.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        name: temple.name,
        email: authUser.email,
        metadata: { templeId: temple.id },
      });
      customerId = customer.id;
      await prisma.temple.update({
        where: { id: temple.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // Checkout Session 作成（subscription モード）
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      mode: "subscription",
      success_url: `${BASE_URL}/admin/billing?success=1`,
      cancel_url: `${BASE_URL}/admin/billing?cancelled=1`,
      locale: "ja",
      metadata: { templeId: temple.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    console.error("[/api/billing/create-subscription]", err);
    return NextResponse.json({ error: "決済セッションの作成に失敗しました" }, { status: 500 });
  }
}
