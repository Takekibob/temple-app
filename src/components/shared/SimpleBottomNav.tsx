"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface Props {
  isDanka: boolean;
  unreadNewsCount?: number;
}

export default function SimpleBottomNav({ isDanka, unreadNewsCount = 0 }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const isHome = pathname === "/app";
  const canGoBack = !isHome;

  const btnBase =
    "flex flex-col items-center justify-center gap-1 min-h-[44px] min-w-[56px] rounded-2xl text-xs font-semibold transition-colors";

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-stone-200 safe-area-pb">
      {canGoBack && (
        <div className="px-4 pt-2">
          <button
            onClick={() => router.back()}
            className={`${btnBase} w-full bg-stone-100 text-stone-700 px-4 py-2`}
          >
            ← 戻る
          </button>
        </div>
      )}
      <div className="flex items-center justify-around px-4 py-3 gap-2">
        <Link
          href="/app"
          className={`${btnBase} flex-1 py-3 ${
            pathname === "/app"
              ? "bg-amber-700 text-white"
              : "bg-stone-100 text-stone-700"
          }`}
        >
          <span className="text-xl">🏠</span>
          <span>ホーム</span>
        </Link>
        {isDanka ? (
          <Link
            href="/app/reservations"
            className={`${btnBase} flex-1 py-3 ${
              pathname.startsWith("/app/reservations")
                ? "bg-amber-700 text-white"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            <span className="text-xl">📿</span>
            <span>法要予約</span>
          </Link>
        ) : (
          <Link
            href="/app/events"
            className={`${btnBase} flex-1 py-3 ${
              pathname.startsWith("/app/events")
                ? "bg-amber-700 text-white"
                : "bg-stone-100 text-stone-700"
            }`}
          >
            <span className="text-xl">📅</span>
            <span>イベント</span>
          </Link>
        )}
        <Link
          href="/app/news"
          className={`${btnBase} flex-1 py-3 relative ${
            pathname.startsWith("/app/news")
              ? "bg-amber-700 text-white"
              : "bg-stone-100 text-stone-700"
          }`}
        >
          <span className="relative">
            <span className="text-xl">📢</span>
            {unreadNewsCount > 0 && (
              <span className="absolute -top-1 -right-2 min-w-[16px] h-4 bg-blue-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
                {unreadNewsCount > 99 ? "99+" : unreadNewsCount}
              </span>
            )}
          </span>
          <span>お知らせ</span>
        </Link>
        <Link
          href="/app/mypage"
          className={`${btnBase} flex-1 py-3 ${
            pathname === "/app/mypage"
              ? "bg-amber-700 text-white"
              : "bg-stone-100 text-stone-700"
          }`}
        >
          <span className="text-xl">👤</span>
          <span>マイページ</span>
        </Link>
      </div>
    </nav>
  );
}
