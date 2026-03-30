import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// GET /api/analytics/retention — 離脱リスク分析
export async function GET() {
  const authUser = await requireAdmin();
  const templeId = authUser.templeId;

  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [allMembers, recentlyActive, inactiveRisk] = await Promise.all([
    prisma.member.count({ where: { templeId, user: { isActive: true } } }),
    prisma.member.count({
      where: {
        templeId,
        user: { isActive: true },
        lastActivityAt: { gte: thirtyDaysAgo },
      },
    }),
    prisma.member.findMany({
      where: {
        templeId,
        user: { isActive: true },
        stage: { in: ["GOEN", "PROSPECT"] },
        OR: [
          { lastActivityAt: { lt: ninetyDaysAgo } },
          { lastActivityAt: null },
        ],
      },
      include: { user: { select: { name: true } } },
      orderBy: { lifetimeScore: "desc" },
      take: 20,
    }),
  ]);

  const retentionRate = allMembers > 0 ? Math.round((recentlyActive / allMembers) * 100) : 0;

  return NextResponse.json({
    allMembers,
    recentlyActive,
    retentionRate,
    inactiveRiskCount: inactiveRisk.length,
    inactiveRiskMembers: inactiveRisk.map((m) => ({
      id: m.id,
      name: m.user.name,
      stage: m.stage,
      lifetimeScore: m.lifetimeScore,
      lastActivityAt: m.lastActivityAt,
    })),
  });
}
