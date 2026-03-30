import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await requireSuperAdmin();
    const { id } = await params;
    const { planStatus, reason } = await request.json();

    const valid = ["TRIAL", "ACTIVE", "PAST_DUE", "CANCELLED", "SUSPENDED"];
    if (!valid.includes(planStatus)) {
      return NextResponse.json({ error: "無効なプランステータス" }, { status: 400 });
    }

    const temple = await prisma.temple.findUnique({ where: { id } });
    if (!temple) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    await prisma.temple.update({ where: { id }, data: { planStatus } });

    // 操作ログに記録
    await prisma.superAdminLog.create({
      data: {
        adminId: authUser.id,
        action: "PLAN_CHANGE",
        targetType: "TEMPLE",
        targetId: id,
        detail: `${temple.planStatus} → ${planStatus}${reason ? ` (${reason})` : ""}`,
      },
    }).catch(() => {}); // ログ失敗でもメイン処理は成功とする

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
