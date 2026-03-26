import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/push";

// POST /api/cron/reminders
// type=evening → 翌日の予約・イベントを通知 (JST 18:00 = UTC 09:00)
// type=morning → 当日のイベント参加者・月命日を通知 (JST 09:00 = UTC 00:00)
export async function POST(request: NextRequest) {
  // Vercel Cron からのリクエスト認証
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "morning";

  const now = new Date();
  // JST での「今日」「明日」を計算
  const jstOffset = 9 * 60 * 60 * 1000;
  const todayJST = new Date(now.getTime() + jstOffset);
  todayJST.setUTCHours(0, 0, 0, 0);
  const tomorrowJST = new Date(todayJST.getTime() + 24 * 60 * 60 * 1000);

  let sent = 0;

  if (type === "evening") {
    // 翌日の確定済み予約を持つ会員へ通知
    const reservations = await prisma.reservation.findMany({
      where: {
        scheduledAt: { gte: tomorrowJST, lt: new Date(tomorrowJST.getTime() + 24 * 60 * 60 * 1000) },
        status: "CONFIRMED",
      },
      include: {
        member: {
          include: {
            user: {
              include: { pushSubscriptions: true },
            },
          },
        },
      },
    });

    for (const r of reservations) {
      const subs = r.member.user.pushSubscriptions;
      if (!r.member.user.pushEnabled || subs.length === 0) continue;

      const dateStr = r.scheduledAt.toLocaleDateString("ja-JP", {
        timeZone: "Asia/Tokyo",
        month: "long",
        day: "numeric",
        weekday: "short",
      });
      const timeStr = r.scheduledAt.toLocaleTimeString("ja-JP", {
        timeZone: "Asia/Tokyo",
        hour: "2-digit",
        minute: "2-digit",
      });

      for (const sub of subs) {
        const ok = await sendPushNotification(sub, {
          title: "明日の法要予約のお知らせ",
          body: `${dateStr} ${timeStr} に法要のご予約があります。`,
          url: "/app/reservations",
        });
        if (!ok) {
          await prisma.pushSubscription.deleteMany({
            where: { userId: r.member.user.id, endpoint: sub.endpoint },
          });
        } else {
          sent++;
        }
      }
    }

    // 翌日のイベント参加者へ通知
    const participations = await prisma.eventParticipation.findMany({
      where: {
        event: {
          eventDate: { gte: tomorrowJST, lt: new Date(tomorrowJST.getTime() + 24 * 60 * 60 * 1000) },
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
      const subs = p.member.user.pushSubscriptions;
      if (!p.member.user.pushEnabled || subs.length === 0) continue;

      for (const sub of subs) {
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
  } else {
    // type === "morning"
    // 当日のイベント参加者へ通知
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
      const subs = p.member.user.pushSubscriptions;
      if (!p.member.user.pushEnabled || subs.length === 0) continue;

      for (const sub of subs) {
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

    // 当日が月命日の故人を持つ会員へ通知
    const todayMonth = todayJST.getUTCMonth() + 1;
    const todayDay = todayJST.getUTCDate();

    const deceasedList = await prisma.deceasedPerson.findMany({
      where: {
        deathDate: { not: null },
      },
      include: {
        member: {
          include: {
            user: { include: { pushSubscriptions: true } },
          },
        },
      },
    });

    for (const d of deceasedList) {
      if (!d.deathDate) continue;
      const deathMonth = d.deathDate.getMonth() + 1;
      const deathDay = d.deathDate.getDate();
      if (deathMonth !== todayMonth || deathDay !== todayDay) continue;

      const subs = d.member.user.pushSubscriptions;
      if (!d.member.user.pushEnabled || subs.length === 0) continue;

      for (const sub of subs) {
        const ok = await sendPushNotification(sub, {
          title: "月命日のお知らせ",
          body: `本日は ${d.name} 様の月命日です。`,
          url: "/app/deceased",
        });
        if (!ok) {
          await prisma.pushSubscription.deleteMany({
            where: { userId: d.member.user.id, endpoint: sub.endpoint },
          });
        } else {
          sent++;
        }
      }
    }
  }

  return NextResponse.json({ ok: true, type, sent });
}
