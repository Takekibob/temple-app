import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await requireAuth();
    if (!["ADMIN", "SUPER_ADMIN", "STAFF"].includes(authUser.role)) {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, paidAt, amount } = body;

    const payment = await prisma.gojikaiPayment.findUnique({
      where: { id },
      include: { member: true },
    });

    if (!payment || payment.member.templeId !== authUser.templeId) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) {
      updateData.status = status;
      updateData.paidAt = status === "PAID" ? (paidAt ? new Date(paidAt) : new Date()) : null;
    }
    if (amount !== undefined) {
      const amountInt = parseInt(amount);
      if (isNaN(amountInt) || amountInt < 1) {
        return NextResponse.json({ error: "金額は1円以上を入力してください" }, { status: 400 });
      }
      updateData.amount = amountInt;
    }

    const updated = await prisma.gojikaiPayment.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ payment: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 500 });
  }
}
