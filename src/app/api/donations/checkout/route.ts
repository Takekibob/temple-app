import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

// POST /api/donations/checkout — 公開寄付Stripeリンク生成（認証不要）
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { templeId, amount, purpose, purposeDetail, donorName, donorEmail } = body;

  if (!templeId || !amount || !donorEmail) {
    return NextResponse.json({ error: "templeId, amount, donorEmail are required" }, { status: 400 });
  }

  const temple = await prisma.temple.findUnique({
    where: { id: templeId, isActive: true },
    select: { name: true },
  });
  if (!temple) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  // 寄付レコードを先に作成（pending扱い）
  const donation = await prisma.donation.create({
    data: {
      templeId,
      amount: Number(amount),
      purpose: purpose ?? "GENERAL",
      purposeDetail: purposeDetail || null,
      paymentMethod: "ONLINE",
      donorName: donorName || null,
      donorEmail,
    },
  });

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: donorEmail,
    line_items: [
      {
        price_data: {
          currency: "jpy",
          unit_amount: Number(amount),
          product_data: {
            name: `${temple.name}へのご寄付${purposeDetail ? `（${purposeDetail}）` : ""}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      donationId: donation.id,
      templeId,
    },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://teralog.app"}/donate/${templeId}/thanks`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://teralog.app"}/donate/${templeId}`,
  });

  await prisma.donation.update({
    where: { id: donation.id },
    data: { stripePaymentIntentId: session.payment_intent as string | null },
  });

  return NextResponse.json({ url: session.url });
}
