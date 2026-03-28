import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記 | てらログ",
};

export default function TokushohoPage() {
  const items = [
    { label: "販売業者", value: "[会社名]" },
    { label: "代表者", value: "[代表者名]" },
    { label: "所在地", value: "[住所]" },
    { label: "電話番号", value: "[電話番号]（お問い合わせはメールにてお願いします）" },
    { label: "メールアドレス", value: "support@teralog.app" },
    { label: "サービス名", value: "てらログ" },
    {
      label: "販売価格",
      value: "各プランページに記載の月額料金（税込）",
    },
    {
      label: "支払方法",
      value: "クレジットカード（Visa・Mastercard・American Express・JCB）",
    },
    {
      label: "支払時期",
      value: "月次自動課金。毎月契約日に翌月分を請求します。",
    },
    {
      label: "サービス提供時期",
      value: "お申し込み・決済完了後、即時ご利用いただけます。",
    },
    {
      label: "トライアル期間",
      value: "新規登録から30日間、無料でご利用いただけます。トライアル期間中の解約は課金されません。",
    },
    {
      label: "返品・返金",
      value:
        "サービスの性質上、月途中での解約による日割り返金は行っておりません。ただし、トライアル期間中の解約は課金が発生しません。",
    },
    {
      label: "解約方法",
      value: "管理画面の「プラン・お支払い」ページよりいつでも解約できます。解約は当月末をもって有効となります。",
    },
    {
      label: "動作環境",
      value: "最新版のGoogle Chrome・Safari・Firefox・Microsoft Edge（インターネット接続環境が必要）",
    },
  ];

  return (
    <article>
      <h1 className="text-2xl font-bold text-stone-800 mb-1">
        特定商取引法に基づく表記
      </h1>
      <p className="text-xs text-stone-400 mb-8">
        特定商取引法第11条に基づき、以下の事項を表示します。
      </p>

      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        {items.map(({ label, value }, i) => (
          <div
            key={label}
            className={`flex flex-col sm:flex-row gap-1 sm:gap-0 px-5 py-4 text-sm ${
              i < items.length - 1 ? "border-b border-stone-100" : ""
            }`}
          >
            <dt className="sm:w-40 shrink-0 font-medium text-stone-700">{label}</dt>
            <dd className="text-stone-600 leading-relaxed">{value}</dd>
          </div>
        ))}
      </div>
    </article>
  );
}
