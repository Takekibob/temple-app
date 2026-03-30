import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/cron/line-steps
// 毎15分実行: nextSendAt <= now() のキューを処理してLINEメッセージを送信
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const channelToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const now = new Date();

  const pendingQueues = await prisma.lineStepQueue.findMany({
    where: {
      status: "PENDING",
      nextSendAt: { lte: now },
    },
    include: {
      sequence: true,
      member: { select: { id: true, lineUserId: true } },
    },
    take: 200,
  });

  let sent = 0;

  for (const queue of pendingQueues) {
    if (!queue.member.lineUserId || !channelToken) {
      await prisma.lineStepQueue.update({
        where: { id: queue.id },
        data: { status: "CANCELLED" },
      });
      continue;
    }

    const steps = queue.sequence.steps as Array<{ delayDays: number; message: unknown }>;
    const step = steps[queue.currentStep];

    if (!step) {
      await prisma.lineStepQueue.update({
        where: { id: queue.id },
        data: { status: "COMPLETED", completedAt: now },
      });
      continue;
    }

    try {
      const res = await fetch("https://api.line.me/v2/bot/message/push", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${channelToken}`,
        },
        body: JSON.stringify({
          to: queue.member.lineUserId,
          messages: [step.message],
        }),
      });

      if (res.ok) sent++;

      const nextStep = steps[queue.currentStep + 1];
      if (nextStep) {
        const nextSendAt = new Date(now.getTime() + nextStep.delayDays * 24 * 60 * 60 * 1000);
        await prisma.lineStepQueue.update({
          where: { id: queue.id },
          data: { currentStep: queue.currentStep + 1, nextSendAt },
        });
      } else {
        await prisma.lineStepQueue.update({
          where: { id: queue.id },
          data: { status: "COMPLETED", completedAt: now },
        });
      }
    } catch {
      // エラーは次回リトライのため状態は変えない
    }
  }

  return NextResponse.json({ ok: true, sent, processed: pendingQueues.length });
}
