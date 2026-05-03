import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/calendar?year=2026&month=4
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const year = parseInt(searchParams.get("year") ?? String(now.getFullYear()), 10);
    const month = parseInt(searchParams.get("month") ?? String(now.getMonth() + 1), 10);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "Invalid params" }, { status: 400 });
    }

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1);

    const events = await prisma.event.findMany({
      where: {
        templeId: authUser.templeId,
        status: "PUBLISHED",
        eventDate: { gte: monthStart, lt: monthEnd },
        visibility: { in: ["PUBLIC", "FOLLOWERS_ONLY"] },
      },
      select: {
        id: true,
        title: true,
        eventDate: true,
        startTime: true,
        endTime: true,
        category: true,
        fee: true,
      },
      orderBy: { eventDate: "asc" },
    });

    return NextResponse.json({
      year,
      month,
      events: events.map((e) => ({
        id: e.id,
        title: e.title,
        date: e.eventDate.toISOString().slice(0, 10),
        startTime: e.startTime,
        endTime: e.endTime,
        category: e.category,
        fee: e.fee,
        type: "event" as const,
        color: "green" as const,
      })),
    });
  } catch {
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
