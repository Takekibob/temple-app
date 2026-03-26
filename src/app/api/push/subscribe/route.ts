import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/push/subscribe — プッシュ通知サブスクリプション登録
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint, p256dh, auth } = body;

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: "endpoint, p256dh, auth は必須です" }, { status: 400 });
    }

    await prisma.pushSubscription.upsert({
      where: { userId_endpoint: { userId: authUser.id, endpoint } },
      create: {
        userId: authUser.id,
        templeId: authUser.templeId,
        endpoint,
        p256dh,
        auth,
      },
      update: { p256dh, auth },
    });

    // pushEnabled を true に更新
    await prisma.user.update({
      where: { id: authUser.id },
      data: { pushEnabled: true },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
