import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import EventAnalyticsClient from "./EventAnalyticsClient";

const CATEGORY_LABELS: Record<string, string> = {
  ZAZEN: "坐禅",
  SHAKYO: "写経",
  YOGA: "ヨガ",
  MINDFULNESS: "マインドフルネス",
  LECTURE: "仏事講座",
  SEASONAL: "季節行事",
  OTHER: "その他",
};

export default async function EventAnalyticsPage() {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role === "MEMBER") redirect("/app");

  const now = new Date();
  const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);

  const events = await prisma.event.findMany({
    where: {
      templeId: authUser.templeId,
      status: { in: ["COMPLETED", "PUBLISHED", "CLOSED"] },
    },
    select: {
      id: true,
      title: true,
      category: true,
      eventDate: true,
      capacity: true,
      participations: {
        where: { status: { notIn: ["CANCELLED", "WAITLISTED"] } },
        select: { memberId: true, status: true, feedbackScore: true },
      },
    },
  });

  // KPI
  const totalEvents = events.length;
  const totalParticipants = events.reduce((s, e) => s + e.participations.length, 0);

  const participationsByMember = new Map<string, number>();
  for (const e of events) {
    for (const p of e.participations) {
      participationsByMember.set(p.memberId, (participationsByMember.get(p.memberId) ?? 0) + 1);
    }
  }
  const totalUnique = participationsByMember.size;
  const repeaters = [...participationsByMember.values()].filter((n) => n >= 2).length;
  const newbies = totalUnique - repeaters;
  const repeaterRate = totalUnique > 0 ? Math.round((repeaters / totalUnique) * 100) : 0;

  const allScores = events.flatMap((e) =>
    e.participations.filter((p) => p.feedbackScore != null).map((p) => p.feedbackScore as number)
  );
  const avgFeedbackScore = allScores.length > 0
    ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10
    : null;

  // カテゴリ別
  const categoryMap = new Map<string, number>();
  for (const e of events) {
    categoryMap.set(e.category, (categoryMap.get(e.category) ?? 0) + e.participations.length);
  }
  const categoryRanking = [...categoryMap.entries()]
    .map(([cat, count]) => ({ category: CATEGORY_LABELS[cat] ?? cat, count }))
    .sort((a, b) => b.count - a.count);

  // 月別トレンド
  const monthlyMap = new Map<string, number>();
  for (const e of events) {
    if (e.eventDate < twelveMonthsAgo) continue;
    const key = `${e.eventDate.getFullYear()}-${String(e.eventDate.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + e.participations.length);
  }
  const monthlyTrend = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { month: key, count: monthlyMap.get(key) ?? 0 };
  });

  return (
    <EventAnalyticsClient
      kpi={{ totalEvents, totalParticipants, totalUnique, repeaterRate, avgFeedbackScore }}
      categoryRanking={categoryRanking}
      monthlyTrend={monthlyTrend}
      repeaterBreakdown={[
        { label: "リピーター", value: repeaters },
        { label: "初回参加", value: newbies },
      ]}
    />
  );
}
