import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAdminOrStaff();
    if (authUser.role !== "ADMIN") {
      return NextResponse.json({ error: "管理者のみ引き継ぎできます" }, { status: 403 });
    }

    const { transferToId } = await req.json();
    if (!transferToId || transferToId === authUser.id) {
      return NextResponse.json({ error: "引き継ぎ先を正しく選択してください" }, { status: 400 });
    }

    const target = await prisma.user.findFirst({
      where: { id: transferToId, templeId: authUser.templeId, isActive: true },
      select: { id: true, role: true },
    });
    if (!target) {
      return NextResponse.json({ error: "対象ユーザーが見つかりません" }, { status: 404 });
    }

    // 引き継ぎ先をADMINに、自分をSTAFFに
    await prisma.$transaction([
      prisma.user.update({ where: { id: transferToId }, data: { role: "ADMIN" } }),
      prisma.user.update({ where: { id: authUser.id }, data: { role: "STAFF" } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED" || msg === "PAYMENT_REQUIRED") {
      return NextResponse.json({ error: msg }, { status: msg === "UNAUTHORIZED" ? 401 : 402 });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
