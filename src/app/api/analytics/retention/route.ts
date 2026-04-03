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
        lastContactAt: { gte: thirtyDaysAgo },
      },
    }),
    prisma.member.findMany({
      where: {
        templeId,
        user: { isActive: true },
        OR: [
          { lastContactAt: { lt: ninetyDaysAgo } },
          { lastContactAt: null },
        ],
      },
      include: { user: { select: { name: true } } },
      orderBy: { lastContactAt: "desc" },
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
      type: m.type,
      lastContactAt: m.lastContactAt,
    })),
  });
}
