import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

// 連続書き込み日数を entryDate から計算
function calcStreak(entryDates: Date[]): number {
  const uniqueDates = Array.from(
    new Set(entryDates.map((d) => new Date(d).toDateString()))
  )
    .map((s) => new Date(s))
    .sort((a, b) => b.getTime() - a.getTime());

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < uniqueDates.length; i++) {
    const expected = new Date(today);
    expected.setDate(today.getDate() - i);
    if (uniqueDates[i].toDateString() === expected.toDateString()) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// GET /api/my/summary
export async function GET() {
  const authUser = await getAuthUser();
  if (!authUser) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const userId = authUser.id;
  const memberId = authUser.member?.id;

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // 全Journalのentrydate（streak計算用）
  const allJournalDates = await prisma.journal.findMany({
    where: { userId },
    select: { entryDate: true },
  });

  const [
    thisMonthJournalCount,
    thisMonthEventCount,
    followedTemples,
    recentJournals,
    pastEvents,
    totalEventCount,
  ] = await Promise.all([
    // 今月のJournal件数
    prisma.journal.count({
      where: { userId, entryDate: { gte: thisMonthStart } },
    }),

    // 今月の参加イベント数
    memberId
      ? prisma.eventParticipation.count({
          where: {
            memberId,
            status: { in: ["APPLIED", "CONFIRMED"] },
            event: { eventDate: { gte: thisMonthStart, lte: now } },
          },
        })
      : Promise.resolve(0),

    // フォロー中のお寺（カード用データ）
    memberId
      ? prisma.memberFavoriteTemple.findMany({
          where: { memberId },
          include: {
            temple: {
              select: { id: true, name: true, denomination: true, logoUrl: true, address: true },
            },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),

    // 最近のJournal（最新3件）
    prisma.journal.findMany({
      where: { userId },
      select: {
        id: true, title: true, content: true,
        mood: true, tags: true, entryDate: true,
      },
      orderBy: { entryDate: "desc" },
      take: 3,
    }),

    // 過去6ヶ月の参加イベント（最大10件）
    memberId
      ? prisma.eventParticipation.findMany({
          where: {
            memberId,
            status: { in: ["APPLIED", "CONFIRMED"] },
            event: { eventDate: { gte: sixMonthsAgo, lte: now } },
          },
          include: {
            event: {
              select: {
                id: true, title: true, eventDate: true, startTime: true, category: true,
                temple: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { event: { eventDate: "desc" } },
          take: 10,
        })
      : Promise.resolve([]),

    // 累計参加回数
    memberId
      ? prisma.eventParticipation.count({
          where: { memberId, status: { in: ["APPLIED", "CONFIRMED"] } },
        })
      : Promise.resolve(0),
  ]);

  const daysSinceJoined = Math.floor(
    (now.getTime() - new Date(authUser.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  return NextResponse.json({
    user: {
      id: authUser.id,
      name: authUser.name,
      avatarUrl: authUser.avatarUrl ?? null,
      joinedAt: authUser.createdAt,
    },
    thisMonth: {
      journalCount: thisMonthJournalCount,
      eventParticipations: thisMonthEventCount,
      followedTemples: followedTemples.length,
    },
    recentJournals,
    pastEvents: pastEvents.map((p) => ({
      id: p.event.id,
      title: p.event.title,
      eventDate: p.event.eventDate,
      startTime: p.event.startTime,
      category: p.event.category,
      temple: p.event.temple,
    })),
    followedTemples: followedTemples.map((f) => f.temple),
    stats: {
      totalEventParticipations: totalEventCount,
      journalStreakDays: calcStreak(allJournalDates.map((j) => j.entryDate)),
      daysSinceJoined,
    },
  });
}
