"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface BottomNavProps {
  isDanka: boolean;
}

export default function BottomNav({ isDanka }: BottomNavProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/app" ? pathname === "/app" : pathname.startsWith(href);

  const linkClass = (href: string) =>
    `flex-1 flex flex-col items-center py-2 text-xs gap-0.5 transition-colors ${
      isActive(href) ? "text-amber-700 font-medium" : "text-stone-400 hover:text-stone-600"
    }`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 flex safe-area-pb">
      <Link href="/app" className={linkClass("/app")}>
        <span className="text-xl">🏠</span>
        <span>ホーム</span>
      </Link>
      <Link href="/app/calendar" className={linkClass("/app/calendar")}>
        <span className="text-xl">📆</span>
        <span>カレンダー</span>
      </Link>
      {isDanka && (
        <Link href="/app/reservations" className={linkClass("/app/reservations")}>
          <span className="text-xl">📿</span>
          <span>法要予約</span>
        </Link>
      )}
      <Link href="/app/events" className={linkClass("/app/events")}>
        <span className="text-xl">📅</span>
        <span>イベント</span>
      </Link>
      <Link href="/app/news" className={linkClass("/app/news")}>
        <span className="text-xl">📢</span>
        <span>お知らせ</span>
      </Link>
      <Link href="/app/mypage" className={linkClass("/app/mypage")}>
        <span className="text-xl">👤</span>
        <span>マイページ</span>
      </Link>
    </nav>
  );
}
