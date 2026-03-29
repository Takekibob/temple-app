import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ConversionClient from "./ConversionClient";

export default async function ConversionPage() {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role === "MEMBER") redirect("/app");
  if (authUser.role === "STAFF") redirect("/admin");

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);

  const [goenTotal, dankaTotal, candidateCount, promotedThisMonth, scoreRows, candidates, monthlyPromotions] =
    await Promise.all([
      prisma.member.count({ where: { templeId: authUser.templeId, type: "GOEN" } }),
      prisma.member.count({ where: { templeId: authUser.templeId, type: "DANKA" } }),
      prisma.member.count({
        where: { templeId: authUser.templeId, type: "GOEN", engagementScore: { gte: 70 } },
      }),
      prisma.member.count({
        where: { templeId: authUser.templeId, type: "DANKA", promotedAt: { gte: firstOfMonth } },
      }),
      // スコア分布
      prisma.member.findMany({
        where: { templeId: authUser.templeId, type: "GOEN" },
        select: { engagementScore: true },
      }),
      // 転換候補リスト
      prisma.member.findMany({
        where: { templeId: authUser.templeId, type: "GOEN", engagementScore: { gte: 70 } },
        select: {
          id: true,
          familyName: true,
          engagementScore: true,
          joinedDate: true,
          interestTags: true,
          user: { select: { name: true, email: true } },
          _count: { select: { eventParticipations: { where: { status: { in: ["ATTENDED", "CONFIRMED", "APPLIED"] } } } } },
        },
        orderBy: { engagementScore: "desc" },
      }),
      // 月別転換数（直近12ヶ月）
      prisma.member.findMany({
        where: {
          templeId: authUser.templeId,
          type: "DANKA",
          promotedAt: { gte: twelveMonthsAgo, not: null },
        },
        select: { promotedAt: true },
      }),
    ]);

  // スコア分布バケット
  const buckets = Array.from({ length: 10 }, (_, i) => ({
    range: `${i * 10}-${i * 10 + 9}`,
    count: 0,
  }));
  for (const { engagementScore: s } of scoreRows) {
    const idx = Math.min(9, Math.floor(s / 10));
    buckets[idx].count++;
  }

  // 月別転換数
  const monthlyMap = new Map<string, number>();
  for (const m of monthlyPromotions) {
    if (!m.promotedAt) continue;
    const key = `${m.promotedAt.getFullYear()}-${String(m.promotedAt.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + 1);
  }
  const monthlyTrend = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { month: key, count: monthlyMap.get(key) ?? 0 };
  });

  const candidatesData = candidates.map((c) => ({
    id: c.id,
    name: c.user.name,
    email: c.user.email,
    familyName: c.familyName,
    engagementScore: c.engagementScore,
    joinedDate: c.joinedDate.toISOString(),
    interestTags: Array.isArray(c.interestTags) ? (c.interestTags as string[]) : [],
    eventCount: c._count.eventParticipations,
  }));

  return (
    <ConversionClient
      kpi={{ goenTotal, dankaTotal, candidateCount, promotedThisMonth }}
      scoreDistribution={buckets}
      monthlyTrend={monthlyTrend}
      candidates={candidatesData}
    />
  );
}
