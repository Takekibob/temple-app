import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth();
    const { id } = await params;

    const event = await prisma.event.findFirst({
      where: { id, templeId: authUser.templeId },
      include: {
        _count: {
          select: { participations: { where: { status: { notIn: ["CANCELLED"] } } } },
        },
      },
    });

    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isAdmin = ["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role);
    const isDanka = authUser.member?.type === "DANKA";

    // Visibility check for non-admins
    if (!isAdmin) {
      if (event.status !== "PUBLISHED") {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (event.visibility === "DANKA_ONLY" && !isDanka) {
        return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
      }
    }

    // My participation status
    let myParticipation = null;
    if (authUser.member) {
      myParticipation = await prisma.eventParticipation.findUnique({
        where: { eventId_memberId: { eventId: id, memberId: authUser.member.id } },
        select: { id: true, status: true, numGuests: true },
      });
    }

    return NextResponse.json({
      event: {
        ...event,
        participantCount: event._count.participations,
        isFull: event.capacity != null && event._count.participations >= event.capacity,
        myParticipation,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth();
    if (!["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const event = await prisma.event.findFirst({ where: { id, templeId: authUser.templeId } });
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const {
      title,
      description,
      category,
      eventDate,
      startTime,
      endTime,
      location,
      capacity,
      fee,
      visibility,
      imageUrl,
      status,
    } = body;

    const updated = await prisma.event.update({
      where: { id },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description: description || null } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(eventDate !== undefined ? { eventDate: new Date(eventDate) } : {}),
        ...(startTime !== undefined ? { startTime } : {}),
        ...(endTime !== undefined ? { endTime } : {}),
        ...(location !== undefined ? { location: location || null } : {}),
        ...(capacity !== undefined ? { capacity: capacity ? parseInt(capacity) : null } : {}),
        ...(fee !== undefined ? { fee: parseInt(fee) || 0 } : {}),
        ...(visibility !== undefined ? { visibility } : {}),
        ...(imageUrl !== undefined ? { imageUrl: imageUrl || null } : {}),
        ...(status !== undefined ? { status } : {}),
      },
    });

    return NextResponse.json({ event: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth();
    if (!["ADMIN", "SUPER_ADMIN"].includes(authUser.role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    const { id } = await params;

    const event = await prisma.event.findFirst({ where: { id, templeId: authUser.templeId } });
    if (!event) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    // 参加者がいる場合は削除不可
    const participantCount = await prisma.eventParticipation.count({
      where: { eventId: id, status: { notIn: ["CANCELLED"] } },
    });
    if (participantCount > 0) {
      return NextResponse.json(
        { error: `参加者が${participantCount}名います。先にキャンセル処理を行ってください。` },
        { status: 400 }
      );
    }

    await prisma.event.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 500 });
  }
}
