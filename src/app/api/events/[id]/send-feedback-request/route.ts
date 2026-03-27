import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToMany } from "@/lib/push";

// POST /api/events/[id]/send-feedback-request
// イベント参加者（ATTENDED）にアンケート依頼プッシュ通知を送信
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAdminOrStaff();
    const { id: eventId } = await params;

    const event = await prisma.event.findFirst({
      where: { id: eventId, templeId: authUser.templeId },
      select: { id: true, title: true, status: true },
    });

    if (!event) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    // 参加済み（ATTENDED）の会員のuser_idを収集
    const attendedParticipations = await prisma.eventParticipation.findMany({
      where: { eventId, status: "ATTENDED" },
      select: { member: { select: { userId: true } } },
    });

    const userIds = [
      ...new Set(attendedParticipations.map((p) => p.member.userId)),
    ];

    if (userIds.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, message: "対象者なし" });
    }

    // プッシュ通知サブスクリプションを取得
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: { in: userIds }, templeId: authUser.templeId },
      select: { endpoint: true, p256dh: true, auth: true },
    });

    if (subscriptions.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, message: "プッシュ登録なし" });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const { sent, failed } = await sendPushToMany(subscriptions, {
      title: "ご参加ありがとうございました",
      body: `「${event.title}」にご参加いただきありがとうございました。ぜひ感想をお聞かせください。`,
      url: `${siteUrl}/app/events/${eventId}/feedback`,
    });

    return NextResponse.json({ ok: true, sent, failed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
