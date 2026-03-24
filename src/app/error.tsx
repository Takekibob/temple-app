"use client";

import { useEffect } from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // エラーをログサービスに送信（本番では Sentry 等を使用）
    console.error("[App Error]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">🙏</div>
        <h2 className="text-2xl font-bold text-stone-800 mb-2">
          エラーが発生しました
        </h2>
        <p className="text-sm text-stone-500 mb-2">
          予期しないエラーが発生しました。しばらく経ってから再度お試しください。
        </p>
        {error.digest && (
          <p className="text-xs text-stone-400 mb-6 font-mono">
            エラーコード: {error.digest}
          </p>
        )}
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="px-6 py-3 bg-amber-700 text-white rounded-xl font-medium hover:bg-amber-800 transition-colors"
          >
            もう一度試す
          </button>
          <a
            href="/app"
            className="px-6 py-3 border border-stone-200 text-stone-600 rounded-xl hover:bg-stone-100 transition-colors"
          >
            ホームへ戻る
          </a>
        </div>
      </div>
    </div>
  );
}
