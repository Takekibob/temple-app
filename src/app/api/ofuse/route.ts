import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    const { searchParams } = new URL(request.url);

    const isAdmin = ["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const PAGE_SIZE = 50;
    const type = searchParams.get("type");
    const year = searchParams.get("year");
    const memberId = searchParams.get("memberId");

    const where: Record<string, unknown> = {
      templeId: authUser.templeId,
    };

    // 非管理者は自分の記録のみ
    if (!isAdmin) {
      if (!authUser.member) {
        return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
      }
      where.memberId = authUser.member.id;
    } else if (memberId) {
      where.memberId = memberId;
    }

    if (type) where.type = type;
    if (year) {
      const y = parseInt(year);
      where.paidAt = {
        gte: new Date(`${y}-01-01`),
        lt: new Date(`${y + 1}-01-01`),
      };
    }

    const [ofuse, total] = await Promise.all([
      prisma.ofuse.findMany({
        where,
        orderBy: { paidAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          member: {
            include: { user: { select: { name: true } } },
          },
        },
      }),
      prisma.ofuse.count({ where }),
    ]);

    return NextResponse.json({ ofuse, total, page, pageSize: PAGE_SIZE });
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
    if (!["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const body = await request.json();
    const {
      memberId,
      type,
      amount,
      paidAt,
      paymentMethod = "CASH",
      receiptIssued = false,
      reservationId,
      notes,
    } = body;

    if (!memberId || !type || !amount || !paidAt) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
    }
    if (parseInt(amount) < 1) {
      return NextResponse.json({ error: "金額は1円以上を入力してください" }, { status: 400 });
    }
    const paidAtDate = new Date(paidAt);
    if (paidAtDate > new Date()) {
      return NextResponse.json({ error: "支払日に未来の日付は指定できません" }, { status: 400 });
    }

    // memberId がこの temple に属するか確認
    const member = await prisma.member.findFirst({
      where: { id: memberId, templeId: authUser.templeId },
    });
    if (!member) {
      return NextResponse.json({ error: "会員が見つかりません" }, { status: 404 });
    }

    const ofuse = await prisma.ofuse.create({
      data: {
        templeId: authUser.templeId,
        memberId,
        type,
        amount: parseInt(amount),
        paidAt: paidAtDate,
        paymentMethod,
        receiptIssued: Boolean(receiptIssued),
        reservationId: reservationId || null,
        notes: notes || null,
      },
    });

    return NextResponse.json({ ofuse }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    return NextResponse.json({ error: "作成に失敗しました" }, { status: 500 });
  }
}
