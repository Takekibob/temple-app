import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth();
    const { id } = await params;

    const reservation = await prisma.reservation.findFirst({
      where: { id, templeId: authUser.templeId },
      include: {
        member: { include: { user: { select: { name: true, email: true, phone: true } } } },
        deceasedPerson: true,
      },
    });

    if (!reservation) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Members can only see their own
    if (authUser.role === "MEMBER" && reservation.memberId !== authUser.member?.id) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    return NextResponse.json({ reservation });
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth();
    const { id } = await params;

    const reservation = await prisma.reservation.findFirst({
      where: { id, templeId: authUser.templeId },
    });
    if (!reservation) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isAdmin = ["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role);
    const isOwner = reservation.memberId === authUser.member?.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const body = await request.json();

    // Members can only cancel
    if (!isAdmin) {
      if (body.status && body.status !== "CANCELLED") {
        return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
      }
      const updated = await prisma.reservation.update({
        where: { id },
        data: { status: "CANCELLED" },
      });
      return NextResponse.json({ reservation: updated });
    }

    // Admins can update all fields
    const { status, scheduledAt, durationMin, notes, deceasedPersonId } = body;

    const updated = await prisma.reservation.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(scheduledAt ? { scheduledAt: new Date(scheduledAt) } : {}),
        ...(durationMin ? { durationMin } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(deceasedPersonId !== undefined ? { deceasedPersonId: deceasedPersonId || null } : {}),
      },
      include: {
        member: { include: { user: { select: { name: true } } } },
        deceasedPerson: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ reservation: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "error";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}
