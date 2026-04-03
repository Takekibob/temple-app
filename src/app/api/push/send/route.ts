import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/push";
import type { AnnouncementTarget } from "@/generated/prisma/enums";

/**
 * POST /api/push/send — 管理者によるプッシュ通知手動送信
 *
 * Body:
 *   title    — 通知タイトル（必須）
 *   body     — 通知本文（必須）
 *   url      — タップ時に開くURL（省略可, default: /app）
 *   segment  — "ALL" | "DANKA" | "GOEN"（デフォルト: "ALL"）
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await requireAdmin();

    const { title, body, url, segment } = await request.json();

    if (!title || !body) {
      return NextResponse.json({ error: "title と body は必須です" }, { status: 400 });
    }

    const seg: AnnouncementTarget =
      segment === "DANKA" ? "DANKA" : segment === "GOEN" ? "GOEN" : "ALL";

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

    const payload = { title, body, url: url ?? "/app" };
    const staleIds: string[] = [];

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const ok = await sendPushNotification(sub, payload);
        if (!ok) staleIds.push(sub.id);
      })
    );

    if (staleIds.length > 0) {
      await prisma.pushSubscription.deleteMany({ where: { id: { in: staleIds } } });
    }

    return NextResponse.json({ sent: subscriptions.length - staleIds.length, failed: staleIds.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "UNAUTHORIZED") return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (msg === "FORBIDDEN") return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    if (msg.includes("VAPID keys")) {
      return NextResponse.json({ error: "プッシュ通知が設定されていません（VAPID キー未設定）" }, { status: 503 });
    }
    console.error("[/api/push/send]", err);
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
