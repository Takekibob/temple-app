import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyLineSignature, replyLineMessage, pushLineMessage } from "@/lib/line";

// LINE Webhook の生の body が必要なので config でパーサーを無効にする
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-line-signature") ?? "";

  // 署名検証
  const valid = await verifyLineSignature(rawBody, signature);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: { events: LineEvent[] };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }

  for (const event of body.events ?? []) {
    try {
      if (event.type === "follow") {
        await handleFollow(event);
      } else if (event.type === "message" && event.message?.type === "text") {
        await handleMessage(event);
      }
    } catch (err) {
      console.error("LINE webhook event error:", err);
    }
  }

  return NextResponse.json({ ok: true });
}

async function handleFollow(event: LineEvent) {
  const lineUserId = event.source?.userId;
  if (!lineUserId || !event.replyToken) return;

  await replyLineMessage(
    event.replyToken,
    "てらログの友だち追加ありがとうございます！\n\nLINE通知を受け取るには、マイページで表示された6桁の連携コードをこのチャットに入力してください。"
  );
}

async function handleMessage(event: LineEvent) {
  const lineUserId = event.source?.userId;
  const text = event.message?.text?.trim() ?? "";
  if (!lineUserId) return;

  // 6桁数字のコードかチェック
  if (!/^\d{6}$/.test(text)) return;

  const now = new Date();
  const member = await prisma.member.findFirst({
    where: {
      lineCode: text,
      lineCodeExpiresAt: { gt: now },
    },
  });

  if (!member) {
    await pushLineMessage(
      lineUserId,
      "連携コードが正しくないか、有効期限が切れています。\nマイページで新しいコードを発行してください。"
    );
    return;
  }

  // 連携完了
  await prisma.member.update({
    where: { id: member.id },
    data: {
      lineUserId,
      lineNotifyEnabled: true,
      lineCode: null,
      lineCodeExpiresAt: null,
    },
  });

  await pushLineMessage(lineUserId, "連携が完了しました！\nこれからLINEでイベントのお知らせをお送りします。");
}

// ─── 型定義 ─────────────────────────────────────────
interface LineEvent {
  type: string;
  replyToken?: string;
  source?: { userId?: string };
  message?: { type: string; text?: string };
}
