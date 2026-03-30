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

トライアル期間は30日間です。
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

// ── 予約リマインダーメール（前日） ──────────────────────────────────────────
export async function sendReservationReminderEmail({
  to,
  memberName,
  reservationType,
  scheduledAt,
  templeName,
}: {
  to: string;
  memberName: string;
  reservationType: string;
  scheduledAt: Date;
  templeName: string;
}) {
  const resend = getResend();
  const dateStr = scheduledAt.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  const timeStr = scheduledAt.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
  });
  await resend.emails.send({
    from: `てらログ <${FROM}>`,
    to,
    subject: `【てらログ】明日の${reservationType}のご案内`,
    text: `
${memberName} 様

明日、${templeName}にて${reservationType}が予定されています。

▼ 予約内容
日時：${dateStr} ${timeStr}〜
種別：${reservationType}

ご都合が変わった場合は、お早めにご連絡ください。

${templeName}
`.trim(),
  });
}

// ── 護持会費支払い催促メール ──────────────────────────────────────────────
export async function sendGojikaiReminderEmail({
  to,
  memberName,
  templeName,
  fiscalYear,
  amount,
}: {
  to: string;
  memberName: string;
  templeName: string;
  fiscalYear: number;
  amount: number;
}) {
  const resend = getResend();
  await resend.emails.send({
    from: `てらログ <${FROM}>`,
    to,
    subject: `【${templeName}】${fiscalYear}年度 護持会費のご案内`,
    text: `
${memberName} 様

${fiscalYear}年度の護持会費をご案内申し上げます。

▼ お支払い金額
¥${amount.toLocaleString()}

お手続きにつきましては、${templeName}までお問い合わせください。

${templeName}
`.trim(),
  });
}

// ── 年忌リマインダーメール（N日前） ──────────────────────────────────────────
export async function sendNenkiReminderEmail({
  to,
  memberName,
  deceasedName,
  nenkiName,
  nenkiDate,
  templeName,
  daysUntil,
}: {
  to: string;
  memberName: string;
  deceasedName: string;
  nenkiName: string;
  nenkiDate: Date;
  templeName: string;
  daysUntil: number;
}) {
  const resend = getResend();
  const dateStr = nenkiDate.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
  await resend.emails.send({
    from: `てらログ <${FROM}>`,
    to,
    subject: `【${templeName}】${deceasedName} 様の${nenkiName}が近づいています`,
    text: `
${memberName} 様

${deceasedName} 様の${nenkiName}が${daysUntil === 0 ? "本日" : `${daysUntil}日後（${dateStr}）`}に迎えます。

法要のご予約がまだの場合は、${templeName}までお早めにご連絡ください。

▼ 法要のご予約
${process.env.NEXT_PUBLIC_SITE_URL ?? "https://teralog.app"}/app/reservations

${templeName}
`.trim(),
  });
}

export async function sendTrialExpiryEmail({
  to,
  templeName,
  daysRemaining,
  trialEndsAt,
}: {
  to: string;
  templeName: string;
  daysRemaining: number;
  trialEndsAt: Date;
}) {
  const resend = getResend();
  const dateStr = trialEndsAt.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const isExpired = daysRemaining === 0;
  const subject = isExpired
    ? `【てらログ】トライアル期間が終了しました`
    : `【てらログ】トライアル期間終了まで残り${daysRemaining}日です`;

  const body = isExpired
    ? `
${templeName} ご担当者様

てらログをご利用いただきありがとうございます。
本日をもってトライアル期間が終了しました。

引き続きてらログをご利用いただくには、スタンダードプランのご契約をお願いします。

▼ プラン契約はこちら
${process.env.NEXT_PUBLIC_SITE_URL ?? "https://teralog.app"}/admin/billing

ご不明な点はお気軽にご連絡ください。
support@teralog.app

てらログ サポートチーム
`
    : `
${templeName} ご担当者様

てらログをご利用いただきありがとうございます。
トライアル期間終了まで残り${daysRemaining}日となりました（終了日：${dateStr}）。

引き続きご利用いただくには、スタンダードプランのご契約をお願いします。

▼ プラン契約はこちら
${process.env.NEXT_PUBLIC_SITE_URL ?? "https://teralog.app"}/admin/billing

スタンダードプラン：¥9,800/月（税込）
・檀家管理（500件まで）
・イベント・法要管理
・お知らせ・通知機能
・メールサポート

ご不明な点はお気軽にご連絡ください。
support@teralog.app

てらログ サポートチーム
`;

  await resend.emails.send({
    from: `てらログ <${FROM}>`,
    to,
    subject,
    text: body.trim(),
  });
}
