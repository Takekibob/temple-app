import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/subscriptions/[id] — 管理者によるサブスク解約
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser || !["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    const sub = await prisma.memberSubscription.findUnique({ where: { id } });
    if (!sub || sub.templeId !== authUser.templeId) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const updated = await prisma.memberSubscription.update({
      where: { id },
      data: {
        status,
        ...(status === "CANCELED" ? { canceledAt: new Date() } : {}),
      },
    });

    return NextResponse.json({ subscription: updated });
  } catch {
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
