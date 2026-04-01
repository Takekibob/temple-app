import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/cron/line-scheduled
// 毎5分実行: scheduledAt <= now() の SCHEDULED メッセージを送信
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const now = new Date();

  // 送信対象を SENDING に移してから処理（二重送信防止）
  const messages = await prisma.lineMessage.findMany({
    where: {
      status: "SCHEDULED",
      scheduledAt: { lte: now },
    },
  });

  if (messages.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  // まず全件 SENDING に更新
  await prisma.lineMessage.updateMany({
    where: { id: { in: messages.map((m) => m.id) } },
    data: { status: "SENDING" },
  });

  const channelToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  let processed = 0;

  for (const msg of messages) {
    try {
      let sentCount = 0;

      if (!channelToken) {
        // トークン未設定は FAILED
        await prisma.lineMessage.update({
          where: { id: msg.id },
          data: { status: "FAILED" },
        });
        continue;
      }

      if (msg.messageType === "BROADCAST") {
        const res = await fetch("https://api.line.me/v2/bot/message/broadcast", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${channelToken}`,
          },
          body: JSON.stringify({
            messages: Array.isArray(msg.content) ? msg.content : [msg.content],
          }),
        });
        if (res.ok) sentCount = 1;
      } else {
        const memberIds = msg.targetMemberIds;
        const members = await prisma.member.findMany({
          where: { id: { in: memberIds }, templeId: msg.templeId, lineUserId: { not: null } },
          select: { lineUserId: true },
        });

        for (const m of members) {
          if (!m.lineUserId) continue;
          const res = await fetch("https://api.line.me/v2/bot/message/push", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${channelToken}`,
            },
            body: JSON.stringify({
              to: m.lineUserId,
              messages: Array.isArray(msg.content) ? msg.content : [msg.content],
            }),
          });
          if (res.ok) sentCount++;
        }
      }

      await prisma.lineMessage.update({
        where: { id: msg.id },
        data: { status: "SENT", sentAt: new Date(), sentCount },
      });
      processed++;
    } catch {
      await prisma.lineMessage.update({
        where: { id: msg.id },
        data: { status: "FAILED" },
      });
    }
  }

  return NextResponse.json({ processed });
}
