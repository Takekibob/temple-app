import { NextResponse } from "next/server";
import { requireAdminOrStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/conversion/candidates — 転換候補一覧（ご縁さんでスコア70以上）
export async function GET() {
  try {
    const authUser = await requireAdminOrStaff();

    const candidates = await prisma.member.findMany({
      where: {
        templeId: authUser.templeId,
        type: "GOEN",
        engagementScore: { gte: 70 },
      },
      select: {
        id: true,
        familyName: true,
        engagementScore: true,
        joinedDate: true,
        interestTags: true,
        user: { select: { name: true, email: true } },
        eventParticipations: {
          where: { status: { in: ["ATTENDED", "CONFIRMED", "APPLIED"] } },
          select: { id: true },
        },
        _count: { select: { activities: true } },
      },
      orderBy: { engagementScore: "desc" },
    });

    const result = candidates.map((c) => ({
      id: c.id,
      name: c.user.name,
      email: c.user.email,
      familyName: c.familyName,
      engagementScore: c.engagementScore,
      joinedDate: c.joinedDate,
      interestTags: Array.isArray(c.interestTags) ? c.interestTags : [],
      eventCount: c.eventParticipations.length,
      activityCount: c._count.activities,
    }));

    return NextResponse.json({ candidates: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
