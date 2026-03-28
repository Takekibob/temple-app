import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/billing/status — 現在の契約状況を取得
export async function GET() {
  try {
    const authUser = await requireAdmin();

    const temple = await prisma.temple.findUnique({
      where: { id: authUser.templeId },
      select: {
        planStatus: true,
        trialEndsAt: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    });

    if (!temple) {
      return NextResponse.json({ error: "寺院が見つかりません" }, { status: 404 });
    }

    // トライアル残り日数
    let trialDaysRemaining: number | null = null;
    if (temple.planStatus === "TRIAL" && temple.trialEndsAt) {
      const diff = temple.trialEndsAt.getTime() - Date.now();
      trialDaysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    // Stripe サブスクリプション情報
    let currentPeriodEnd: Date | null = null;
    if (temple.stripeSubscriptionId) {
      try {
        const { getStripe } = await import("@/lib/stripe");
        const stripe = getStripe();
        const sub = await stripe.subscriptions.retrieve(temple.stripeSubscriptionId);
        currentPeriodEnd = new Date((sub as unknown as { current_period_end: number }).current_period_end * 1000);
      } catch {
        // Stripe エラーは無視（DBの値を返す）
      }
    }

    return NextResponse.json({
      planStatus: temple.planStatus,
      trialEndsAt: temple.trialEndsAt,
      trialDaysRemaining,
      currentPeriodEnd,
      hasStripeCustomer: !!temple.stripeCustomerId,
      hasSubscription: !!temple.stripeSubscriptionId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
