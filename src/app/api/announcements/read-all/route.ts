import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { AnnouncementTarget } from "@/generated/prisma/enums";

// POST /api/announcements/read-all — mark all visible announcements as read
export async function POST(_req: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !authUser.member) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const memberId = authUser.member.id;
    const memberType = authUser.member.type;

    const allowedSegments: AnnouncementTarget[] = memberType === "DANKA"
      ? ["ALL", "DANKA"]
      : memberType === "GOEN"
      ? ["ALL", "GOEN"]
      : ["ALL"];

    const announcements = await prisma.announcement.findMany({
      where: {
        templeId: authUser.templeId,
        publishedAt: { not: null, lte: new Date() },
        OR: [
          { memberId: null, targetSegment: { in: allowedSegments } },
          { memberId },
        ],
      },
      select: { id: true },
    });

    await Promise.all(
      announcements.map((a) =>
        prisma.announcementRead.upsert({
          where: { memberId_announcementId: { memberId, announcementId: a.id } },
          update: { readAt: new Date() },
          create: { memberId, announcementId: a.id },
        })
      )
    );

    return NextResponse.json({ ok: true, count: announcements.length });
  } catch {
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
