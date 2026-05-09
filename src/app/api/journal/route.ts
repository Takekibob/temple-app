import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import type { Mood } from "@/generated/prisma/client";

const VALID_MOODS: Mood[] = ["PEACEFUL", "GRATEFUL", "STRUGGLING", "REFLECTIVE", "JOYFUL"];

// GET /api/journal — 自分の日記一覧（cursor-based, 20件）
export async function GET(request: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const userId = authUser.id;

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor") ?? undefined;
  const mood = searchParams.get("mood") as Mood | null;
  const tag = searchParams.get("tag") ?? undefined;
  const year = searchParams.get("year") ? parseInt(searchParams.get("year")!) : undefined;
  const month = searchParams.get("month") ? parseInt(searchParams.get("month")!) : undefined;
  const hasEvent = searchParams.get("hasEvent");
  const take = 20;

  // 日付範囲フィルタ
  let dateFilter: { gte?: Date; lte?: Date } | undefined;
  if (year && month) {
    dateFilter = {
      gte: new Date(year, month - 1, 1),
      lte: new Date(year, month, 0, 23, 59, 59),
    };
  } else if (year) {
    dateFilter = {
      gte: new Date(year, 0, 1),
      lte: new Date(year, 11, 31, 23, 59, 59),
    };
  }

  const where = {
    userId,
    ...(mood && VALID_MOODS.includes(mood) ? { mood } : {}),
    ...(tag ? { tags: { has: tag } } : {}),
    ...(dateFilter ? { entryDate: dateFilter } : {}),
    ...(hasEvent === "true" ? { relatedEventId: { not: null } } : {}),
    ...(hasEvent === "false" ? { relatedEventId: null } : {}),
  };

  const journals = await prisma.journal.findMany({
    where,
    select: {
      id: true,
      title: true,
      content: true,
      mood: true,
      tags: true,
      entryDate: true,
      relatedEventId: true,
      relatedEvent: { select: { id: true, title: true } },
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { entryDate: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = journals.length > take;
  const items = hasMore ? journals.slice(0, take) : journals;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return NextResponse.json({ journals: items, nextCursor });
}

// POST /api/journal — 新規作成
export async function POST(request: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const userId = authUser.id;

  const body = await request.json();
  const { title, content, mood, tags, entryDate, relatedEventId } = body;

  if (!content?.trim()) return NextResponse.json({ error: "本文を入力してください" }, { status: 400 });
  if (!entryDate) return NextResponse.json({ error: "日付を入力してください" }, { status: 400 });
  if (content.length > 10000) return NextResponse.json({ error: "本文は10,000文字以内にしてください" }, { status: 400 });

  const validatedMood = mood && VALID_MOODS.includes(mood as Mood) ? (mood as Mood) : undefined;
  const validatedTags = Array.isArray(tags)
    ? tags.filter((t: unknown) => typeof t === "string" && t.trim()).slice(0, 10)
    : [];

  // relatedEvent が自分の参加イベントか確認
  if (relatedEventId) {
    const participation = await prisma.eventParticipation.findFirst({
      where: { eventId: relatedEventId, member: { userId } },
    });
    if (!participation) return NextResponse.json({ error: "指定イベントへの参加記録がありません" }, { status: 400 });
  }

  const journal = await prisma.journal.create({
    data: {
      userId,
      title: title?.trim() || null,
      content: content.trim(),
      mood: validatedMood,
      tags: validatedTags,
      entryDate: new Date(entryDate),
      relatedEventId: relatedEventId || null,
    },
  });

  return NextResponse.json({ journal }, { status: 201 });
}
