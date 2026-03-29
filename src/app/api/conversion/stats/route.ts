import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/conversion/stats — 転換KPI
export async function GET() {
  try {
    const authUser = await requireAdmin();

    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      goenTotal,
      dankaTotal,
      candidateCount,
      promotedThisMonth,
      scoreGroups,
    ] = await Promise.all([
      prisma.member.count({ where: { templeId: authUser.templeId, type: "GOEN" } }),
      prisma.member.count({ where: { templeId: authUser.templeId, type: "DANKA" } }),
      // 転換候補: ご縁さんでスコア70以上
      prisma.member.count({
        where: { templeId: authUser.templeId, type: "GOEN", engagementScore: { gte: 70 } },
      }),
      // 今月昇格した件数
      prisma.member.count({
        where: {
          templeId: authUser.templeId,
          type: "DANKA",
          promotedAt: { gte: firstOfMonth },
        },
      }),
      // スコア分布: 0-9, 10-19, ..., 90-100
      prisma.member.groupBy({
        by: ["engagementScore"],
        where: { templeId: authUser.templeId, type: "GOEN" },
        _count: { _all: true },
      }),
    ]);

    // スコア分布を10刻みのバケットに集計
    const buckets: { range: string; count: number }[] = Array.from({ length: 10 }, (_, i) => ({
      range: `${i * 10}–${i * 10 + 9}`,
      count: 0,
    }));
    buckets.push({ range: "100", count: 0 });

    for (const g of scoreGroups) {
      const s = g.engagementScore;
      const idx = s === 100 ? 10 : Math.floor(s / 10);
      buckets[idx].count += g._count._all;
    }

    return NextResponse.json({
      goenTotal,
      dankaTotal,
      candidateCount,
      promotedThisMonth,
      scoreDistribution: buckets,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
