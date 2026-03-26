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
    const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));

    const ofuseRecords = await prisma.ofuse.findMany({
      where: {
        templeId: authUser.templeId,
        paidAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
      select: { paidAt: true, amount: true, type: true },
    });

    // 月別集計
    const monthlyData: Record<number, { total: number; byType: Record<string, number> }> = {};
    for (let m = 1; m <= 12; m++) {
      monthlyData[m] = { total: 0, byType: {} };
    }

    for (const record of ofuseRecords) {
      const month = record.paidAt.getMonth() + 1;
      monthlyData[month].total += record.amount;
      monthlyData[month].byType[record.type] =
        (monthlyData[month].byType[record.type] ?? 0) + record.amount;
    }

    const data = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      label: `${i + 1}月`,
      total: monthlyData[i + 1].total,
      HOUYO: monthlyData[i + 1].byType["HOUYO"] ?? 0,
      GOJIKAI: monthlyData[i + 1].byType["GOJIKAI"] ?? 0,
      KIFU: monthlyData[i + 1].byType["KIFU"] ?? 0,
      EVENT_FEE: monthlyData[i + 1].byType["EVENT_FEE"] ?? 0,
      OTHER: monthlyData[i + 1].byType["OTHER"] ?? 0,
    }));

    const yearTotal = ofuseRecords.reduce((sum, r) => sum + r.amount, 0);

    return NextResponse.json({ year, data, yearTotal });
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
}
