import { messagingApi } from "@line/bot-sdk";
import { prisma } from "@/lib/prisma";

let _client: messagingApi.MessagingApiClient | null = null;

function getLineClient(): messagingApi.MessagingApiClient {
  if (_client) return _client;
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) throw new Error("LINE_CHANNEL_ACCESS_TOKEN is not set");
  _client = new messagingApi.MessagingApiClient({ channelAccessToken: token });
  return _client;
}

/**
 * 指定した memberId の LINE ユーザーにメッセージを送信する。
 * line_user_id が未設定 or line_notify_enabled = false の場合は何もしない。
 */
export async function sendLineNotification(
  memberId: string,
  message: string
): Promise<boolean> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { lineUserId: true, lineNotifyEnabled: true },
  });

  if (!member?.lineUserId || !member.lineNotifyEnabled) return false;

  try {
    const client = getLineClient();
    await client.pushMessage({
      to: member.lineUserId,
      messages: [{ type: "text", text: message }],
    });
    return true;
  } catch (err) {
    console.error("LINE push failed:", err);
    return false;
  }
}

/**
 * LINE ユーザーID が分かっている場合に直接送信する（Webhook内での返信用）。
 */
export async function pushLineMessage(
  lineUserId: string,
  text: string
): Promise<void> {
  const client = getLineClient();
  await client.pushMessage({
    to: lineUserId,
    messages: [{ type: "text", text }],
  });
}

/**
 * replyToken を使って返信する（follow イベント直後など）。
 */
export async function replyLineMessage(
  replyToken: string,
  text: string
): Promise<void> {
  const client = getLineClient();
  await client.replyMessage({
    replyToken,
    messages: [{ type: "text", text }],
  });
}

/** HMAC-SHA256 で LINE Webhook の署名を検証する */
export async function verifyLineSignature(
  body: string,
  signature: string
): Promise<boolean> {
  const secret = process.env.LINE_CHANNEL_SECRET;
  if (!secret) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const expected = Buffer.from(sig).toString("base64");
  return expected === signature;
}
