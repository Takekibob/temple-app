import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth();
    const { id: memberId } = await params;

    // 自分の情報か管理者のみアクセス可
    const isAdmin = ["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role);
    const isOwn = authUser.member?.id === memberId;

    if (!isAdmin && !isOwn) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const member = await prisma.member.findFirst({
      where: { id: memberId, templeId: authUser.templeId },
    });
    if (!member) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    const deceased = await prisma.deceasedPerson.findMany({
      where: { memberId },
      orderBy: { deathDate: "desc" },
    });

    return NextResponse.json({ deceased });
  } catch {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
}
