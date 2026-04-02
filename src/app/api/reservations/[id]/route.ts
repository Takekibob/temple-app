import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activityLog";

const RESERVATION_TYPE_LABELS: Record<string, string> = {
  ANNUAL_MEMORIAL: "年忌法要",
  MONTHLY_MEMORIAL: "月命日",
  NIBON: "新盆",
  KUYO: "供養",
  FUNERAL: "葬儀",
  OTHER: "法要",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth();
    const { id } = await params;

    const reservation = await prisma.reservation.findFirst({
      where: { id, templeId: authUser.templeId },
      include: {
        member: { include: { user: { select: { name: true, email: true, phone: true } } } },
        deceasedPerson: true,
      },
    });

    if (!reservation) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Members can only see their own
    if (authUser.role === "MEMBER" && reservation.memberId !== authUser.member?.id) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    return NextResponse.json({ reservation });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth();
    const { id } = await params;

    const reservation = await prisma.reservation.findFirst({
      where: { id, templeId: authUser.templeId },
    });
    if (!reservation) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isAdmin = ["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role);
    const isOwner = reservation.memberId === authUser.member?.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const body = await request.json();

    // Members can only cancel
    if (!isAdmin) {
      if (body.status && body.status !== "CANCELLED") {
        return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
      }
      const updated = await prisma.reservation.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
      return NextResponse.json({ reservation: updated });
    }

    // Admins can update all fields
    const { status, scheduledAt, durationMin, notes, deceasedPersonId } = body;

    const updated = await prisma.reservation.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(scheduledAt ? { scheduledAt: new Date(scheduledAt) } : {}),
        ...(durationMin ? { durationMin } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(deceasedPersonId !== undefined ? { deceasedPersonId: deceasedPersonId || null } : {}),
      },
      include: {
        member: { include: { user: { select: { name: true } } } },
        deceasedPerson: { select: { id: true, name: true } },
      },
    });

    // CONFIRMED になったとき: 個人宛お知らせを作成
    if (status === "CONFIRMED" && reservation.status !== "CONFIRMED") {
      const typeLabel = RESERVATION_TYPE_LABELS[reservation.type] ?? "法要";
      const scheduledDate = new Date(updated.scheduledAt);
      const dateStr = scheduledDate.toLocaleDateString("ja-JP", {
        year: "numeric", month: "long", day: "numeric",
      });
      const timeStr = scheduledDate.toLocaleTimeString("ja-JP", {
        hour: "2-digit", minute: "2-digit",
      });
      await prisma.announcement.create({
        data: {
          templeId: authUser.templeId,
          memberId: reservation.memberId,
          title: `${typeLabel}のご予約が確定しました`,
          body: `${dateStr} ${timeStr} からの${typeLabel}のご予約が確定しました。\n\nご不明な点がございましたら、お寺までお問い合わせください。`,
          targetSegment: "ALL",
          publishedAt: new Date(),
        },
      });
    }

    logActivity({
      templeId: authUser.templeId,
      userId: authUser.id,
      action: "update",
      targetType: "reservation",
      targetId: id,
      detail: { changes: Object.keys(body) },
    });

    return NextResponse.json({ reservation: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}
