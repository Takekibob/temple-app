import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

const BASE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

// POST /api/billing/portal — Stripe Customer Portal URL を発行
export async function POST() {
  try {
    const authUser = await requireAdmin();

    const temple = await prisma.temple.findUnique({
      where: { id: authUser.templeId },
      select: { stripeCustomerId: true },
    });

    if (!temple?.stripeCustomerId) {
      return NextResponse.json({ error: "Stripe カスタマー情報がありません" }, { status: 404 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: temple.stripeCustomerId,
      return_url: `${BASE_URL}/admin/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    console.error("[/api/billing/portal]", err);
    return NextResponse.json({ error: "ポータルURLの取得に失敗しました" }, { status: 500 });
  }
}
