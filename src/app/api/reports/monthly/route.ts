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

    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${year + 1}-01-01`);

    const [ofuseRecords, gojikaiRecords, eventFeeRecords] = await Promise.all([
      prisma.ofuse.findMany({
        // GOJIKAI は GojikaiPayment で集計するため除外（二重計上防止）
        where: { templeId: authUser.templeId, paidAt: { gte: startDate, lt: endDate }, type: { not: "GOJIKAI" } },
        select: { paidAt: true, amount: true, type: true },
      }),
      prisma.gojikaiPayment.findMany({
        where: {
          member: { templeId: authUser.templeId },
          status: "PAID",
          paidAt: { gte: startDate, lt: endDate },
        },
        select: { paidAt: true, amount: true },
      }),
      prisma.eventParticipation.findMany({
        where: {
          event: {
            templeId: authUser.templeId,
            fee: { gt: 0 },
            eventDate: { gte: startDate, lt: endDate },
          },
          status: { in: ["CONFIRMED", "ATTENDED"] },
        },
        select: { event: { select: { eventDate: true, fee: true } } },
      }),
    ]);

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

    for (const record of gojikaiRecords) {
      if (!record.paidAt) continue;
      const month = record.paidAt.getMonth() + 1;
      monthlyData[month].total += record.amount;
      monthlyData[month].byType["GOJIKAI"] =
        (monthlyData[month].byType["GOJIKAI"] ?? 0) + record.amount;
    }

    for (const record of eventFeeRecords) {
      const month = record.event.eventDate.getMonth() + 1;
      monthlyData[month].total += record.event.fee;
      monthlyData[month].byType["EVENT_FEE"] =
        (monthlyData[month].byType["EVENT_FEE"] ?? 0) + record.event.fee;
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

    const yearTotal = data.reduce((sum, d) => sum + d.total, 0);

    return NextResponse.json({ year, data, yearTotal });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
