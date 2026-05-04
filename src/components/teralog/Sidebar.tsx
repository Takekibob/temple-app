"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/app/auth/actions";
import TempleAvatar from "./TempleAvatar";

interface SidebarProps {
  templeName: string;
  logoUrl?: string;
  userName: string;
  isAdmin: boolean;
}

type NavItem = { label: string; href: string; exact?: boolean; adminOnly?: boolean };

const MAIN_NAV: NavItem[] = [
  { label: "きょうの様子", href: "/admin",               exact: true },
  { label: "集いをひらく",   href: "/admin/events" },
  { label: "お知らせを送る", href: "/admin/announcements" },
  { label: "フォロワー",     href: "/admin/members" },
  { label: "お寺の情報",     href: "/admin/settings",     adminOnly: true },
];

const BOTTOM_NAV: NavItem[] = [
  { label: "LINE設定",     href: "/admin/line",  adminOnly: true },
  { label: "スタッフ管理", href: "/admin/staff", adminOnly: true },
];

export default function Sidebar({ templeName, logoUrl, userName, isAdmin }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const navItem = (href: string, label: string, exact?: boolean) => {
    const active = isActive(href, exact);
    return (
      <Link
        key={href}
        href={href}
        onClick={() => setMobileOpen(false)}
        className={`
          relative flex items-center px-6 py-3 text-sm font-serif font-light
          transition-colors
          ${active
            ? "bg-paper-cream text-ink"
            : "text-ink-secondary hover:bg-paper-cream hover:text-ink"
          }
        `}
        style={active ? { borderLeft: "2px solid #1A1A1A" } : { borderLeft: "2px solid transparent" }}
      >
        {label}
      </Link>
    );
  };

  const content = (
    <div className="flex flex-col h-full bg-paper">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 px-6 py-5" style={{ borderBottom: "0.5px solid #E5E5E5" }}>
        <TempleAvatar name={templeName} imageUrl={logoUrl} size="sm" />
        <div className="min-w-0">
          <p className="font-serif text-[10px] text-ink-tertiary tracking-section font-light leading-none mb-1">
            管 理
          </p>
          <p className="font-serif text-sm text-ink font-light truncate leading-tight">
            {templeName}
          </p>
        </div>
      </div>

      {/* メインナビ */}
      <nav className="flex-1 overflow-y-auto py-4">
        {MAIN_NAV.filter((item) => !item.adminOnly || isAdmin).map((item) =>
          navItem(item.href, item.label, "exact" in item ? item.exact : undefined)
        )}
      </nav>

      {/* 設定 + ユーザー */}
      <div style={{ borderTop: "0.5px solid #E5E5E5" }}>
        {BOTTOM_NAV.filter((item) => !item.adminOnly || isAdmin).map((item) =>
          navItem(item.href, item.label)
        )}
        <div className="px-6 py-4" style={{ borderTop: "0.5px solid #F0F0F0" }}>
          <p className="font-serif text-[11px] text-ink-tertiary font-light mb-3 truncate">
            {userName}
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/app"
              className="font-serif text-[11px] text-ink-secondary font-light tracking-section"
            >
              利用者画面
            </Link>
            <button
              type="button"
              onClick={async () => { await logout(); }}
              className="font-serif text-[11px] text-ink-tertiary font-light"
            >
              ログアウト
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* モバイル: ハンバーガーボタン */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 bg-paper p-2"
        style={{ border: "0.5px solid #E5E5E5" }}
        onClick={() => setMobileOpen((v) => !v)}
        aria-label="メニュー"
      >
        <span className="font-sans text-ink text-[16px] leading-none">
          {mobileOpen ? "✕" : "≡"}
        </span>
      </button>

      {/* モバイル: オーバーレイ */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/35"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* モバイル: ドロワー */}
      <div
        className={`lg:hidden fixed top-0 left-0 z-40 h-full w-60 transform transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {content}
      </div>

      {/* デスクトップ: 固定サイドバー */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 h-screen sticky top-0" style={{ borderRight: "0.5px solid #E5E5E5" }}>
        {content}
      </aside>
    </>
  );
}
