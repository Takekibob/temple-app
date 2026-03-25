"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function PwaReturnPage() {
  const [secondsLeft, setSecondsLeft] = useState(5);

  // 5秒後に自動でアプリURLへ遷移（Safari上で /app を開く）
  // iOSはsame-originのURLを開くとPWAに切り替わる場合がある
  useEffect(() => {
    if (secondsLeft <= 0) {
      window.location.href = "/app";
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-8 max-w-sm w-full text-center">
        {/* 成功アイコン */}
        <div className="text-5xl mb-4">✅</div>

        <h1 className="text-xl font-bold text-stone-800 mb-2">
          ログインが完了しました
        </h1>
        <p className="text-stone-500 text-sm mb-6">
          ホーム画面の「てらログ」アプリをタップして戻ってください
        </p>

        {/* 手順イラスト */}
        <div className="bg-stone-50 rounded-xl p-4 mb-6 text-left space-y-2 text-sm text-stone-600">
          <div className="flex items-center gap-2">
            <span className="text-lg">1️⃣</span>
            <span>このブラウザを閉じる</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">2️⃣</span>
            <span>ホーム画面の「てらログ」をタップ</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">3️⃣</span>
            <span>ログイン済みの状態でアプリが開きます</span>
          </div>
        </div>

        {/* 自動遷移カウントダウン（Safari上でそのまま使いたい場合の補助） */}
        <p className="text-xs text-stone-400 mb-3">
          {secondsLeft > 0
            ? `${secondsLeft}秒後にブラウザ版へ自動移動します`
            : "移動中..."}
        </p>

        <Link
          href="/app"
          className="block w-full py-2.5 px-4 bg-amber-700 hover:bg-amber-800 text-white text-sm font-medium rounded-lg transition-colors"
        >
          ブラウザ版を開く
        </Link>
      </div>
    </div>
  );
}
