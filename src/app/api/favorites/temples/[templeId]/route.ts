import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ templeId: string }> }
) {
  const authUser = await getAuthUser();
  if (!authUser || !authUser.member) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const { templeId } = await params;

  await prisma.memberFavoriteTemple.deleteMany({
    where: { memberId: authUser.member.id, templeId },
  });

  return NextResponse.json({ ok: true });
}
