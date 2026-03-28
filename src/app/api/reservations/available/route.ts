import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Returns available 60-min slots for a given date (YYYY-MM-DD)
// Working hours: 9:00–17:00 (8 slots)
export async function GET(request: NextRequest) {
  try {
    const authUser = await requireAuth();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date"); // YYYY-MM-DD
    const duration = parseInt(searchParams.get("duration") ?? "60");

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: "date is required (YYYY-MM-DD)" }, { status: 400 });
    }

    const dayStart = new Date(`${date}T00:00:00`);
    const dayEnd = new Date(`${date}T23:59:59`);

    // Fetch existing reservations for that day
    const existing = await prisma.reservation.findMany({
      where: {
        templeId: authUser.templeId,
        status: { notIn: ["CANCELLED"] },
        scheduledAt: { gte: dayStart, lte: dayEnd },
      },
      select: { scheduledAt: true, durationMin: true },
    });

    // Generate candidate slots: 9:00, 10:00, ... 16:00 (last start for 60-min = 16:00)
    const slots: { time: string; available: boolean }[] = [];
    const lastStart = 17 * 60 - duration; // minutes from midnight

    for (let minutesFromMidnight = 9 * 60; minutesFromMidnight <= lastStart; minutesFromMidnight += 60) {
      const slotStart = new Date(dayStart);
      slotStart.setMinutes(minutesFromMidnight);
      const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);

      // Check conflict
      const hasConflict = existing.some((r) => {
        const rEnd = new Date(r.scheduledAt.getTime() + r.durationMin * 60 * 1000);
        return slotStart < rEnd && slotEnd > r.scheduledAt;
      });

      // Skip past slots
      const isPast = slotStart <= new Date();

      const hh = String(Math.floor(minutesFromMidnight / 60)).padStart(2, "0");
      const mm = String(minutesFromMidnight % 60).padStart(2, "0");

      slots.push({ time: `${hh}:${mm}`, available: !hasConflict && !isPast });
    }

    return NextResponse.json({ slots });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
