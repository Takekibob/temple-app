"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/app/auth/actions";

interface NavItem {
  icon: string;
  label: string;
  href: string;
  adminOnly?: boolean;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

interface SidebarProps {
  templeName: string;
  userName: string;
  isAdmin: boolean;
}

const NAV_SECTIONS: NavSection[] = [
  {
    items: [{ icon: "📊", label: "ダッシュボード", href: "/admin" }],
  },
  {
    title: "檀家管理",
    items: [
      { icon: "📅", label: "予約", href: "/admin/reservations" },
      { icon: "👥", label: "会員", href: "/admin/members" },
      { icon: "📖", label: "過去帳", href: "/admin/deceased" },
      { icon: "💰", label: "会計", href: "/admin/accounting" },
    ],
  },
  {
    title: "イベント管理",
    items: [
      { icon: "🎋", label: "イベント", href: "/admin/events" },
      { icon: "📊", label: "分析", href: "/admin/analytics", adminOnly: true },
    ],
  },
  {
    title: "配信管理",
    items: [
      { icon: "📢", label: "お知らせ", href: "/admin/announcements" },
      { icon: "📅", label: "行事", href: "/admin/annual-events" },
    ],
  },
  {
    title: "システム",
    items: [
      { icon: "⚙️", label: "設定", href: "/admin/settings" },
      { icon: "👥", label: "スタッフ管理", href: "/admin/staff", adminOnly: true },
    ],
  },
];

export default function Sidebar({ templeName, userName, isAdmin }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.adminOnly || isAdmin),
  })).filter((section) => section.items.length > 0);

  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  const content = (
    <div className="flex flex-col h-full">
      {/* ロゴ */}
      <div className="px-4 py-5 border-b border-stone-200">
        <p className="text-xs text-stone-400 font-medium">てらログ 管理</p>
        <p className="text-sm font-bold text-stone-800 mt-0.5 truncate">{templeName}</p>
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {visibleSections.map((section, si) => (
          <div key={si} className="mb-1">
            {section.title && (
              <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider px-2 pt-3 pb-1">
                {section.title}
              </p>
            )}
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors ${
                  isActive(item.href)
                    ? "bg-amber-50 text-amber-800 font-medium"
                    : "text-stone-600 hover:bg-stone-100"
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* ユーザー情報 */}
      <div className="px-4 py-4 border-t border-stone-200">
        <p className="text-xs text-stone-500 truncate">{userName}</p>
        <button
          onClick={async () => { await logout(); }}
          className="text-xs text-stone-400 hover:text-stone-600 mt-1"
        >
          ログアウト
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* モバイル: ハンバーガーボタン */}
      <button
        className="lg:hidden fixed top-3 left-3 z-50 bg-white border border-stone-200 rounded-lg p-2 shadow-sm"
        onClick={() => setOpen((v) => !v)}
        aria-label="メニュー"
      >
        <span className="text-stone-600 text-lg">{open ? "✕" : "☰"}</span>
      </button>

      {/* モバイル: オーバーレイ */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/30"
          onClick={() => setOpen(false)}
        />
      )}

      {/* モバイル: ドロワー */}
      <div
        className={`lg:hidden fixed top-0 left-0 z-40 h-full w-60 bg-white border-r border-stone-200 transform transition-transform ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {content}
      </div>

      {/* デスクトップ: 固定サイドバー */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-white border-r border-stone-200 h-screen sticky top-0">
        {content}
      </aside>
    </>
  );
}
