import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    if (!authUser.member) {
      return NextResponse.json({ error: "会員情報が見つかりません" }, { status: 403 });
    }

    const { eventId, numGuests = 1 } = await request.json();

    if (!eventId) {
      return NextResponse.json({ error: "イベントIDが必要です" }, { status: 400 });
    }
    if (numGuests < 1 || numGuests > 6) {
      return NextResponse.json({ error: "参加人数は1〜6名で指定してください" }, { status: 400 });
    }

    const event = await prisma.event.findFirst({
      where: { id: eventId, templeId: authUser.templeId, status: "PUBLISHED" },
    });
    if (!event) {
      return NextResponse.json({ error: "イベントが見つかりません" }, { status: 404 });
    }
    if (event.fee === 0) {
      return NextResponse.json({ error: "無料イベントにはこのAPIを使用できません" }, { status: 400 });
    }
    if (event.visibility === "DANKA_ONLY" && authUser.member.type !== "DANKA") {
      return NextResponse.json({ error: "このイベントは檀家会員のみ申込できます" }, { status: 403 });
    }

    // 既存申込チェック（キャンセル済みは再申込可）
    const existing = await prisma.eventParticipation.findUnique({
      where: { eventId_memberId: { eventId, memberId: authUser.member.id } },
    });
    if (existing && existing.status !== "CANCELLED") {
      return NextResponse.json({ error: "既にこのイベントに申込済みです" }, { status: 400 });
    }

    // 定員チェック（満員の場合は checkout 経由ではなく通常申込でキャンセル待ちへ）
    if (event.capacity != null) {
      const currentTotal = await prisma.eventParticipation.aggregate({
        where: { eventId, status: { notIn: ["CANCELLED", "WAITLISTED"] } },
        _sum: { numGuests: true },
      });
      const usedSeats = currentTotal._sum.numGuests ?? 0;
      if (usedSeats + numGuests > event.capacity) {
        return NextResponse.json({ error: "定員に達しているため決済での申込はできません。通常申込でキャンセル待ちに登録してください。" }, { status: 409 });
      }
    }

    // 参加レコードを PENDING で作成/更新
    const participation = existing
      ? await prisma.eventParticipation.update({
          where: { id: existing.id },
          data: {
            numGuests,
            status: "APPLIED",
            paymentStatus: "PENDING",
            paymentAmount: event.fee * numGuests,
          },
        })
      : await prisma.eventParticipation.create({
          data: {
            eventId,
            memberId: authUser.member.id,
            numGuests,
            status: "APPLIED",
            paymentStatus: "PENDING",
            paymentAmount: event.fee * numGuests,
          },
        });

    // Stripe Checkout Session 作成
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL ??
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "jpy",
            product_data: {
              name: event.title,
              description: `${event.eventDate.toLocaleDateString("ja-JP")} ${event.startTime}〜${event.endTime}`,
            },
            unit_amount: event.fee, // JPY は小数なし
          },
          quantity: numGuests,
        },
      ],
      mode: "payment",
      success_url: `${baseUrl}/app/events/${eventId}/apply/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/app/events/${eventId}/apply`,
      locale: "ja",
      metadata: {
        participationId: participation.id,
        eventId,
        memberId: authUser.member.id,
      },
    });

    // Session ID を参加レコードに保存
    await prisma.eventParticipation.update({
      where: { id: participation.id },
      data: { stripeSessionId: session.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    console.error("Checkout session error:", err);
    return NextResponse.json({ error: "決済セッションの作成に失敗しました" }, { status: 500 });
  }
}
