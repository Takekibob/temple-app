import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const authUser = await getAuthUser();
  if (!authUser?.member) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { templeId, memo } = await req.json();
  if (!templeId) {
    return NextResponse.json({ error: "templeId is required" }, { status: 400 });
  }

  const temple = await prisma.temple.findFirst({
    where: { id: templeId, isActive: true },
    select: { id: true },
  });
  if (!temple) {
    return NextResponse.json({ error: "Temple not found" }, { status: 404 });
  }

  const visit = await prisma.templeVisit.create({
    data: {
      memberId: authUser.member.id,
      templeId,
      memo: (memo as string | undefined)?.trim() ?? "",
    },
  });

  return NextResponse.json({ id: visit.id, visitedAt: visit.visitedAt });
}
