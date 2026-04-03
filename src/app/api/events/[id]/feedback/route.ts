import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logMemberActivity } from "@/lib/memberActivities";

// GET /api/events/[id]/feedback — 自分のフィードバックを取得
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth();
    if (!authUser.member) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

    const { id: eventId } = await params;

    const participation = await prisma.eventParticipation.findUnique({
      where: { eventId_memberId: { eventId, memberId: authUser.member.id } },
      select: { feedbackScore: true, feedbackComment: true, status: true },
    });

    if (!participation) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    return NextResponse.json({ feedback: participation });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// POST /api/events/[id]/feedback — フィードバック送信
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth();
    if (!authUser.member) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

    const { id: eventId } = await params;
    const { score, comment } = await request.json();

    if (!score || score < 1 || score > 5) {
      return NextResponse.json({ error: "スコアは1〜5で指定してください" }, { status: 400 });
    }

    const participation = await prisma.eventParticipation.findUnique({
      where: { eventId_memberId: { eventId, memberId: authUser.member.id } },
    });

    if (!participation) return NextResponse.json({ error: "参加記録が見つかりません" }, { status: 404 });
    if (!["ATTENDED", "CONFIRMED", "APPLIED"].includes(participation.status)) {
      return NextResponse.json({ error: "フィードバックを送信できません" }, { status: 400 });
    }

    const isFirstFeedback = participation.feedbackScore == null;

    await prisma.eventParticipation.update({
      where: { id: participation.id },
      data: {
        feedbackScore: score,
        feedbackComment: comment?.trim() || null,
      },
    });

    // 初回フィードバックのみアクティビティ記録
    if (isFirstFeedback) {
      await logMemberActivity(authUser.member.id, "EVENT_FEEDBACK", { eventId });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
