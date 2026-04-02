import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth();
    if (!["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const { id: eventId } = await params;

    const event = await prisma.event.findFirst({ where: { id: eventId, templeId: authUser.templeId } });
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const participants = await prisma.eventParticipation.findMany({
      where: { eventId },
      include: {
        member: { include: { user: { select: { name: true, email: true, phone: true } } } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ participants });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth();
    if (!["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const { id: eventId } = await params;
    const event = await prisma.event.findFirst({ where: { id: eventId, templeId: authUser.templeId } });
    if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const { memberId, numGuests = 1 } = await request.json();
    if (!memberId) return NextResponse.json({ error: "memberId is required" }, { status: 400 });

    // Check member belongs to this temple
    const member = await prisma.member.findFirst({ where: { id: memberId, templeId: authUser.templeId } });
    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    // Check capacity
    if (event.capacity) {
      const currentCount = await prisma.eventParticipation.aggregate({
        where: { eventId, status: { notIn: ["CANCELLED", "WAITLISTED"] } },
        _sum: { numGuests: true },
      });
      const used = currentCount._sum.numGuests ?? 0;
      if (used + numGuests > event.capacity) {
        return NextResponse.json({ error: "定員を超えています" }, { status: 409 });
      }
    }

    const participation = await prisma.eventParticipation.upsert({
      where: { eventId_memberId: { eventId, memberId } },
      update: { status: "CONFIRMED", numGuests },
      create: { eventId, memberId, numGuests, status: "CONFIRMED", paymentStatus: "NOT_REQUIRED" },
      include: { member: { include: { user: { select: { name: true, email: true, phone: true } } } } },
    });

    return NextResponse.json({ participation }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
