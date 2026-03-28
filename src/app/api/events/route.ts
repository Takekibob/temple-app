import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    const { searchParams } = new URL(request.url);

    const category = searchParams.get("category");
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const PAGE_SIZE = 20;
    const myEvents = searchParams.get("my") === "1";

    // Visibility filter based on member type
    const isDanka = authUser.member?.type === "DANKA";
    const isAdmin = ["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role);

    const visibilityFilter = isAdmin
      ? undefined
      : isDanka
      ? { visibility: { in: ["PUBLIC", "MEMBERS_ONLY", "DANKA_ONLY"] as const } }
      : { visibility: { in: ["PUBLIC", "MEMBERS_ONLY"] as const } };

    const where: Record<string, unknown> = {
      templeId: authUser.templeId,
      ...(visibilityFilter ?? {}),
      ...(!isAdmin ? { status: "PUBLISHED" } : {}),
      ...(category ? { category } : {}),
    };

    if (myEvents && authUser.member) {
      const myParticipations = await prisma.eventParticipation.findMany({
        where: { memberId: authUser.member.id, status: { not: "CANCELLED" } },
        select: { eventId: true },
      });
      where.id = { in: myParticipations.map((p) => p.eventId) };
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        orderBy: { eventDate: "asc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          _count: {
            select: {
              participations: {
                where: { status: { notIn: ["CANCELLED"] } },
              },
            },
          },
        },
      }),
      prisma.event.count({ where }),
    ]);

    // Add my participation status if member
    let participationMap: Record<string, string> = {};
    if (authUser.member) {
      const myParts = await prisma.eventParticipation.findMany({
        where: {
          memberId: authUser.member.id,
          eventId: { in: events.map((e) => e.id) },
        },
        select: { eventId: true, status: true, id: true },
      });
      participationMap = Object.fromEntries(myParts.map((p) => [p.eventId, p.status]));
    }

    const eventsWithStatus = events.map((e) => ({
      ...e,
      myParticipationStatus: participationMap[e.id] ?? null,
      participantCount: e._count.participations,
      isFull: e.capacity != null && e._count.participations >= e.capacity,
    }));

    return NextResponse.json({ events: eventsWithStatus, total, page, pageSize: PAGE_SIZE });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    if (!["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      category,
      eventDate,
      startTime,
      endTime,
      location,
      capacity,
      fee = 0,
      visibility = "PUBLIC",
      imageUrl,
      status = "DRAFT",
    } = body;

    if (!title || !category || !eventDate || !startTime || !endTime) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
    }

    const event = await prisma.event.create({
      data: {
        templeId: authUser.templeId,
        title,
        description: description || null,
        category,
        eventDate: new Date(eventDate),
        startTime,
        endTime,
        location: location || null,
        capacity: capacity ? parseInt(capacity) : null,
        fee: parseInt(fee) || 0,
        visibility,
        imageUrl: imageUrl || null,
        status,
      },
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    return NextResponse.json({ error: "作成に失敗しました" }, { status: 500 });
  }
}
