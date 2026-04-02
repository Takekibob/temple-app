import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendEventConfirmationEmail, sendWaitlistPromotedEmail } from "@/lib/email";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pid: string }> }
) {
  try {
    const authUser = await requireAuth();
    if (!["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const { id: eventId, pid } = await params;
    const { status } = await request.json();

    const VALID_STATUSES = ["APPLIED", "CONFIRMED", "WAITLISTED", "ATTENDED", "NO_SHOW", "CANCELLED"];
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: "不正なステータス値です" }, { status: 400 });
    }

    const event = await prisma.event.findFirst({ where: { id: eventId, templeId: authUser.templeId } });
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const participation = await prisma.eventParticipation.findFirst({
      where: { id: pid, eventId },
    });
    if (!participation) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.eventParticipation.update({
      where: { id: pid },
      data: { status },
    });

    // CANCELLED になったとき: 直前がCONFIRMED/APPLIEDならキャンセル待ちを繰り上げ
    if (status === "CANCELLED" && participation.status !== "CANCELLED" && participation.status !== "WAITLISTED") {
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

    // CONFIRMED になったときに確定メール＆個人宛お知らせを作成
    if (status === "CONFIRMED" && participation.status !== "CONFIRMED") {
      const full = await prisma.eventParticipation.findUnique({
        where: { id: pid },
        include: {
          member: { include: { user: { select: { email: true, name: true } } } },
          event: true,
        },
      });
      if (full) {
        if (full.member.user.email) {
          sendEventConfirmationEmail({
            to: full.member.user.email,
            memberName: full.member.user.name,
            eventTitle: full.event.title,
            eventDate: full.event.eventDate,
            startTime: full.event.startTime,
            location: full.event.location,
          }).catch(() => {});
        }
        const eventDateStr = full.event.eventDate.toLocaleDateString("ja-JP", {
          year: "numeric", month: "long", day: "numeric",
        });
        await prisma.announcement.create({
          data: {
            templeId: authUser.templeId,
            memberId: full.memberId,
            title: `「${full.event.title}」への参加が確定しました`,
            body: `${eventDateStr} ${full.event.startTime}〜${full.event.endTime} に開催される「${full.event.title}」への参加が確定しました。\n\n当日のご参加をお待ちしております。`,
            targetSegment: "ALL",
            publishedAt: new Date(),
          },
        });
      }
    }

    return NextResponse.json({ participation: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
