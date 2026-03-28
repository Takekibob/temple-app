import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "てらログ｜お寺のデジタル管理システム",
  description:
    "檀家管理・法要予約・イベント管理・お布施記録をひとつに。お寺のデジタル化を、かんたんに。30日間無料トライアル。",
  openGraph: {
    title: "てらログ｜お寺のデジタル管理システム",
    description: "檀家管理・法要予約・イベント管理・お布施記録をひとつに。30日間無料トライアル。",
    type: "website",
  },
};

const FEATURES = [
  {
    icon: "👥",
    title: "檀家管理",
    desc: "檀家・ご縁さんの情報を一元管理。過去帳・月命日・住所録をデジタルで。",
  },
  {
    icon: "📅",
    title: "法要・予約管理",
    desc: "法要の予約をオンラインで受付。リマインド通知で連絡漏れをゼロに。",
  },
  {
    icon: "🎋",
    title: "イベント管理",
    desc: "坐禅・写経・ヨガなどのイベントを公開・参加受付・出欠管理まで一括対応。",
  },
  {
    icon: "💴",
    title: "お布施・護持会費",
    desc: "お布施の記録・護持会費の管理・年間レポートをかんたんに作成。",
  },
];

const PROBLEMS = [
  "檀家名簿が古いExcelのまま更新できていない",
  "法要の案内を毎回手書きで郵送している",
  "イベントの参加者を紙やLINEで管理している",
  "お布施の記録がバラバラで年末の集計が大変",
  "新しい檀家さんへの案内を忘れてしまうことがある",
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
          <div className="text-5xl mb-6">🏛</div>
          <h1 className="text-3xl sm:text-4xl font-bold text-stone-800 leading-snug mb-4">
            お寺のデジタル管理を、
            <br className="sm:hidden" />
            もっとかんたんに
          </h1>
          <p className="text-stone-500 text-base sm:text-lg mb-8 leading-relaxed">
            檀家管理・法要予約・イベント・お布施をひとつのシステムで。
            <br />
            住職・スタッフの事務作業を大幅に削減します。
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
          <p className="text-xs text-stone-400 mt-4">クレジットカード不要・30日間完全無料</p>
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

      {/* 機能紹介 */}
      <section className="py-16 px-5 bg-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-bold text-center text-stone-800 mb-10">主な機能</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-stone-50 border border-stone-100 rounded-2xl p-5 space-y-2"
              >
                <div className="text-3xl">{f.icon}</div>
                <p className="font-semibold text-stone-800">{f.title}</p>
                <p className="text-sm text-stone-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* 追加機能リスト */}
          <div className="mt-8 bg-stone-50 border border-stone-100 rounded-2xl px-5 py-5">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">その他の機能</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                "プッシュ通知・LINE通知",
                "SNSシェア機能",
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
      <section className="py-16 px-5">
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
          <h2 className="text-2xl font-bold text-white">今すぐ無料で始めましょう</h2>
          <p className="text-amber-200 text-sm">
            設定は最短5分。難しい操作は一切ありません。
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
