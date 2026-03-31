import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyLineSignature, replyLineMessage } from "@/lib/line";

// POST /api/line/webhook — LINE Messaging API Webhook
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-line-signature") ?? "";

  // 署名検証
  const isValid = await verifyLineSignature(rawBody, signature);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: { events: LineEvent[] };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // イベントを並列処理（失敗しても 200 を返す）
  await Promise.allSettled(body.events.map(handleEvent));

  return NextResponse.json({ ok: true });
}

type LineEvent = {
  type: string;
  replyToken?: string;
  source?: { userId?: string };
  message?: { type?: string; text?: string };
};

async function handleEvent(event: LineEvent) {
  const replyToken = event.replyToken ?? "";
  const lineUserId = event.source?.userId ?? "";

  if (event.type === "follow") {
    // フォロー時: 連携案内メッセージを送信
    await replyLineMessage(
      replyToken,
      "てらログをご利用の方は、アプリの「マイページ > LINE連携」から表示される6桁のコードをこのトークに送信してください。\n\nLINEとアカウントが連携され、法要・イベントのご案内が届くようになります。"
    );
    return;
  }

  if (event.type === "message" && event.message?.type === "text") {
    const text = event.message.text?.trim() ?? "";

    // 6桁数字コードかどうかチェック
    if (/^\d{6}$/.test(text)) {
      const now = new Date();
      const member = await prisma.member.findFirst({
        where: {
          lineCode: text,
          lineCodeExpiresAt: { gte: now },
        },
      });

      if (!member) {
        await replyLineMessage(
          replyToken,
          "コードが正しくないか、有効期限が切れています。\nアプリの「マイページ > LINE連携」から新しいコードを発行してください。"
        );
        return;
      }

      // LINE連携
      await prisma.member.update({
        where: { id: member.id },
        data: {
          lineUserId,
          lineNotifyEnabled: true,
          lineCode: null,
          lineCodeExpiresAt: null,
        },
      });

      await replyLineMessage(
        replyToken,
        "LINE連携が完了しました！\nこれからてらログからのお知らせをLINEでお受け取りいただけます。"
      );
      return;
    }

    // その他のメッセージには案内を返す
    await replyLineMessage(
      replyToken,
      "アカウントを連携するには、アプリの「マイページ > LINE連携」から6桁のコードを発行し、こちらに送信してください。"
    );
  }
}
