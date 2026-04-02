import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://teralog.app";

export async function POST() {
  try {
    const authUser = await requireAdmin();

    const temple = await prisma.temple.findUnique({
      where: { id: authUser.templeId },
      select: { id: true, name: true, stripeConnectAccountId: true, stripeConnectOnboarded: true },
    });
    if (!temple) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    // 既にオンボーディング完了済み
    if (temple.stripeConnectOnboarded && temple.stripeConnectAccountId) {
      return NextResponse.json({ alreadyOnboarded: true });
    }

    // Connect アカウントがなければ新規作成
    let accountId = temple.stripeConnectAccountId;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "JP",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: { templeId: temple.id },
      });
      accountId = account.id;
      await prisma.temple.update({
        where: { id: temple.id },
        data: { stripeConnectAccountId: accountId },
      });
    }

    // オンボーディングリンクを生成
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${SITE_URL}/admin/billing?connect=refresh`,
      return_url: `${SITE_URL}/admin/billing?connect=return`,
      type: "account_onboarding",
      collection_options: { fields: "eventually_due" },
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED" || msg === "FORBIDDEN") {
      return NextResponse.json({ error: msg }, { status: 403 });
    }
    console.error("Stripe Connect onboard error:", err);
    return NextResponse.json({ error: "エラーが発生しました" }, { status: 500 });
  }
}
