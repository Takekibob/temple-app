import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireAdminOrStaff } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const authUser = await requireAdminOrStaff();
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(50, Number(searchParams.get("limit") ?? 20));

  const [messages, total] = await Promise.all([
    prisma.lineMessage.findMany({
      where: { templeId: authUser.templeId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.lineMessage.count({ where: { templeId: authUser.templeId } }),
  ]);

  return NextResponse.json({ messages, total });
}

export async function POST(request: NextRequest) {
  const authUser = await requireAdmin();
  const body = await request.json();
  const { messageType, targetType, targetMemberIds, content, scheduledAt } = body;

  if (!messageType || !content) {
    return NextResponse.json({ error: "messageType and content are required" }, { status: 400 });
  }

  // 対象メンバーのlineUserIdを取得
  let memberIds: string[] = targetMemberIds ?? [];
  if (messageType === "SEGMENT" && targetType) {
    const members = await prisma.member.findMany({
      where: { templeId: authUser.templeId, type: targetType, lineUserId: { not: null } },
      select: { id: true },
    });
    memberIds = members.map((m) => m.id);
  }

  const lineMessage = await prisma.lineMessage.create({
    data: {
      templeId: authUser.templeId,
      messageType,
      targetMemberIds: memberIds,
      content,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      status: scheduledAt ? "SCHEDULED" : "DRAFT",
      createdBy: authUser.id,
    },
  });

  // 即時送信（scheduledAt未指定かつBROADCAST/SEGMENT/INDIVIDUAL）
  if (!scheduledAt && ["BROADCAST", "SEGMENT", "INDIVIDUAL"].includes(messageType)) {
    await sendLineMessageNow(lineMessage.id, authUser.templeId, messageType, memberIds, content);
  }

  return NextResponse.json(lineMessage, { status: 201 });
}

async function sendLineMessageNow(
  messageId: string,
  templeId: string,
  messageType: string,
  memberIds: string[],
  content: unknown
) {
  const channelToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!channelToken) return;

  let sentCount = 0;

  if (messageType === "BROADCAST") {
    // 全フォロワーへ一斉配信
    const res = await fetch("https://api.line.me/v2/bot/message/broadcast", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${channelToken}`,
      },
      body: JSON.stringify({ messages: Array.isArray(content) ? content : [content] }),
    });
    if (res.ok) sentCount = 1;
  } else {
    // 個別送信
    const members = await prisma.member.findMany({
      where: { id: { in: memberIds }, templeId, lineUserId: { not: null } },
      select: { id: true, lineUserId: true },
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
          messages: Array.isArray(content) ? content : [content],
        }),
      });
      if (res.ok) sentCount++;
    }
  }

  await prisma.lineMessage.update({
    where: { id: messageId },
    data: { status: "SENT", sentAt: new Date(), sentCount },
  });
}
