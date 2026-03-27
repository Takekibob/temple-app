import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/annual-events?month=3
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role === "MEMBER") {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get("month");
    const month = monthParam ? parseInt(monthParam, 10) : null;

    const where: Record<string, unknown> = { templeId: authUser.templeId };
    if (month && month >= 1 && month <= 12) where.month = month;

    const events = await prisma.annualEvent.findMany({
      where,
      orderBy: [{ month: "asc" }, { day: "asc" }],
    });

    return NextResponse.json(events);
  } catch {
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// POST /api/annual-events
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role === "MEMBER") {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await request.json();
    const { name, month, day, endDay, description, isRecurring, showOnCalendar } = body;

    if (!name || !month || !day) {
      return NextResponse.json({ error: "INVALID_PARAMS" }, { status: 400 });
    }

    const event = await prisma.annualEvent.create({
      data: {
        templeId: authUser.templeId,
        name: String(name),
        month: Number(month),
        day: Number(day),
        endDay: endDay ? Number(endDay) : null,
        description: description ? String(description) : null,
        isRecurring: isRecurring !== false,
        showOnCalendar: showOnCalendar !== false,
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch {
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
