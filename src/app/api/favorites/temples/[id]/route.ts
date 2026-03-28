import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/favorites/temples/[id] — お気に入り解除
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth();
    if (!authUser.member) {
      return NextResponse.json({ error: "MEMBER_REQUIRED" }, { status: 403 });
    }

    const { id: templeId } = await params;

    await prisma.memberFavoriteTemple.deleteMany({
      where: { memberId: authUser.member.id, templeId },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
}
