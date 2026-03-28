import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set");
    }
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const FROM = process.env.FROM_EMAIL ?? "noreply@teralog.app";

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
