import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/push";
import { sendLineNotification } from "@/lib/line";

// POST /api/cron/reminders
// type=evening → 翌日のイベント参加者を通知 (JST 18:00 = UTC 09:00)
// type=morning → 当日のイベント参加者を通知 (JST 09:00 = UTC 00:00)
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "morning";

  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000;
  const todayJST = new Date(now.getTime() + jstOffset);
  todayJST.setUTCHours(0, 0, 0, 0);
  const tomorrowJST = new Date(todayJST.getTime() + 24 * 60 * 60 * 1000);

  let sent = 0;

  if (type === "evening") {
    // ── 翌日のイベント参加者 ─────────────────────────────
    const participations = await prisma.eventParticipation.findMany({
      where: {
        event: {
          eventDate: {
            gte: tomorrowJST,
            lt: new Date(tomorrowJST.getTime() + 24 * 60 * 60 * 1000),
          },
          status: "PUBLISHED",
        },
        status: { in: ["CONFIRMED", "APPLIED"] },
      },
      include: {
        event: true,
        member: {
          include: {
            user: { include: { pushSubscriptions: true } },
          },
        },
      },
    });

    for (const p of participations) {
      if (!p.member.notifyEvent) continue;

      const msg = `明日のイベントのお知らせ\n「${p.event.title}」は明日 ${p.event.startTime} からです。`;

      if (p.member.user.pushEnabled) {
        for (const sub of p.member.user.pushSubscriptions) {
          const ok = await sendPushNotification(sub, {
            title: "明日のイベントのお知らせ",
            body: `「${p.event.title}」は明日 ${p.event.startTime} からです。`,
            url: `/app/events/${p.event.id}`,
          });
          if (!ok) {
            await prisma.pushSubscription.deleteMany({
              where: { userId: p.member.user.id, endpoint: sub.endpoint },
            });
          } else {
            sent++;
          }
        }
      }

      if (p.member.lineUserId && p.member.lineNotifyEnabled) {
        const ok = await sendLineNotification(p.member.id, msg);
        if (ok) sent++;
      }
    }
  } else {
    // ── 当日のイベント参加者 ─────────────────────────────
    const participations = await prisma.eventParticipation.findMany({
      where: {
        event: {
          eventDate: { gte: todayJST, lt: tomorrowJST },
          status: "PUBLISHED",
        },
        status: { in: ["CONFIRMED", "APPLIED"] },
      },
      include: {
        event: true,
        member: {
          include: {
            user: { include: { pushSubscriptions: true } },
          },
        },
      },
    });

    for (const p of participations) {
      if (!p.member.notifyEvent) continue;

      const msg = `本日のイベントのお知らせ\n「${p.event.title}」は本日 ${p.event.startTime} からです。`;

      if (p.member.user.pushEnabled) {
        for (const sub of p.member.user.pushSubscriptions) {
          const ok = await sendPushNotification(sub, {
            title: "本日のイベントのお知らせ",
            body: `「${p.event.title}」は本日 ${p.event.startTime} からです。`,
            url: `/app/events/${p.event.id}`,
          });
          if (!ok) {
            await prisma.pushSubscription.deleteMany({
              where: { userId: p.member.user.id, endpoint: sub.endpoint },
            });
          } else {
            sent++;
          }
        }
      }

      if (p.member.lineUserId && p.member.lineNotifyEnabled) {
        const ok = await sendLineNotification(p.member.id, msg);
        if (ok) sent++;
      }
    }
  }

  return NextResponse.json({ ok: true, type, sent });
}
