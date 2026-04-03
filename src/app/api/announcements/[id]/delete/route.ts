import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/announcements/[id]/delete — soft delete (hide from member's feed)
export async function DELETE(
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
      update: { isDeleted: true, readAt: new Date() },
      create: { memberId, announcementId: id, isDeleted: true },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
