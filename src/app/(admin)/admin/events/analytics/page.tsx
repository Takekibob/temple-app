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

const REFERRAL_LABELS: Record<string, string> = {
  SNS: "SNS",
  WEB: "WEB",
  EVENT: "イベント",
  INTRODUCTION: "紹介",
  WALK_IN: "飛び込み",
  OTHER: "その他",
};

export default async function EventAnalyticsPage() {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role === "MEMBER") redirect("/app");

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);

  // 全イベント（完了・公開中・募集終了）
  const allEvents = await prisma.event.findMany({
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
      status: true,
      participations: {
        select: {
          memberId: true,
          status: true,
          feedbackScore: true,
        },
      },
    },
    orderBy: { eventDate: "desc" },
  });

  // ── 月次KPI ──────────────────────────────────
  const currentMonthEvents = allEvents.filter((e) => e.eventDate >= currentMonthStart);
  const prevMonthEvents = allEvents.filter(
    (e) => e.eventDate >= prevMonthStart && e.eventDate < currentMonthStart
  );

  // KPI 1: 今月の開催数
  const currentMonthCount = currentMonthEvents.length;
  const prevMonthCount = prevMonthEvents.length;

  // KPI 2: 今月の総参加者数 (attended)
  const countAttended = (events: typeof allEvents) =>
    events.reduce(
      (s, e) => s + e.participations.filter((p) => p.status === "ATTENDED").length,
      0
    );
  const currentMonthAttended = countAttended(currentMonthEvents);
  const prevMonthAttended = countAttended(prevMonthEvents);

  // KPI 3: 平均参加率 (定員あるイベントのみ)
  const avgRate = (events: typeof allEvents) => {
    const rated = events.filter((e) => e.capacity != null);
    if (rated.length === 0) return null;
    const sum = rated.reduce((s, e) => {
      const attended = e.participations.filter((p) => p.status === "ATTENDED").length;
      return s + attended / e.capacity!;
    }, 0);
    return Math.round((sum / rated.length) * 1000) / 10;
  };
  const currentAvgRate = avgRate(currentMonthEvents);
  const prevAvgRate = avgRate(prevMonthEvents);

  // KPI 4: 新規ご縁さん獲得数（今月登録のGOENで今月イベントに申込あり）
  const currentMonthEventIds = currentMonthEvents.map((e) => e.id);
  const [newGoenCount, prevNewGoenCount] = await Promise.all([
    currentMonthEventIds.length > 0
      ? prisma.member.count({
          where: {
            templeId: authUser.templeId,
            type: "GOEN",
            createdAt: { gte: currentMonthStart },
            eventParticipations: {
              some: { eventId: { in: currentMonthEventIds }, status: { not: "CANCELLED" } },
            },
          },
        })
      : Promise.resolve(0),
    (() => {
      const prevIds = prevMonthEvents.map((e) => e.id);
      return prevIds.length > 0
        ? prisma.member.count({
            where: {
              templeId: authUser.templeId,
              type: "GOEN",
              createdAt: { gte: prevMonthStart, lt: currentMonthStart },
              eventParticipations: {
                some: { eventId: { in: prevIds }, status: { not: "CANCELLED" } },
              },
            },
          })
        : Promise.resolve(0);
    })(),
  ]);

  // ── 月次推移（直近6ヶ月）─────────────────────
  const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    const monthEvents = allEvents.filter(
      (e) => e.eventDate.getFullYear() === year && e.eventDate.getMonth() === month
    );
    return {
      month: `${year}/${String(month + 1).padStart(2, "0")}`,
      events: monthEvents.length,
      participants: countAttended(monthEvents),
    };
  });

  // ── カテゴリ別参加者数（全期間）──────────────
  const categoryMap = new Map<string, number>();
  for (const e of allEvents) {
    const attended = e.participations.filter((p) => p.status === "ATTENDED").length;
    categoryMap.set(e.category, (categoryMap.get(e.category) ?? 0) + attended);
  }
  const categoryRanking = [...categoryMap.entries()]
    .map(([cat, count]) => ({ category: CATEGORY_LABELS[cat] ?? cat, count }))
    .sort((a, b) => b.count - a.count);

  // ── リピーター分析（3階層）───────────────────
  const memberAttendCount = new Map<string, number>();
  for (const e of allEvents) {
    for (const p of e.participations) {
      if (p.status === "ATTENDED") {
        memberAttendCount.set(p.memberId, (memberAttendCount.get(p.memberId) ?? 0) + 1);
      }
    }
  }
  let firstOnly = 0;
  let twice = 0;
  let threePlus = 0;
  for (const cnt of memberAttendCount.values()) {
    if (cnt === 1) firstOnly++;
    else if (cnt === 2) twice++;
    else threePlus++;
  }

  // ── イベント別パフォーマンステーブル（直近20件）─
  const performanceEvents = allEvents.slice(0, 20).map((e) => {
    const applied = e.participations.filter((p) => p.status !== "CANCELLED").length;
    const attended = e.participations.filter((p) => p.status === "ATTENDED").length;
    const scores = e.participations
      .filter((p) => p.feedbackScore != null)
      .map((p) => p.feedbackScore as number);
    const avgRating =
      scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
        : null;
    return {
      id: e.id,
      title: e.title,
      date: e.eventDate.toISOString().slice(0, 10),
      category: CATEGORY_LABELS[e.category] ?? e.category,
      capacity: e.capacity,
      applied,
      attended,
      participationRate: e.capacity
        ? Math.round((attended / e.capacity) * 100)
        : null,
      avgRating,
    };
  });

  // ── 新規ご縁さん獲得チャネル（直近12ヶ月）────
  const recentGoenMembers = await prisma.member.findMany({
    where: {
      templeId: authUser.templeId,
      type: "GOEN",
      createdAt: { gte: oneYearAgo },
    },
    select: { referralSource: true },
  });
  const referralMap = new Map<string, number>();
  for (const m of recentGoenMembers) {
    const src = m.referralSource ?? "OTHER";
    referralMap.set(src, (referralMap.get(src) ?? 0) + 1);
  }
  const acquisitionData = [...referralMap.entries()]
    .map(([src, count]) => ({ label: REFERRAL_LABELS[src] ?? src, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <EventAnalyticsClient
      monthlyKpis={{
        currentCount: currentMonthCount,
        prevCount: prevMonthCount,
        currentAttended: currentMonthAttended,
        prevAttended: prevMonthAttended,
        currentAvgRate,
        prevAvgRate,
        newGoenCount,
        prevNewGoenCount,
      }}
      monthlyTrend={monthlyTrend}
      categoryRanking={categoryRanking}
      repeaterData={[
        { label: "初回のみ", value: firstOnly },
        { label: "2回", value: twice },
        { label: "3回以上", value: threePlus },
      ]}
      performanceEvents={performanceEvents}
      acquisitionData={acquisitionData}
    />
  );
}
