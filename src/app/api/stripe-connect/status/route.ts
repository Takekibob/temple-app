import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function GET() {
  try {
    const authUser = await requireAdmin();

    const temple = await prisma.temple.findUnique({
      where: { id: authUser.templeId },
      select: { stripeConnectAccountId: true, stripeConnectOnboarded: true },
    });
    if (!temple) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    // Connect アカウントなし
    if (!temple.stripeConnectAccountId) {
      return NextResponse.json({ connected: false, onboarded: false });
    }

    // Stripe側の最新ステータスを確認
    const account = await stripe.accounts.retrieve(temple.stripeConnectAccountId);
    const onboarded = account.details_submitted && (account.charges_enabled ?? false);

    // DBのフラグが古ければ更新
    if (onboarded && !temple.stripeConnectOnboarded) {
      await prisma.temple.update({
        where: { id: authUser.templeId },
        data: { stripeConnectOnboarded: true },
      });
    }

    return NextResponse.json({
      connected: true,
      onboarded,
      accountId: temple.stripeConnectAccountId,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: msg }, { status: 403 });
    }
    console.error("Stripe Connect status error:", err);
    return NextResponse.json({ error: "エラーが発生しました" }, { status: 500 });
  }
}
