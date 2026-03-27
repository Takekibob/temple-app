import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 - ページが見つかりません",
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">🏛</div>
        <h1 className="text-4xl font-bold text-stone-800 mb-2">404</h1>
        <p className="text-lg font-medium text-stone-700 mb-2">
          ページが見つかりません
        </p>
        <p className="text-sm text-stone-500 mb-8">
          お探しのページは移動または削除された可能性があります。
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/app"
            className="inline-block px-6 py-3 bg-amber-700 text-white rounded-xl font-medium hover:bg-amber-800 transition-colors"
          >
            ホームへ戻る
          </Link>
          <Link
            href="/"
            className="inline-block px-6 py-3 border border-stone-200 text-stone-600 rounded-xl hover:bg-stone-100 transition-colors"
          >
            ログインページへ
          </Link>
        </div>
      </div>
    </div>
  );
}
