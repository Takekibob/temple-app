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
    const yearsBack = Math.min(10, parseInt(searchParams.get("years") ?? "5"));
    const currentYear = new Date().getFullYear();

    const rangeStart = new Date(`${currentYear - yearsBack + 1}-01-01`);

    const [ofuseRecords, gojikaiRecords, eventFeeRecords] = await Promise.all([
      prisma.ofuse.findMany({
        where: { templeId: authUser.templeId, paidAt: { gte: rangeStart } },
        select: { paidAt: true, amount: true, type: true },
      }),
      prisma.gojikaiPayment.findMany({
        where: {
          member: { templeId: authUser.templeId },
          status: "PAID",
          paidAt: { gte: rangeStart },
        },
        select: { paidAt: true, amount: true },
      }),
      prisma.eventParticipation.findMany({
        where: {
          event: {
            templeId: authUser.templeId,
            fee: { gt: 0 },
            eventDate: { gte: rangeStart },
          },
          status: { in: ["CONFIRMED", "ATTENDED"] },
        },
        select: { event: { select: { eventDate: true, fee: true } } },
      }),
    ]);

    const yearlyData: Record<number, { total: number; byType: Record<string, number> }> = {};
    for (let y = currentYear - yearsBack + 1; y <= currentYear; y++) {
      yearlyData[y] = { total: 0, byType: {} };
    }

    for (const record of ofuseRecords) {
      const year = record.paidAt.getFullYear();
      if (!yearlyData[year]) continue;
      yearlyData[year].total += record.amount;
      yearlyData[year].byType[record.type] =
        (yearlyData[year].byType[record.type] ?? 0) + record.amount;
    }

    for (const record of gojikaiRecords) {
      if (!record.paidAt) continue;
      const year = record.paidAt.getFullYear();
      if (!yearlyData[year]) continue;
      yearlyData[year].total += record.amount;
      yearlyData[year].byType["GOJIKAI"] =
        (yearlyData[year].byType["GOJIKAI"] ?? 0) + record.amount;
    }

    for (const record of eventFeeRecords) {
      const year = record.event.eventDate.getFullYear();
      if (!yearlyData[year]) continue;
      yearlyData[year].total += record.event.fee;
      yearlyData[year].byType["EVENT_FEE"] =
        (yearlyData[year].byType["EVENT_FEE"] ?? 0) + record.event.fee;
    }

    const data = Object.entries(yearlyData).map(([year, val]) => ({
      year: parseInt(year),
      label: `${year}年`,
      total: val.total,
      HOUYO: val.byType["HOUYO"] ?? 0,
      GOJIKAI: val.byType["GOJIKAI"] ?? 0,
      KIFU: val.byType["KIFU"] ?? 0,
      EVENT_FEE: val.byType["EVENT_FEE"] ?? 0,
      OTHER: val.byType["OTHER"] ?? 0,
    }));

    return NextResponse.json({ data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
