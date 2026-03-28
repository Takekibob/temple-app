import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "利用規約 | てらログ",
};

const LAST_UPDATED = "2026年4月1日";
const SERVICE_NAME = "てらログ";
const COMPANY_NAME = "[会社名]";
const CONTACT_EMAIL = "support@teralog.app";

export default function TermsPage() {
  return (
    <article className="prose prose-stone max-w-none">
      <h1 className="text-2xl font-bold text-stone-800 mb-1">利用規約</h1>
      <p className="text-xs text-stone-400 mb-8">最終更新日：{LAST_UPDATED}</p>

      <p className="text-sm text-stone-600 mb-8">
        本利用規約（以下「本規約」）は、{COMPANY_NAME}（以下「当社」）が提供する{SERVICE_NAME}（以下「本サービス」）の
        利用条件を定めるものです。本サービスをご利用いただくことで、本規約に同意したものとみなします。
      </p>

      <Section title="第1条（定義）">
        <ul>
          <li>「本サービス」とは、当社が提供するお寺向けデジタル管理システム「{SERVICE_NAME}」をいいます。</li>
          <li>「寺院アカウント」とは、本サービスを契約・利用するお寺のアカウントをいいます。</li>
          <li>「管理者」とは、寺院アカウントの管理権限を持つユーザーをいいます。</li>
          <li>「会員」とは、寺院アカウントに登録された檀家・ご縁さん等のユーザーをいいます。</li>
        </ul>
      </Section>

      <Section title="第2条（利用登録）">
        <ul>
          <li>本サービスの利用は、当社所定のセットアップ手続きを完了した寺院アカウントに限ります。</li>
          <li>登録情報に虚偽の内容があった場合、当社は登録を取り消すことができます。</li>
          <li>アカウントの管理は利用者の責任において行うものとし、第三者への譲渡・貸与は禁止します。</li>
        </ul>
      </Section>

      <Section title="第3条（料金・支払い）">
        <ul>
          <li>本サービスは、登録日から30日間無料でご利用いただけるトライアル期間を設けています。</li>
          <li>トライアル期間終了後にサービスを継続する場合は、所定のプランをご契約ください。</li>
          <li>料金は当社が別途定める料金表に従い、毎月自動で課金されます。</li>
          <li>支払いはクレジットカードによる月次自動引落としとなります。</li>
          <li>料金は予告なく変更する場合があります。変更は1ヶ月前までにメール等でお知らせします。</li>
        </ul>
      </Section>

      <Section title="第4条（禁止事項）">
        <p>以下の行為を禁止します。</p>
        <ul>
          <li>法令または公序良俗に反する行為</li>
          <li>当社・第三者の知的財産権・プライバシーを侵害する行為</li>
          <li>本サービスのリバースエンジニアリング・改ざん・不正アクセス</li>
          <li>スパム・フィッシング・迷惑メールの送信</li>
          <li>本サービスの運営を妨害する行為</li>
          <li>他の利用者への不当な差別・誹謗中傷</li>
        </ul>
      </Section>

      <Section title="第5条（知的財産権）">
        <p>
          本サービスに関するソフトウェア・デザイン・コンテンツの著作権その他知的財産権は、
          当社または正当な権利者に帰属します。
          利用者が本サービスに登録したデータの権利は利用者に帰属し、
          当社はサービス提供の目的においてのみ使用します。
        </p>
      </Section>

      <Section title="第6条（免責事項）">
        <ul>
          <li>当社は、本サービスの中断・停止・データ損失について、故意・重過失による場合を除き責任を負いません。</li>
          <li>本サービスを通じた利用者間・第三者との紛争について、当社は責任を負いません。</li>
          <li>当社の損害賠償責任は、直近3ヶ月の月額料金の合計額を上限とします。</li>
        </ul>
      </Section>

      <Section title="第7条（サービスの変更・停止・終了）">
        <p>
          当社は、利用者への事前通知をもって本サービスの内容変更・停止・終了を行うことができます。
          やむを得ない事情がある場合は事前通知なく停止することがあります。
        </p>
      </Section>

      <Section title="第8条（解約）">
        <ul>
          <li>利用者はいつでも本サービスを解約できます。解約は当月末をもって有効となります。</li>
          <li>解約後のデータは30日間保持され、その後削除されます。必要なデータは事前にエクスポートしてください。</li>
          <li>サービスの性質上、原則として返金は行いません。ただし、トライアル期間中の解約は課金されません。</li>
        </ul>
      </Section>

      <Section title="第9条（準拠法・管轄裁判所）">
        <p>
          本規約は日本法に準拠し、本サービスに関する紛争については東京地方裁判所を第一審の専属的合意管轄裁判所とします。
        </p>
      </Section>

      <Section title="第10条（規約の改定）">
        <p>
          当社は本規約を随時改定できるものとします。
          重要な変更は本サービス上またはメールにてお知らせします。
          改定後も本サービスをご利用いただいた場合、改定後の規約に同意したものとみなします。
        </p>
      </Section>

      <div className="mt-10 pt-6 border-t border-stone-200 text-sm text-stone-500">
        <p>{COMPANY_NAME}</p>
        <p>お問い合わせ：<a href={`mailto:${CONTACT_EMAIL}`} className="text-amber-700 hover:underline">{CONTACT_EMAIL}</a></p>
      </div>
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
