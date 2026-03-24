import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "メンテナンス中",
};

// メンテナンス中はこのページを表示する
// next.config.ts の rewrites でルート全体をリダイレクト、または
// proxy.ts に MAINTENANCE_MODE 環境変数チェックを追加して使用する
export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">🔧</div>
        <h1 className="text-2xl font-bold text-stone-800 mb-3">
          メンテナンス中
        </h1>
        <p className="text-stone-600 mb-2">
          ただいまシステムのメンテナンスを行っております。
        </p>
        <p className="text-stone-500 text-sm mb-8">
          ご不便をおかけして申し訳ありません。しばらくお待ちください。
        </p>
        <div className="bg-white border border-stone-200 rounded-xl p-4 text-left text-sm text-stone-600">
          <p className="font-medium text-stone-700 mb-1">メンテナンス予定時間</p>
          <p>作業完了次第、サービスを再開いたします。</p>
        </div>
        <p className="text-xs text-stone-400 mt-6">
          お問い合わせ:{" "}
          <a
            href="mailto:support@teralog.app"
            className="text-amber-700 hover:underline"
          >
            support@teralog.app
          </a>
        </p>
      </div>
    </div>
  );
}
