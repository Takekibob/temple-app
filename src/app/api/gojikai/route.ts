import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    if (!["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const fiscalYear = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));
    const unpaidOnly = searchParams.get("unpaid") === "1";

    const where: Record<string, unknown> = {
      fiscalYear,
      member: { templeId: authUser.templeId },
    };
    if (unpaidOnly) where.status = "UNPAID";

    const [payments, rule] = await Promise.all([
      prisma.gojikaiPayment.findMany({
        where,
        orderBy: { createdAt: "asc" },
        include: {
          member: { include: { user: { select: { name: true } } } },
        },
      }),
      prisma.gojikaiRule.findFirst({ where: { templeId: authUser.templeId } }),
    ]);

    return NextResponse.json({ payments, rule, fiscalYear });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// 年度の護持会費レコードを一括初期化（檀家全員分を作成）
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    if (!["ADMIN", "SUPER_ADMIN"].includes(authUser.role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const body = await request.json();
    const { fiscalYear, amount } = body;

    if (!fiscalYear || !amount) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
    }

    const year = parseInt(fiscalYear);
    const amountInt = parseInt(amount);
    if (isNaN(year) || isNaN(amountInt)) {
      return NextResponse.json({ error: "年度・金額は数値で入力してください" }, { status: 400 });
    }
    if (amountInt < 1) {
      return NextResponse.json({ error: "金額は1円以上を入力してください" }, { status: 400 });
    }

    // 当年度の檀家会員を全員取得
    const dankaMembers = await prisma.member.findMany({
      where: { templeId: authUser.templeId, type: "DANKA" },
      select: { id: true },
    });

    // 既存レコードのステータスを事前取得
    const memberIds = dankaMembers.map((m) => m.id);
    const existingPayments = await prisma.gojikaiPayment.findMany({
      where: { memberId: { in: memberIds }, fiscalYear: year },
      select: { memberId: true, status: true },
    });
    const existingStatusMap = new Map(existingPayments.map((p) => [p.memberId, p.status]));

    // 新規 → UNPAID で作成、既存UNPAID → 金額更新、既存PAID/EXEMPT → 金額を変更しない
    const results = await Promise.all(
      dankaMembers.map((m) => {
        const existingStatus = existingStatusMap.get(m.id);
        if (!existingStatus) {
          return prisma.gojikaiPayment.create({
            data: { memberId: m.id, fiscalYear: year, amount: amountInt, status: "UNPAID" },
          });
        }
        if (existingStatus === "UNPAID") {
          return prisma.gojikaiPayment.update({
            where: { memberId_fiscalYear: { memberId: m.id, fiscalYear: year } },
            data: { amount: amountInt },
          });
        }
        // PAID / EXEMPT: 金額・ステータスともに変更しない
        return prisma.gojikaiPayment.findUniqueOrThrow({
          where: { memberId_fiscalYear: { memberId: m.id, fiscalYear: year } },
        });
      })
    );

    // ルールも更新/作成（race condition を避けるため findFirst → update/create に分離）
    const existingRule = await prisma.gojikaiRule.findFirst({ where: { templeId: authUser.templeId } });
    if (existingRule) {
      await prisma.gojikaiRule.update({ where: { id: existingRule.id }, data: { amount: amountInt } });
    } else {
      await prisma.gojikaiRule.create({ data: { templeId: authUser.templeId, amount: amountInt } });
    }

    return NextResponse.json({ created: results.length }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    return NextResponse.json({ error: "初期化に失敗しました" }, { status: 500 });
  }
}
