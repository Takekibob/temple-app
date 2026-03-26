import { NextResponse } from "next/server";
import { requireAdminOrStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/events/analytics — イベント分析データ
export async function GET() {
  try {
    const authUser = await requireAdminOrStaff();

    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);

    // 全イベント（完了 + 公開中）のサマリー
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
          select: {
            memberId: true,
            status: true,
            feedbackScore: true,
          },
        },
      },
      orderBy: { eventDate: "desc" },
    });

    // KPI
    const totalEvents = events.length;
    const totalParticipants = events.reduce((sum, e) => sum + e.participations.length, 0);

    // 全参加 memberId を集計してリピーター率計算
    const participationsByMember = new Map<string, number>();
    for (const e of events) {
      for (const p of e.participations) {
        participationsByMember.set(p.memberId, (participationsByMember.get(p.memberId) ?? 0) + 1);
      }
    }
    const totalUniqueParticipants = participationsByMember.size;
    const repeaters = [...participationsByMember.values()].filter((count) => count >= 2).length;
    const repeaterRate = totalUniqueParticipants > 0
      ? Math.round((repeaters / totalUniqueParticipants) * 100)
      : 0;

    // フィードバックスコア平均
    const allScores = events.flatMap((e) =>
      e.participations.filter((p) => p.feedbackScore != null).map((p) => p.feedbackScore as number)
    );
    const avgFeedbackScore = allScores.length > 0
      ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 10) / 10
      : null;

    // カテゴリ別参加者数
    const categoryMap = new Map<string, number>();
    for (const e of events) {
      categoryMap.set(e.category, (categoryMap.get(e.category) ?? 0) + e.participations.length);
    }
    const categoryRanking = [...categoryMap.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // 月別参加者数トレンド（直近12ヶ月）
    const monthlyMap = new Map<string, number>();
    for (const e of events) {
      if (e.eventDate < twelveMonthsAgo) continue;
      const key = `${e.eventDate.getFullYear()}-${String(e.eventDate.getMonth() + 1).padStart(2, "0")}`;
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + e.participations.length);
    }
    // 12ヶ月分のキーを生成して埋める
    const monthlyTrend: { month: string; count: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyTrend.push({ month: key, count: monthlyMap.get(key) ?? 0 });
    }

    // リピーター vs 新規の比率
    const newbies = totalUniqueParticipants - repeaters;

    return NextResponse.json({
      kpi: {
        totalEvents,
        totalParticipants,
        totalUniqueParticipants,
        repeaterRate,
        avgFeedbackScore,
      },
      categoryRanking,
      monthlyTrend,
      repeaterBreakdown: [
        { label: "リピーター", value: repeaters },
        { label: "初回参加", value: newbies },
      ],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
