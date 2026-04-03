import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/cron/analytics-snapshot
// 毎日 03:00 JST: 全寺院の日次AnalyticsSnapshotを作成
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const todayJST = new Date(now.getTime() + jstOffset);
  todayJST.setUTCHours(0, 0, 0, 0);

  const temples = await prisma.temple.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  let created = 0;

  for (const temple of temples) {
    const templeId = temple.id;

    const [
      totalMembers,
      typeCounts,
      newMembers,
      totalRevenue,
      lineFollowers,
    ] = await Promise.all([
      prisma.member.count({ where: { templeId, user: { isActive: true } } }),
      prisma.member.groupBy({
        by: ["type"],
        where: { templeId },
        _count: true,
      }),
      prisma.member.count({
        where: {
          templeId,
          joinedDate: {
            gte: new Date(todayJST.getTime() - 24 * 60 * 60 * 1000),
            lt: todayJST,
          },
        },
      }),
      prisma.donation.aggregate({
        where: {
          templeId,
          donatedAt: {
            gte: new Date(todayJST.getTime() - 24 * 60 * 60 * 1000),
            lt: todayJST,
          },
        },
        _sum: { amount: true },
      }),
      prisma.member.count({ where: { templeId, lineUserId: { not: null } } }),
    ]);

    const typeMap = Object.fromEntries(typeCounts.map((s) => [s.type, s._count]));
    const dankaCount = typeMap["DANKA"] ?? 0;
    const dankaRate = totalMembers > 0 ? Math.round((dankaCount / totalMembers) * 100) : 0;

    const metrics = {
      totalMembers,
      typeCounts: typeMap,
      newMembers,
      totalRevenue: totalRevenue._sum.amount ?? 0,
      lineFollowers,
      dankaRate,
    };

    await prisma.analyticsSnapshot.upsert({
      where: {
        templeId_snapshotDate_periodType: {
          templeId,
          snapshotDate: todayJST,
          periodType: "daily",
        },
      },
      create: {
        templeId,
        snapshotDate: todayJST,
        periodType: "daily",
        metrics,
      },
      update: { metrics },
    });

    created++;
  }

  return NextResponse.json({ ok: true, created });
}
