import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logMemberActivity } from "@/lib/memberActivities";
import { sendWaitlistPromotedEmail } from "@/lib/email";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth();
    if (!authUser.member) {
      return NextResponse.json({ error: "会員情報が見つかりません" }, { status: 403 });
    }
    if (["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role)) {
      return NextResponse.json({ error: "管理者・スタッフはイベントへの申込ができません" }, { status: 403 });
    }

    const { id: eventId } = await params;
    const { numGuests = 1 } = await request.json();

    if (numGuests < 1 || numGuests > 6) {
      return NextResponse.json({ error: "参加人数は1〜6名で指定してください" }, { status: 400 });
    }

    // マルチテンプル対応: 全寺院のイベントを参照可能
    const event = await prisma.event.findFirst({
      where: { id: eventId, status: "PUBLISHED" },
    });
    if (!event) return NextResponse.json({ error: "イベントが見つかりません" }, { status: 404 });

    // Visibility check: DANKA_ONLY は自寺院の檀家のみ
    if (event.visibility === "DANKA_ONLY") {
      const isMyTempleDanka =
        authUser.member.type === "DANKA" && authUser.member.templeId === event.templeId;
      if (!isMyTempleDanka) {
        return NextResponse.json({ error: "このイベントは所属寺院の檀家会員のみ申込できます" }, { status: 403 });
      }
    }

    // Duplicate check
    const existing = await prisma.eventParticipation.findUnique({
      where: { eventId_memberId: { eventId, memberId: authUser.member.id } },
    });
    if (existing && existing.status !== "CANCELLED") {
      return NextResponse.json({ error: "既にこのイベントに申込済みです" }, { status: 400 });
    }

    // Capacity check
    let participationStatus: "APPLIED" | "WAITLISTED" = "APPLIED";
    if (event.capacity != null) {
      const currentTotal = await prisma.eventParticipation.aggregate({
        where: { eventId, status: { notIn: ["CANCELLED", "WAITLISTED"] } },
        _sum: { numGuests: true },
      });
      const usedSeats = currentTotal._sum.numGuests ?? 0;
      if (usedSeats + numGuests > event.capacity) {
        participationStatus = "WAITLISTED";
      }
    }

    // Upsert (re-apply if previously cancelled)
    const participation = existing
      ? await prisma.eventParticipation.update({
          where: { id: existing.id },
          data: { numGuests, status: participationStatus, paymentStatus: "NOT_REQUIRED" },
        })
      : await prisma.eventParticipation.create({
          data: {
            eventId,
            memberId: authUser.member.id,
            numGuests,
            status: participationStatus,
            paymentStatus: event.fee > 0 ? "PENDING" : "NOT_REQUIRED",
            paymentAmount: event.fee > 0 ? event.fee * numGuests : 0,
          },
        });

    // アクティビティログ（新規申込のみ）
    if (!existing || existing.status === "CANCELLED") {
      await logMemberActivity(authUser.member.id, "EVENT_APPLY", { eventId, title: event.title });
    }

    return NextResponse.json({ participation, status: participationStatus }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    return NextResponse.json({ error: "申込に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth();
    if (!authUser.member) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const { id: eventId } = await params;

    const participation = await prisma.eventParticipation.findUnique({
      where: { eventId_memberId: { eventId, memberId: authUser.member.id } },
    });
    if (!participation || participation.status === "CANCELLED") {
      return NextResponse.json({ error: "申込が見つかりません" }, { status: 404 });
    }

    const wasCounted = participation.status !== "WAITLISTED";

    await prisma.eventParticipation.update({
      where: { id: participation.id },
      data: { status: "CANCELLED" },
    });

    // キャンセル待ち繰り上げ
    if (wasCounted) {
      const firstWaitlisted = await prisma.eventParticipation.findFirst({
        where: { eventId, status: "WAITLISTED" },
        orderBy: { createdAt: "asc" },
        include: {
          member: { include: { user: { select: { email: true, name: true } } } },
          event: true,
        },
      });
      if (firstWaitlisted) {
        await prisma.eventParticipation.update({
          where: { id: firstWaitlisted.id },
          data: { status: "CONFIRMED" },
        });
        if (firstWaitlisted.member.user.email) {
          sendWaitlistPromotedEmail({
            to: firstWaitlisted.member.user.email,
            memberName: firstWaitlisted.member.user.name,
            eventTitle: firstWaitlisted.event.title,
            eventDate: firstWaitlisted.event.eventDate,
            startTime: firstWaitlisted.event.startTime,
            location: firstWaitlisted.event.location,
          }).catch(() => {});
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    return NextResponse.json({ error: "キャンセルに失敗しました" }, { status: 500 });
  }
}
