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

    const isAdmin = ["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role);

    const where: Record<string, unknown> = {
      templeId: authUser.templeId,
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

    let participationMap: Record<string, string> = {};
    if (authUser.member) {
      const myParts = await prisma.eventParticipation.findMany({
        where: {
          memberId: authUser.member.id,
          eventId: { in: events.map((e) => e.id) },
        },
        select: { eventId: true, status: true },
      });
      participationMap = Object.fromEntries(myParts.map((p) => [p.eventId, p.status]));
    }

    // フォロー中の寺院IDを取得してフラグ付与
    let followedTempleIds = new Set<string>();
    if (authUser.member) {
      const favs = await prisma.memberFavoriteTemple.findMany({
        where: { memberId: authUser.member.id },
        select: { templeId: true },
      });
      followedTempleIds = new Set(favs.map((f) => f.templeId));
    }

    const eventsWithStatus = events.map((e) => ({
      ...e,
      myParticipationStatus: participationMap[e.id] ?? null,
      participantCount: e._count.participations,
      isFull: e.capacity != null && e._count.participations >= e.capacity,
      isFromFollowedTemple: followedTempleIds.has(e.templeId),
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
      eventType = "GROUP",
      imageUrl,
      status = "DRAFT",
    } = body;

    if (!title || !category || !eventDate || !startTime || !endTime) {
      return NextResponse.json({ error: "必須項目が不足しています" }, { status: 400 });
    }

    // 有料イベント × Stripe Connect 未完了 チェック
    const parsedFee = parseInt(fee) || 0;
    if (parsedFee > 0) {
      const temple = await prisma.temple.findUnique({
        where: { id: authUser.templeId },
        select: { stripeConnectOnboarded: true },
      });
      if (temple && !temple.stripeConnectOnboarded) {
        return NextResponse.json(
          {
            error: "有料イベントを作成するには決済設定（Stripe Connect）のセットアップが必要です。設定 > 決済設定 から完了してください。",
            code: "STRIPE_CONNECT_REQUIRED",
          },
          { status: 422 }
        );
      }
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
        fee: parsedFee,
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
