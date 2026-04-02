import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activityLog";

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    const { searchParams } = new URL(request.url);

    // Admin/Staff: fetch all reservations for the temple
    const isAdmin = ["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role);

    const month = searchParams.get("month"); // YYYY-MM
    const memberId = searchParams.get("memberId");

    const where: Record<string, unknown> = {};

    if (isAdmin) {
      where.templeId = authUser.templeId;
      if (memberId) where.memberId = memberId;
    } else {
      // Member: only own reservations
      if (!authUser.member) return NextResponse.json({ reservations: [] });
      where.memberId = authUser.member.id;
    }

    if (month) {
      const start = new Date(`${month}-01T00:00:00`);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      where.scheduledAt = { gte: start, lt: end };
    }

    const reservations = await prisma.reservation.findMany({
      where,
      include: {
        member: { include: { user: { select: { name: true } } } },
        deceasedPerson: { select: { id: true, name: true } },
      },
      orderBy: { scheduledAt: "asc" },
    });

    return NextResponse.json({ reservations });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    const isAdmin = ["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role);

    const body = await request.json();
    const {
      type, scheduledAt, durationMin = 60, deceasedPersonId, notes,
      attendees, purificationRequired, flowerOrder, flowerDetail,
      cateringOrder, cateringCount, cateringDetail,
      // Admin proxy: memberId can be specified by admin
      memberId: proxyMemberId,
    } = body;

    // Determine the target member
    let targetMemberId: string;
    if (isAdmin) {
      // Admin must specify a memberId
      if (!proxyMemberId) {
        return NextResponse.json({ error: "memberId is required for admin" }, { status: 400 });
      }
      const targetMember = await prisma.member.findFirst({
        where: { id: proxyMemberId, templeId: authUser.templeId, type: "DANKA" },
      });
      if (!targetMember) {
        return NextResponse.json({ error: "指定された檀家が見つかりません" }, { status: 404 });
      }
      targetMemberId = targetMember.id;
    } else {
      if (!authUser.member) {
        return NextResponse.json({ error: "会員情報が見つかりません" }, { status: 403 });
      }
      if (authUser.member.type !== "DANKA") {
        return NextResponse.json({ error: "法要予約は檀家のみ利用できます" }, { status: 403 });
      }
      targetMemberId = authUser.member.id;
    }

    if (!type || !scheduledAt) {
      return NextResponse.json({ error: "種別と日時は必須です" }, { status: 400 });
    }

    const start = new Date(scheduledAt);
    // Admin can create past reservations (for record-keeping)
    if (!isAdmin && start <= new Date()) {
      return NextResponse.json({ error: "過去の日時は指定できません" }, { status: 400 });
    }
    if (durationMin < 30 || durationMin > 240) {
      return NextResponse.json({ error: "所要時間は30〜240分の範囲で指定してください" }, { status: 400 });
    }

    // Double-booking check
    const end = new Date(start.getTime() + durationMin * 60 * 1000);
    const conflict = await prisma.reservation.findFirst({
      where: {
        templeId: authUser.templeId,
        status: { notIn: ["CANCELLED"] },
        scheduledAt: { lt: end },
        AND: [{ scheduledAt: { gte: new Date(start.getTime() - 240 * 60 * 1000) } }],
      },
    });

    if (conflict) {
      const conflictEnd = new Date(conflict.scheduledAt.getTime() + conflict.durationMin * 60 * 1000);
      if (start < conflictEnd && end > conflict.scheduledAt) {
        return NextResponse.json({ error: "その時間帯はすでに予約が入っています" }, { status: 409 });
      }
    }

    const reservation = await prisma.reservation.create({
      data: {
        templeId: authUser.templeId,
        memberId: targetMemberId,
        type,
        scheduledAt: start,
        durationMin,
        deceasedPersonId: deceasedPersonId || null,
        notes: notes || null,
        status: isAdmin ? "CONFIRMED" : "PENDING",
        attendees: attendees ? Number(attendees) : null,
        purificationRequired: purificationRequired ?? false,
        flowerOrder: flowerOrder ?? false,
        flowerDetail: flowerOrder ? (flowerDetail || null) : null,
        cateringOrder: cateringOrder ?? false,
        cateringCount: cateringOrder && cateringCount ? Number(cateringCount) : null,
        cateringDetail: cateringOrder ? (cateringDetail || null) : null,
        isAdminCreated: isAdmin,
      },
      include: {
        deceasedPerson: { select: { id: true, name: true } },
      },
    });

    void prisma.member.update({ where: { id: targetMemberId }, data: { lastContactAt: new Date() } });

    logActivity({
      templeId: authUser.templeId,
      userId: authUser.id,
      action: "create",
      targetType: "reservation",
      targetId: reservation.id,
      targetName: `${type} ${start.toISOString().slice(0, 10)}${isAdmin ? " (代理)" : ""}`,
    });

    return NextResponse.json({ reservation }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    return NextResponse.json({ error: "予約の登録に失敗しました" }, { status: 500 });
  }
}
