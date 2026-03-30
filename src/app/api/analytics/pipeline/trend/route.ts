import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// GET /api/analytics/pipeline/trend — パイプライン推移（直近30日）
export async function GET() {
  const authUser = await requireAdmin();
  const templeId = authUser.templeId;

  // AnalyticsSnapshotから最新30日分を取得
  const snapshots = await prisma.analyticsSnapshot.findMany({
    where: {
      templeId,
      periodType: "daily",
      snapshotDate: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { snapshotDate: "asc" },
    take: 30,
  });

  // スナップショットがない場合は現在のステージ分布を返す
  if (snapshots.length === 0) {
    const stageCounts = await prisma.member.groupBy({
      by: ["stage"],
      where: { templeId },
      _count: true,
    });

    return NextResponse.json({
      trend: [],
      current: stageCounts.map((s) => ({ stage: s.stage, count: s._count })),
    });
  }

  return NextResponse.json({
    trend: snapshots.map((s) => ({
      date: s.snapshotDate,
      metrics: s.metrics,
    })),
  });
}
