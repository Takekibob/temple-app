import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/events/[id]/analytics
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role === "MEMBER") {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id } = await params;

    const event = await prisma.event.findFirst({
      where: { id, templeId: authUser.templeId },
      select: { id: true, title: true, eventDate: true, capacity: true },
    });
    if (!event) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

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
    const confirmed = participations.filter(
      (p) => !["CANCELLED"].includes(p.status)
    ).length;
    const feedbacks = participations.filter((p) => p.feedbackScore != null);
    const avgScore =
      feedbacks.length > 0
        ? Math.round(
            (feedbacks.reduce((s, p) => s + (p.feedbackScore ?? 0), 0) /
              feedbacks.length) *
              10
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

    // Feedback list
    const feedbackList = participations
      .filter((p) => p.feedbackScore != null)
      .map((p) => ({
        name: p.member.user.name,
        score: p.feedbackScore!,
        comment: p.feedbackComment,
      }));

    return NextResponse.json({
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
      feedbackList,
    });
  } catch {
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
