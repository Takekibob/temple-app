import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireAdminOrStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { AnnouncementTarget } from "@/generated/prisma/enums";
import { sendPushNotification } from "@/lib/push";
import { sendLineNotification } from "@/lib/line";

// GET /api/announcements — 会員向け: 自分のセグメントに合ったお知らせ一覧
export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const memberType = authUser.member?.type ?? null;

    // セグメントフィルタ: ALL は全員、DANKA/GOEN は該当会員のみ
    const allowedSegments: AnnouncementTarget[] = memberType === "DANKA"
      ? ["ALL", "DANKA"]
      : memberType === "GOEN"
      ? ["ALL", "GOEN"]
      : ["ALL"];

    const announcements = await prisma.announcement.findMany({
      where: {
        templeId: authUser.templeId,
        publishedAt: { not: null, lte: new Date() },
        targetSegment: { in: allowedSegments },
      },
      orderBy: { publishedAt: "desc" },
      select: {
        id: true,
        title: true,
        targetSegment: true,
        publishedAt: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ announcements });
  } catch {
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// POST /api/announcements — 管理者: お知らせ作成
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAdminOrStaff();

    const body = await request.json();
    const { title, body: content, targetSegment, publish, sendPush, sendLine } = body;

    if (!title?.trim() || !content?.trim()) {
      return NextResponse.json({ error: "タイトルと本文は必須です" }, { status: 400 });
    }

    const validSegments = ["ALL", "DANKA", "GOEN"];
    if (targetSegment && !validSegments.includes(targetSegment)) {
      return NextResponse.json({ error: "不正なセグメント値です" }, { status: 400 });
    }

    const announcement = await prisma.announcement.create({
      data: {
        templeId: authUser.templeId,
        title: title.trim(),
        body: content.trim(),
        targetSegment: targetSegment ?? "ALL",
        publishedAt: publish ? new Date() : null,
        pushSent: false,
      },
    });

    // プッシュ通知送信
    if (publish && sendPush) {
      const seg: AnnouncementTarget = targetSegment ?? "ALL";

      const memberTypeFilter =
        seg === "DANKA" ? { type: "DANKA" as const } :
        seg === "GOEN"  ? { type: "GOEN" as const } :
        undefined;

      const subscriptions = await prisma.pushSubscription.findMany({
        where: {
          templeId: authUser.templeId,
          user: {
            pushEnabled: true,
            ...(memberTypeFilter ? { member: memberTypeFilter } : {}),
          },
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
      const seg: AnnouncementTarget = targetSegment ?? "ALL";

      const memberTypeFilter =
        seg === "DANKA" ? { type: "DANKA" as const } :
        seg === "GOEN"  ? { type: "GOEN" as const } :
        undefined;

      const lineMembers = await prisma.member.findMany({
        where: {
          templeId: authUser.templeId,
          lineNotifyEnabled: true,
          lineUserId: { not: null },
          notifyAnnouncement: true,
          ...(memberTypeFilter ?? {}),
        },
        select: { id: true },
      });

      const lineText = `【お知らせ】${title.trim()}\n\n${content.trim().slice(0, 200)}`;
      await Promise.allSettled(
        lineMembers.map((m) => sendLineNotification(m.id, lineText))
      );
    }

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
