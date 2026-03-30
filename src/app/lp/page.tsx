import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "てらログ｜年忌を自動計算、法要予約がアプリで入る",
  description:
    "年忌を自動計算してLINE通知。檀家からそのままアプリで法要予約が入る。お寺のデジタル化を、かんたんに。30日間無料トライアル。",
  openGraph: {
    title: "てらログ｜年忌を自動計算、法要予約がアプリで入る",
    description:
      "年忌を自動計算してLINE通知。檀家からそのままアプリで法要予約が入る。30日間無料トライアル。",
    type: "website",
  },
};

const FLOW_STEPS = [
  {
    step: "01",
    icon: "📋",
    title: "過去帳をアプリに登録",
    desc: "故人の命日を入力するだけ。三回忌・七回忌・十三回忌…すべて自動計算されます。",
  },
  {
    step: "02",
    icon: "📱",
    title: "年忌が来たらLINEで自動通知",
    desc: "法要の数ヶ月前に「今年は七回忌の年です」と檀家へLINEが届きます。住職の連絡作業はゼロ。",
  },
  {
    step: "03",
    icon: "✅",
    title: "檀家がアプリで法要を予約",
    desc: "通知からそのまま希望日時を選んで予約。管理画面にリアルタイムで反映されます。",
  },
  {
    step: "04",
    icon: "🔔",
    title: "前日に自動リマインド",
    desc: "檀家・住職の両方に前日リマインドを自動送信。すっぽかし・連絡漏れがなくなります。",
  },
];

const PROBLEMS = [
  "年忌の計算を毎年Excelや手計算でやっている",
  "法要の連絡を忘れて檀家から指摘されたことがある",
  "電話・FAXで予約を受けて手帳に書き写している",
  "檀家名簿が古いまま更新できていない",
  "イベントの参加者管理に紙やLINEを使っている",
];

const FEATURES = [
  {
    icon: "🗓",
    title: "年忌自動計算",
    desc: "命日を登録すれば三回忌から五十回忌まで全自動。今年・来年の年忌一覧をいつでも確認できます。",
  },
  {
    icon: "🔔",
    title: "LINE・プッシュ通知",
    desc: "年忌・月命日・イベントの前日リマインドを自動送信。住職の連絡作業を大幅に削減。",
  },
  {
    icon: "📅",
    title: "法要予約管理",
    desc: "オンライン予約受付から確定・リマインドまで一貫して管理。電話メモ不要。",
  },
  {
    icon: "👥",
    title: "檀家・ご縁さん管理",
    desc: "檀家・ご縁さんの情報・過去帳・家系図・お布施履歴をひとつに集約。",
  },
];

const PLAN = [
  { label: "トライアル期間", value: "30日間 無料" },
  { label: "月額料金", value: "¥9,800 / 月（税込）" },
  { label: "檀家管理", value: "500件まで" },
  { label: "サポート", value: "メールサポート" },
  { label: "解約", value: "いつでも可能" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">
      {/* ナビゲーション */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-stone-100">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏛</span>
            <span className="font-bold text-stone-800">てらログ</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-stone-500 hover:text-stone-700">
              ログイン
            </Link>
            <Link
              href="/setup"
              className="text-sm bg-amber-700 hover:bg-amber-800 text-white px-4 py-1.5 rounded-lg transition-colors"
            >
              無料で始める
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-amber-50 to-stone-50 pt-16 pb-20 px-5 text-center">
        <div className="max-w-2xl mx-auto">
          <p className="inline-block text-xs font-semibold text-amber-700 bg-amber-100 px-3 py-1 rounded-full mb-5">
            30日間 完全無料・クレジットカード不要
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-stone-800 leading-snug mb-4">
            年忌を自動計算して
            <br />
            檀家にLINE通知。
            <br className="sm:hidden" />
            <span className="text-amber-700">法要予約がアプリで入る。</span>
          </h1>
          <p className="text-stone-500 text-base sm:text-lg mb-8 leading-relaxed">
            命日を登録するだけで、三回忌から五十回忌まですべて自動管理。
            <br className="hidden sm:block" />
            年忌の案内・法要予約・前日リマインドを、住職の手間ゼロで実現します。
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/setup"
              className="bg-amber-700 hover:bg-amber-800 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors text-base"
            >
              30日間 無料で試してみる
            </Link>
            <Link
              href="/"
              className="bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 font-medium px-8 py-3.5 rounded-xl transition-colors text-base"
            >
              ログインはこちら
            </Link>
          </div>
          <p className="text-xs text-stone-400 mt-4">設定は最短5分。難しい操作は一切ありません。</p>
        </div>
      </section>

      {/* 課題提起 */}
      <section className="py-16 px-5">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-center text-stone-800 mb-8">
            こんなお悩みはありませんか？
          </h2>
          <div className="bg-white border border-stone-200 rounded-2xl divide-y divide-stone-100">
            {PROBLEMS.map((p) => (
              <div key={p} className="flex items-start gap-3 px-5 py-4">
                <span className="text-red-400 mt-0.5 shrink-0">✗</span>
                <p className="text-sm text-stone-600">{p}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-center">
            <p className="text-sm font-medium text-amber-800">
              てらログを使えば、これらをすべて解決できます。
            </p>
          </div>
        </div>
      </section>

      {/* 使い方フロー */}
      <section className="py-16 px-5 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-center text-stone-800 mb-3">
            年忌〜法要予約まで、すべて自動
          </h2>
          <p className="text-center text-sm text-stone-400 mb-10">
            住職がやることは「命日を登録する」だけです
          </p>
          <div className="grid sm:grid-cols-2 gap-5">
            {FLOW_STEPS.map((s) => (
              <div
                key={s.step}
                className="bg-stone-50 border border-stone-100 rounded-2xl p-5 flex gap-4"
              >
                <div className="shrink-0 w-8 h-8 rounded-full bg-amber-700 text-white text-xs font-bold flex items-center justify-center">
                  {s.step}
                </div>
                <div>
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <p className="font-semibold text-stone-800 mb-1">{s.title}</p>
                  <p className="text-sm text-stone-500 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 機能紹介 */}
      <section className="py-16 px-5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-center text-stone-800 mb-10">主な機能</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-white border border-stone-200 rounded-2xl p-5 space-y-2"
              >
                <div className="text-3xl">{f.icon}</div>
                <p className="font-semibold text-stone-800">{f.title}</p>
                <p className="text-sm text-stone-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* 追加機能リスト */}
          <div className="mt-8 bg-white border border-stone-200 rounded-2xl px-5 py-5">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">その他の機能</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                "坐禅・写経イベント管理",
                "お布施・護持会費管理",
                "エンゲージメントスコア",
                "年中行事カレンダー",
                "スタッフ権限管理",
                "CSVエクスポート",
                "データ分析・レポート",
                "Stripe決済連携",
              ].map((item) => (
                <div key={item} className="flex items-center gap-1.5 text-sm text-stone-600">
                  <span className="text-green-500 text-xs">✓</span>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 料金プラン */}
      <section className="py-16 px-5 bg-white">
        <div className="max-w-sm mx-auto">
          <h2 className="text-xl font-bold text-center text-stone-800 mb-8">料金プラン</h2>
          <div className="bg-white border-2 border-amber-300 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-amber-700 px-5 py-4 text-center">
              <p className="text-white font-bold text-lg">スタンダードプラン</p>
              <p className="text-amber-200 text-xs mt-0.5">まず30日間 無料でお試しいただけます</p>
            </div>
            <div className="px-5 py-5 space-y-0 divide-y divide-stone-100">
              {PLAN.map(({ label, value }) => (
                <div key={label} className="flex justify-between py-3 text-sm">
                  <span className="text-stone-500">{label}</span>
                  <span className="font-semibold text-stone-800">{value}</span>
                </div>
              ))}
            </div>
            <div className="px-5 pb-5">
              <Link
                href="/setup"
                className="block w-full text-center bg-amber-700 hover:bg-amber-800 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                無料トライアルを始める
              </Link>
            </div>
          </div>
          <p className="text-xs text-stone-400 text-center mt-4">
            トライアル期間中は課金されません。
            <br />
            クレジットカードの登録も不要です。
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-5 bg-amber-700 text-center">
        <div className="max-w-lg mx-auto space-y-4">
          <h2 className="text-2xl font-bold text-white">
            年忌の管理、もうExcelには戻れません
          </h2>
          <p className="text-amber-200 text-sm leading-relaxed">
            設定は最短5分。命日を登録した瞬間から、年忌計算・LINE通知・法要予約がすべて動き始めます。
          </p>
          <Link
            href="/setup"
            className="inline-block bg-white hover:bg-stone-50 text-amber-800 font-bold px-10 py-3.5 rounded-xl transition-colors"
          >
            30日間 無料で試してみる
          </Link>
          <p className="text-amber-300 text-xs">
            ご不明な点は{" "}
            <a href="mailto:support@teralog.app" className="underline hover:text-white">
              support@teralog.app
            </a>{" "}
            までお気軽に
          </p>
        </div>
      </section>

      {/* フッター */}
      <footer className="bg-stone-800 text-stone-400 text-xs py-8 px-5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <p className="font-bold text-white mb-1">てらログ</p>
            <p>お寺のデジタル管理システム</p>
          </div>
          <div className="flex gap-5">
            <Link href="/terms" className="hover:text-white">利用規約</Link>
            <Link href="/privacy" className="hover:text-white">プライバシーポリシー</Link>
            <Link href="/tokushoho" className="hover:text-white">特定商取引法</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
