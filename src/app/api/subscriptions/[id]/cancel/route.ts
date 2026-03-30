import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await requireAuth();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const subscription = await prisma.memberSubscription.findUnique({ where: { id } });
  if (!subscription) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  // 本人またはADMIN/STAFFのみ解約可能
  const isOwner = authUser.member?.id === subscription.memberId;
  const isStaff = ["ADMIN", "STAFF"].includes(authUser.role);
  if (!isOwner && !isStaff) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  await prisma.memberSubscription.update({
    where: { id },
    data: {
      status: "CANCELED",
      canceledAt: new Date(),
      cancelReason: body.reason ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}
