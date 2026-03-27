import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/annual-events/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role === "MEMBER") {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.annualEvent.findFirst({
      where: { id, templeId: authUser.templeId },
    });
    if (!existing) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const body = await request.json();
    const { name, month, day, endDay, description, isRecurring, showOnCalendar } = body;

    const updated = await prisma.annualEvent.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: String(name) }),
        ...(month !== undefined && { month: Number(month) }),
        ...(day !== undefined && { day: Number(day) }),
        endDay: endDay ? Number(endDay) : null,
        ...(description !== undefined && { description: description ? String(description) : null }),
        ...(isRecurring !== undefined && { isRecurring: Boolean(isRecurring) }),
        ...(showOnCalendar !== undefined && { showOnCalendar: Boolean(showOnCalendar) }),
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// DELETE /api/annual-events/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role === "MEMBER") {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.annualEvent.findFirst({
      where: { id, templeId: authUser.templeId },
    });
    if (!existing) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    await prisma.annualEvent.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
