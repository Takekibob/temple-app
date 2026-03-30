import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getResend, FROM_EMAIL } from "@/lib/email";
import type { ParticipationStatus } from "@/generated/prisma/client";

// POST /api/events/[id]/send-bulk-email
// イベント参加者に一斉メールを送信する
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAdminOrStaff();
    const { id: eventId } = await params;

    const { subject, body, targetStatuses } = await request.json() as {
      subject: string;
      body: string;
      targetStatuses: string[];
    };

    if (!subject?.trim() || !body?.trim()) {
      return NextResponse.json({ error: "件名・本文は必須です" }, { status: 400 });
    }
    if (!Array.isArray(targetStatuses) || targetStatuses.length === 0) {
      return NextResponse.json({ error: "送信対象ステータスを選択してください" }, { status: 400 });
    }

    const event = await prisma.event.findFirst({
      where: { id: eventId, templeId: authUser.templeId },
    });
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const participations = await prisma.eventParticipation.findMany({
      where: {
        eventId,
        status: { in: targetStatuses as ParticipationStatus[] },
      },
      include: {
        member: { include: { user: { select: { email: true, name: true } } } },
      },
    });

    const emails = participations
      .map((p) => p.member.user.email)
      .filter((e): e is string => Boolean(e));

    if (emails.length === 0) {
      return NextResponse.json({ sent: 0, message: "送信対象がいませんでした" });
    }

    const resend = getResend();

    // 個別送信（BCCで一括も可能だが、個別の方がスパム判定が低い）
    const results = await Promise.allSettled(
      emails.map((to) =>
        resend.emails.send({
          from: `てらログ <${FROM_EMAIL}>`,
          to,
          subject: `【${event.title}】${subject}`,
          text: body,
        })
      )
    );

    const sent = results.filter((r) => r.status === "fulfilled").length;

    return NextResponse.json({ sent, total: emails.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
