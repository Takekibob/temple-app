import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activityLog";

const ALLOWED_FIELDS = [
  "name", "denomination", "address", "phone", "email", "description",
  "bookingStartTime", "bookingEndTime", "bookingDuration", "bookingMaxSlots", "bookingAdvanceDays",
  "reminderDayBefore", "reminderDayBeforeTime", "reminderDayOf", "reminderDayOfTime",
  "reminderMeinichi", "customEventCategories",
  // v2追加：ステージ閾値・目標
  "thresholdGoen", "thresholdProspect", "thresholdCandidate", "dankaGoalAnnual",
] as const;

// GET /api/settings
export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser || authUser.role === "MEMBER") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const temple = await prisma.temple.findUnique({
      where: { id: authUser.templeId },
      select: {
        id: true, name: true, denomination: true, address: true, phone: true,
        email: true, logoUrl: true, description: true,
        bookingStartTime: true, bookingEndTime: true, bookingDuration: true,
        bookingMaxSlots: true, bookingAdvanceDays: true,
        reminderDayBefore: true, reminderDayBeforeTime: true,
        reminderDayOf: true, reminderDayOfTime: true, reminderMeinichi: true,
        customEventCategories: true,
      },
    });

    if (!temple) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    return NextResponse.json(temple);
  } catch {
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// PATCH /api/settings
export async function PATCH(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !["ADMIN", "SUPER_ADMIN"].includes(authUser.role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};

    for (const field of ALLOWED_FIELDS) {
      if (field in body) data[field] = body[field];
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "NO_CHANGES" }, { status: 400 });
    }

    const temple = await prisma.temple.update({
      where: { id: authUser.templeId },
      data,
    });

    await logActivity({
      templeId: authUser.templeId,
      userId: authUser.id,
      action: "update",
      targetType: "settings",
      detail: { updated: Object.keys(data) },
    });

    return NextResponse.json(temple);
  } catch {
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
