import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import type { Mood } from "@/generated/prisma/client";

const VALID_MOODS: Mood[] = ["PEACEFUL", "GRATEFUL", "STRUGGLING", "REFLECTIVE", "JOYFUL"];

// GET /api/journal/[id]
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser();
  if (!authUser) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { id } = await params;

  const journal = await prisma.journal.findFirst({
    where: { id, userId: authUser.id },
    include: { relatedEvent: { select: { id: true, title: true, eventDate: true } } },
  });

  if (!journal) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  return NextResponse.json({ journal });
}

// PATCH /api/journal/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser();
  if (!authUser) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.journal.findFirst({ where: { id, userId: authUser.id } });
  if (!existing) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  const body = await request.json();
  const { title, content, mood, tags, entryDate, relatedEventId } = body;

  if (content !== undefined && !content?.trim())
    return NextResponse.json({ error: "本文を入力してください" }, { status: 400 });
  if (content?.length > 10000)
    return NextResponse.json({ error: "本文は10,000文字以内にしてください" }, { status: 400 });

  const validatedMood =
    mood === null ? null
    : mood && VALID_MOODS.includes(mood as Mood) ? (mood as Mood)
    : undefined;

  const validatedTags = Array.isArray(tags)
    ? tags.filter((t: unknown) => typeof t === "string" && t.trim()).slice(0, 10)
    : undefined;

  if (relatedEventId) {
    const participation = await prisma.eventParticipation.findFirst({
      where: { eventId: relatedEventId, member: { userId: authUser.id } },
    });
    if (!participation) return NextResponse.json({ error: "指定イベントへの参加記録がありません" }, { status: 400 });
  }

  const journal = await prisma.journal.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title: title?.trim() || null } : {}),
      ...(content !== undefined ? { content: content.trim() } : {}),
      ...(validatedMood !== undefined ? { mood: validatedMood } : {}),
      ...(validatedTags !== undefined ? { tags: validatedTags } : {}),
      ...(entryDate !== undefined ? { entryDate: new Date(entryDate) } : {}),
      ...(relatedEventId !== undefined ? { relatedEventId: relatedEventId || null } : {}),
    },
  });

  return NextResponse.json({ journal });
}

// DELETE /api/journal/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthUser();
  if (!authUser) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { id } = await params;

  const existing = await prisma.journal.findFirst({ where: { id, userId: authUser.id } });
  if (!existing) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

  await prisma.journal.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
