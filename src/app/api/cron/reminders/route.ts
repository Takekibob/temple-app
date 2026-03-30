import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/push";
import { sendLineNotification } from "@/lib/line";
import { sendReservationReminderEmail } from "@/lib/email";

const RESERVATION_TYPE_LABELS: Record<string, string> = {
  ANNUAL_MEMORIAL: "年忌法要",
  MONTHLY_MEMORIAL: "月命日",
  NIBON: "新盆",
  KUYO: "供養",
  FUNERAL: "葬儀",
  OTHER: "法要",
};

// POST /api/cron/reminders
// type=evening → 翌日の予約・イベントを通知 (JST 18:00 = UTC 09:00)
// type=morning → 当日のイベント参加者・月命日を通知 (JST 09:00 = UTC 00:00)
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
    // ── 翌日の確定済み予約 ─────────────────────────────
    const reservations = await prisma.reservation.findMany({
      where: {
        scheduledAt: {
          gte: tomorrowJST,
          lt: new Date(tomorrowJST.getTime() + 24 * 60 * 60 * 1000),
        },
        status: "CONFIRMED",
      },
      include: {
        temple: { select: { name: true } },
        member: {
          include: {
            user: { include: { pushSubscriptions: true } },
          },
        },
      },
    });

    for (const r of reservations) {
      if (!r.member.notifyReservation) continue;

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
      const msg = `明日の法要予約のお知らせ\n${dateStr} ${timeStr} に法要のご予約があります。`;

      // Web Push
      if (r.member.user.pushEnabled) {
        for (const sub of r.member.user.pushSubscriptions) {
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

      // LINE
      if (r.member.lineUserId && r.member.lineNotifyEnabled) {
        const ok = await sendLineNotification(r.member.id, msg);
        if (ok) sent++;
      }

      // Email
      if (r.member.user.email) {
        await sendReservationReminderEmail({
          to: r.member.user.email,
          memberName: r.member.user.name ?? "",
          reservationType: RESERVATION_TYPE_LABELS[r.type] ?? r.type,
          scheduledAt: r.scheduledAt,
          templeName: r.temple.name,
        }).catch(() => {});
        sent++;
      }
    }

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

    // ── 当日が月命日の故人を持つ会員 ─────────────────────
    const todayMonth = todayJST.getUTCMonth() + 1;
    const todayDay = todayJST.getUTCDate();

    const deceasedList = await prisma.deceasedPerson.findMany({
      where: { deathDate: { not: null } },
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
      if (
        d.deathDate.getMonth() + 1 !== todayMonth ||
        d.deathDate.getDate() !== todayDay
      ) continue;

      if (!d.member.notifyAnniversary) continue;

      const msg = `月命日のお知らせ\n本日は ${d.name} 様の月命日です。`;

      if (d.member.user.pushEnabled) {
        for (const sub of d.member.user.pushSubscriptions) {
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

      if (d.member.lineUserId && d.member.lineNotifyEnabled) {
        const ok = await sendLineNotification(d.member.id, msg);
        if (ok) sent++;
      }
    }
  }

  return NextResponse.json({ ok: true, type, sent });
}
