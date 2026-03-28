import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "プライバシーポリシー | てらログ",
};

const LAST_UPDATED = "2026年4月1日";
const COMPANY_NAME = "[会社名]";
const CONTACT_EMAIL = "support@teralog.app";

export default function PrivacyPage() {
  return (
    <article className="prose prose-stone max-w-none">
      <h1 className="text-2xl font-bold text-stone-800 mb-1">プライバシーポリシー</h1>
      <p className="text-xs text-stone-400 mb-8">最終更新日：{LAST_UPDATED}</p>

      <Section title="1. 事業者情報">
        <p>
          {COMPANY_NAME}（以下「当社」）は、てらログ（以下「本サービス」）をご利用いただくにあたり、
          お客様の個人情報を適切に取り扱うことを重要な責務と考えております。
          本プライバシーポリシーは、当社が収集する個人情報の種類・利用目的・管理方法について説明するものです。
        </p>
      </Section>

      <Section title="2. 取得する個人情報">
        <p>当社は、本サービスの提供にあたり、以下の情報を取得する場合があります。</p>
        <ul>
          <li>氏名・家名（屋号）</li>
          <li>住所・郵便番号</li>
          <li>電話番号・メールアドレス</li>
          <li>故人情報（戒名・俗名・命日・享年・続柄など）</li>
          <li>イベント参加履歴・法要予約情報</li>
          <li>お布施・護持会費などの支払い記録（金額・日時・方法）</li>
          <li>ログイン情報（メールアドレス・認証プロバイダー）</li>
          <li>ブラウザ・デバイス情報（アクセスログ・Cookieなど）</li>
        </ul>
        <p>
          決済情報（クレジットカード番号等）は、決済代行会社であるStripe, Inc.が管理し、
          当社のサーバーには保存されません。
        </p>
      </Section>

      <Section title="3. 利用目的">
        <p>取得した個人情報は、以下の目的で利用します。</p>
        <ul>
          <li>本サービスの提供・運営・改善</li>
          <li>会員管理・法要予約・お布施管理などの寺院業務支援</li>
          <li>メール・プッシュ通知・LINE等によるご連絡・リマインダー送信</li>
          <li>サービスに関するお問い合わせへの対応</li>
          <li>不正利用の防止・セキュリティの確保</li>
          <li>利用状況の統計分析（個人を特定しない形式）</li>
        </ul>
      </Section>

      <Section title="4. 第三者への提供">
        <p>
          当社は、以下の場合を除き、お客様の個人情報を第三者に提供しません。
        </p>
        <ul>
          <li>お客様ご本人の同意がある場合</li>
          <li>法令に基づく場合</li>
          <li>人の生命・身体・財産の保護のために必要な場合</li>
        </ul>
      </Section>

      <Section title="5. 業務委託先">
        <p>当社は、サービス提供のため以下の事業者に個人情報の取り扱いを委託しています。各社のプライバシーポリシーに従い適切に管理されています。</p>
        <ul>
          <li><strong>Supabase, Inc.</strong>（データベース・認証基盤）</li>
          <li><strong>Vercel, Inc.</strong>（サーバー・ホスティング）</li>
          <li><strong>Stripe, Inc.</strong>（決済処理）</li>
          <li><strong>LINE株式会社</strong>（LINE連携機能）</li>
        </ul>
      </Section>

      <Section title="6. 保存期間">
        <p>
          個人情報は、利用目的の達成に必要な期間、または法令で定める期間にわたり保存します。
          お客様からの削除依頼があった場合、法令上の義務がある場合を除き、速やかに削除します。
          なお、サービス退会後も、会計処理等のために一定期間（最大7年間）保存する場合があります。
        </p>
      </Section>

      <Section title="7. 開示・訂正・削除の請求">
        <p>
          お客様は、当社が保有するご自身の個人情報について、開示・訂正・利用停止・削除を請求することができます。
          請求は下記のお問い合わせ窓口までメールにてご連絡ください。本人確認を行ったうえで、
          合理的な期間内に対応いたします。
        </p>
      </Section>

      <Section title="8. Cookieおよびアクセス解析">
        <p>
          本サービスでは、セッション管理・ユーザー認証のためにCookieを使用しています。
          ブラウザの設定によりCookieを無効にすることができますが、その場合、
          本サービスの一部機能がご利用いただけない場合があります。
        </p>
      </Section>

      <Section title="9. プライバシーポリシーの改定">
        <p>
          当社は、法令の改正やサービス内容の変更に応じて、本ポリシーを改定することがあります。
          重要な変更が生じた場合は、本サービス上でお知らせします。
          改定後のポリシーは、掲示した時点から効力を生じるものとします。
        </p>
      </Section>

      <Section title="10. お問い合わせ窓口">
        <p>
          個人情報の取り扱いに関するお問い合わせは、下記までご連絡ください。
        </p>
        <p>
          {COMPANY_NAME}<br />
          メールアドレス：<a href={`mailto:${CONTACT_EMAIL}`} className="text-amber-700 hover:underline">{CONTACT_EMAIL}</a>
        </p>
      </Section>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-base font-semibold text-stone-800 mb-3 pb-2 border-b border-stone-200">
        {title}
      </h2>
      <div className="text-sm text-stone-600 space-y-2 leading-relaxed">
        {children}
      </div>
    </section>
  );
}
