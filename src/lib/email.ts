import { Resend } from "resend";

let _resend: Resend | null = null;

export function getResend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set");
    }
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export const FROM_EMAIL = process.env.FROM_EMAIL ?? "noreply@teralog.app";

const FROM = FROM_EMAIL;

// ── ウェルカムメール（新規ADMIN作成時） ────────────────────────────────────
export async function sendWelcomeEmail({
  to,
  adminName,
  templeName,
  loginUrl,
}: {
  to: string;
  adminName: string;
  templeName: string;
  loginUrl: string;
}) {
  const resend = getResend();
  await resend.emails.send({
    from: `てらログ <${FROM}>`,
    to,
    subject: `【てらログ】${templeName}のアカウントが作成されました`,
    text: `
${adminName} 様

てらログへようこそ！

${templeName}の管理者アカウントが作成されました。
以下のURLからログインしてご利用ください。

▼ ログインURL
${loginUrl}

ご不明な点はサポートまでご連絡ください。
support@teralog.app

てらログ サポートチーム
`.trim(),
  });
}

// ── イベント参加確定メール ─────────────────────────────────────────────────
export async function sendEventConfirmationEmail({
  to,
  memberName,
  eventTitle,
  eventDate,
  startTime,
  location,
}: {
  to: string;
  memberName: string;
  eventTitle: string;
  eventDate: Date;
  startTime: string;
  location?: string | null;
}) {
  const resend = getResend();
  const dateStr = eventDate.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  await resend.emails.send({
    from: `てらログ <${FROM}>`,
    to,
    subject: `【てらログ】「${eventTitle}」のご参加が確定しました`,
    text: `
${memberName} 様

「${eventTitle}」へのご参加が確定しました。

▼ イベント詳細
日時：${dateStr} ${startTime}〜
${location ? `場所：${location}\n` : ""}
当日は時間に余裕をもってお越しください。
ご不明な点はお気軽にお問い合わせください。

てらログ
`.trim(),
  });
}

// ── キャンセル待ち繰り上げメール ─────────────────────────────────────────────
export async function sendWaitlistPromotedEmail({
  to,
  memberName,
  eventTitle,
  eventDate,
  startTime,
  location,
}: {
  to: string;
  memberName: string;
  eventTitle: string;
  eventDate: Date;
  startTime: string;
  location?: string | null;
}) {
  const resend = getResend();
  const dateStr = eventDate.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  await resend.emails.send({
    from: `てらログ <${FROM}>`,
    to,
    subject: `【てらログ】「${eventTitle}」キャンセル待ちから参加確定のお知らせ`,
    text: `
${memberName} 様

キャンセル待ちをされていた「${eventTitle}」に空きが出ました。
参加が確定しましたのでお知らせします。

▼ イベント詳細
日時：${dateStr} ${startTime}〜
${location ? `場所：${location}\n` : ""}
当日は時間に余裕をもってお越しください。
ご都合が悪い場合はお早めにキャンセルのお手続きをお願いします。

てらログ
`.trim(),
  });
}
