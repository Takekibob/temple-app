import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/announcements/[id]/read — mark as read
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !authUser.member) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const { id } = await params;
    const memberId = authUser.member.id;

    await prisma.announcementRead.upsert({
      where: { memberId_announcementId: { memberId, announcementId: id } },
      update: { readAt: new Date(), isDeleted: false },
      create: { memberId, announcementId: id },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
