import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import EventDetailAnalyticsClient from "./EventDetailAnalyticsClient";

export default async function AdminEventAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role === "MEMBER") redirect("/app");

  const { id } = await params;

  const event = await prisma.event.findFirst({
    where: { id, templeId: authUser.templeId },
    select: {
      id: true,
      title: true,
      eventDate: true,
      startTime: true,
      endTime: true,
      capacity: true,
      category: true,
      fee: true,
      visibility: true,
      status: true,
    },
  });
  if (!event) notFound();

  const participations = await prisma.eventParticipation.findMany({
    where: { eventId: id },
    select: {
      status: true,
      feedbackScore: true,
      feedbackComment: true,
      createdAt: true,
      member: {
        select: {
          type: true,
          referralSource: true,
          user: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // ── ステータス別集計 ──
  const statusCounts = {
    applied: participations.filter((p) => p.status === "APPLIED").length,
    confirmed: participations.filter((p) => p.status === "CONFIRMED").length,
    waitlisted: participations.filter((p) => p.status === "WAITLISTED").length,
    attended: participations.filter((p) => p.status === "ATTENDED").length,
    no_show: participations.filter((p) => p.status === "NO_SHOW").length,
    cancelled: participations.filter((p) => p.status === "CANCELLED").length,
  };
  const activeCount =
    statusCounts.applied +
    statusCounts.confirmed +
    statusCounts.waitlisted +
    statusCounts.attended +
    statusCounts.no_show;

  // ── フィードバック集計 ──
  const feedbacks = participations.filter((p) => p.feedbackScore != null);
  const avgScore =
    feedbacks.length > 0
      ? Math.round(
          (feedbacks.reduce((s, p) => s + (p.feedbackScore ?? 0), 0) / feedbacks.length) * 10
        ) / 10
      : null;
  const scoreDistribution = [1, 2, 3, 4, 5].map((star) => ({
    star,
    count: feedbacks.filter((p) => p.feedbackScore === star).length,
  }));

  // ── 日別申込推移 ──
  const dailyMap: Record<string, number> = {};
  for (const p of participations) {
    if (p.status === "CANCELLED") continue;
    const d = p.createdAt.toISOString().slice(0, 10);
    dailyMap[d] = (dailyMap[d] ?? 0) + 1;
  }
  const dailyTrend = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  // ── 流入経路 ──
  const REFERRAL_LABELS: Record<string, string> = {
    SNS: "SNS",
    WEB: "WEB",
    EVENT: "イベント",
    INTRODUCTION: "紹介",
    WALK_IN: "飛び込み",
    OTHER: "その他",
    UNKNOWN: "不明",
  };
  const referralMap: Record<string, number> = {};
  for (const p of participations) {
    if (p.status === "CANCELLED") continue;
    const src = p.member.referralSource ?? "UNKNOWN";
    referralMap[src] = (referralMap[src] ?? 0) + 1;
  }
  const referralBreakdown = Object.entries(referralMap).map(([source, count]) => ({
    source,
    label: REFERRAL_LABELS[source] ?? source,
    count,
  }));

  // ── 会員種別 ──
  const memberTypeMap: Record<string, number> = { DANKA: 0, GOEN: 0 };
  for (const p of participations) {
    if (p.status === "CANCELLED") continue;
    const t = p.member.type as string;
    memberTypeMap[t] = (memberTypeMap[t] ?? 0) + 1;
  }
  const memberTypeBreakdown = [
    { type: "DANKA", label: "檀家", count: memberTypeMap.DANKA },
    { type: "GOEN", label: "ご縁さん", count: memberTypeMap.GOEN },
  ];

  // ── フィードバック一覧（最大20件）──
  const feedbackList = feedbacks
    .slice()
    .reverse()
    .slice(0, 20)
    .map((p) => ({
      name: p.member.user.name,
      score: p.feedbackScore!,
      comment: p.feedbackComment,
    }));

  const CATEGORY_LABELS: Record<string, string> = {
    ZAZEN: "坐禅",
    SHAKYO: "写経",
    YOGA: "ヨガ",
    MINDFULNESS: "マインドフルネス",
    LECTURE: "仏事講座",
    SEASONAL: "季節行事",
    OTHER: "その他",
  };

  const data = {
    event: {
      id: event.id,
      title: event.title,
      eventDate: event.eventDate.toISOString().slice(0, 10),
      startTime: event.startTime,
      endTime: event.endTime,
      capacity: event.capacity,
      category: CATEGORY_LABELS[event.category] ?? event.category,
      fee: event.fee,
      status: event.status,
    },
    kpi: {
      total: participations.length,
      active: activeCount,
      feedbackCount: feedbacks.length,
      avgScore,
      fillRate: event.capacity
        ? Math.round((statusCounts.attended / event.capacity) * 100)
        : null,
    },
    statusCounts,
    dailyTrend,
    referralBreakdown,
    memberTypeBreakdown,
    scoreDistribution,
    feedbackList,
    shareUrl: `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/app/events/${event.id}`,
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-3 text-sm">
        <Link
          href={`/admin/events/${id}/edit`}
          className="text-stone-400 hover:text-stone-600"
        >
          ← イベント編集
        </Link>
        <span className="text-stone-300">|</span>
        <Link
          href="/admin/events/analytics"
          className="text-stone-400 hover:text-stone-600"
        >
          全体分析 →
        </Link>
      </div>
      <EventDetailAnalyticsClient data={data} />
    </div>
  );
}
