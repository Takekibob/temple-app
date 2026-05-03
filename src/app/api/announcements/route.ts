import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireAdminOrStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/activityLog";
import { sendPushNotification } from "@/lib/push";
import { sendLineNotification } from "@/lib/line";

// GET /api/announcements — 会員向け: ブロードキャストお知らせ一覧
export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const memberId = authUser.member?.id ?? null;
    const announcements = await prisma.announcement.findMany({
      where: {
        templeId: authUser.templeId,
        publishedAt: { not: null, lte: new Date() },
      },
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        title: true,
        publishedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ announcements, memberId });
  } catch {
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// POST /api/announcements — 管理者: お知らせ作成（ブロードキャストのみ）
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAdminOrStaff();

    const body = await request.json();
    const { title, body: content, publish, sendPush, sendLine } = body;

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "タイトルと本文は必須です" }, { status: 400 });
    }

    const announcement = await prisma.announcement.create({
      data: {
        templeId: authUser.templeId,
        title: title.trim(),
        body: content.trim(),
        publishedAt: publish ? new Date() : null,
        pushSent: false,
      },
    });

    // プッシュ通知送信
    if (publish && sendPush) {
      const subscriptions = await prisma.pushSubscription.findMany({
        where: {
          templeId: authUser.templeId,
          user: { pushEnabled: true },
        },
      });

      const pushPayload = {
        title: title.trim(),
        body: content.trim().slice(0, 100),
        url: "/app/news",
      };

      const staleIds: string[] = [];
      await Promise.allSettled(
        subscriptions.map(async (sub) => {
          const ok = await sendPushNotification(sub, pushPayload);
          if (!ok) staleIds.push(sub.id);
        })
      );

      if (staleIds.length > 0) {
        await prisma.pushSubscription.deleteMany({ where: { id: { in: staleIds } } });
      }

      await prisma.announcement.update({
        where: { id: announcement.id },
        data: { pushSent: true },
      });
    }

    // LINE通知送信
    if (publish && sendLine) {
      const lineMembers = await prisma.member.findMany({
        where: {
          templeId: authUser.templeId,
          lineNotifyEnabled: true,
          lineUserId: { not: null },
          notifyAnnouncement: true,
        },
        select: { id: true },
      });

      const lineText = `【お知らせ】${title.trim()}\n\n${content.trim().slice(0, 200)}`;
      await Promise.allSettled(
        lineMembers.map((m) => sendLineNotification(m.id, lineText))
      );
    }

    logActivity({
      templeId: authUser.templeId,
      userId: authUser.id,
      action: "create",
      targetType: "announcement",
      targetId: announcement.id,
      targetName: title.trim(),
      detail: { published: !!publish },
    });

    return NextResponse.json({ announcement }, { status: 201 });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }
    if (e instanceof Error && e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
