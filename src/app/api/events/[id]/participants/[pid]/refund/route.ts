import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; pid: string }> }
) {
  try {
    const authUser = await requireAuth();
    if (!["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const { id: eventId, pid } = await params;

    const participation = await prisma.eventParticipation.findUnique({
      where: { id: pid },
      include: { event: true },
    });

    if (!participation || participation.event.templeId !== authUser.templeId) {
      return NextResponse.json({ error: "申込が見つかりません" }, { status: 404 });
    }
    if (participation.event.id !== eventId) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    if (participation.paymentStatus !== "PAID") {
      return NextResponse.json({ error: "支払済みの申込のみ返金できます" }, { status: 400 });
    }
    if (!participation.stripePaymentIntentId) {
      return NextResponse.json({ error: "Stripe決済情報が見つかりません" }, { status: 400 });
    }

    // Stripe Refund API を呼び出す
    const refund = await stripe.refunds.create({
      payment_intent: participation.stripePaymentIntentId,
    });

    // 参加レコードを返金済みに更新（webhook でも更新されるが即時も反映）
    const updated = await prisma.eventParticipation.update({
      where: { id: pid },
      data: { paymentStatus: "REFUNDED" },
    });

    // 対応する Ofuse(EVENT_FEE) レコードを削除
    await prisma.ofuse.deleteMany({
      where: {
        memberId: participation.memberId,
        type: "EVENT_FEE",
        amount: participation.paymentAmount ?? undefined,
        notes: { contains: participation.event.title },
      },
    });

    return NextResponse.json({ refund: { id: refund.id, status: refund.status }, participation: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    console.error("Refund error:", err);
    return NextResponse.json({ error: "返金処理に失敗しました" }, { status: 500 });
  }
}
