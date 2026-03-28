import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
    if (!authUser.member) {
      return NextResponse.json({ error: "会員情報が見つかりません" }, { status: 403 });
    }
    if (authUser.member.type !== "DANKA") {
      return NextResponse.json({ error: "法要予約は檀家のみ利用できます" }, { status: 403 });
    }

    const body = await request.json();
    const { type, scheduledAt, durationMin = 60, deceasedPersonId, notes } = body;

    if (!type || !scheduledAt) {
      return NextResponse.json({ error: "種別と日時は必須です" }, { status: 400 });
    }

    const start = new Date(scheduledAt);
    if (start <= new Date()) {
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
        AND: [
          {
            scheduledAt: {
              gte: new Date(start.getTime() - 240 * 60 * 1000),
            },
          },
        ],
      },
    });

    if (conflict) {
      // Precise overlap check
      const conflictEnd = new Date(conflict.scheduledAt.getTime() + conflict.durationMin * 60 * 1000);
      if (start < conflictEnd && end > conflict.scheduledAt) {
        return NextResponse.json({ error: "その時間帯はすでに予約が入っています" }, { status: 409 });
      }
    }

    const reservation = await prisma.reservation.create({
      data: {
        templeId: authUser.templeId,
        memberId: authUser.member.id,
        type,
        scheduledAt: start,
        durationMin,
        deceasedPersonId: deceasedPersonId || null,
        notes: notes || null,
        status: "PENDING",
      },
      include: {
        deceasedPerson: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ reservation }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    return NextResponse.json({ error: "予約の登録に失敗しました" }, { status: 500 });
  }
}
