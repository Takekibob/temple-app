import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/push/unsubscribe — プッシュ通知サブスクリプション解除
export async function DELETE(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint } = body;

    if (endpoint) {
      // 特定のエンドポイントのみ削除
      await prisma.pushSubscription.deleteMany({
        where: { userId: authUser.id, endpoint },
      });
    } else {
      // 全サブスクリプション削除
      await prisma.pushSubscription.deleteMany({
        where: { userId: authUser.id },
      });
    }

    // 残りのサブスクリプションがなければ pushEnabled を false に
    const remaining = await prisma.pushSubscription.count({
      where: { userId: authUser.id },
    });
    if (remaining === 0) {
      await prisma.user.update({
        where: { id: authUser.id },
        data: { pushEnabled: false },
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
