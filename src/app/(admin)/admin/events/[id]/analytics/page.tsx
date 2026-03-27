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
    select: { id: true, title: true, eventDate: true, capacity: true },
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

  // KPIs
  const total = participations.length;
  const confirmed = participations.filter((p) => p.status !== "CANCELLED").length;
  const feedbacks = participations.filter((p) => p.feedbackScore != null);
  const avgScore =
    feedbacks.length > 0
      ? Math.round(
          (feedbacks.reduce((s, p) => s + (p.feedbackScore ?? 0), 0) / feedbacks.length) * 10
        ) / 10
      : null;

  // Daily signup trend
  const dailyMap: Record<string, number> = {};
  for (const p of participations) {
    const d = p.createdAt.toISOString().slice(0, 10);
    dailyMap[d] = (dailyMap[d] ?? 0) + 1;
  }
  const dailyTrend = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  // Referral source breakdown
  const referralMap: Record<string, number> = {};
  for (const p of participations) {
    const src = p.member.referralSource ?? "UNKNOWN";
    referralMap[src] = (referralMap[src] ?? 0) + 1;
  }
  const REFERRAL_LABELS: Record<string, string> = {
    SNS: "SNS", WEB: "WEB", EVENT: "イベント",
    INTRODUCTION: "紹介", WALK_IN: "飛び込み",
    OTHER: "その他", UNKNOWN: "不明",
  };
  const referralBreakdown = Object.entries(referralMap).map(([source, count]) => ({
    source,
    label: REFERRAL_LABELS[source] ?? source,
    count,
  }));

  // Member type breakdown
  const memberTypeMap: Record<string, number> = { DANKA: 0, GOEN: 0 };
  for (const p of participations) {
    const t = p.member.type as string;
    memberTypeMap[t] = (memberTypeMap[t] ?? 0) + 1;
  }
  const memberTypeBreakdown = [
    { type: "DANKA", label: "檀家", count: memberTypeMap.DANKA },
    { type: "GOEN", label: "ご縁さん", count: memberTypeMap.GOEN },
  ];

  // Feedback list
  const feedbackList = participations
    .filter((p) => p.feedbackScore != null)
    .map((p) => ({
      name: p.member.user.name,
      score: p.feedbackScore!,
      comment: p.feedbackComment,
    }));

  const data = {
    event: {
      id: event.id,
      title: event.title,
      eventDate: event.eventDate.toISOString().slice(0, 10),
      capacity: event.capacity,
    },
    kpi: {
      total,
      confirmed,
      feedbackCount: feedbacks.length,
      avgScore,
      fillRate: event.capacity ? Math.round((confirmed / event.capacity) * 100) : null,
    },
    dailyTrend,
    referralBreakdown,
    memberTypeBreakdown,
    feedbackList,
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex items-center gap-3">
        <Link
          href={`/admin/events/${id}/edit`}
          className="text-sm text-stone-400 hover:text-stone-600"
        >
          ← イベント編集
        </Link>
        <Link
          href="/admin/events/analytics"
          className="text-sm text-stone-400 hover:text-stone-600"
        >
          全体分析 →
        </Link>
      </div>
      <EventDetailAnalyticsClient data={data} />
    </div>
  );
}
