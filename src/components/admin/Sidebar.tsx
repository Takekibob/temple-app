"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/app/auth/actions";
import {
  LayoutDashboard,
  CalendarDays, CalendarPlus,
  Megaphone, Bell, BookOpen,
  Users,
  Send, Settings, UserCog, History,
  Eye, LogOut, Menu, X,
} from "lucide-react";

interface NavItemDef {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
  href: string;
  adminOnly?: boolean;
  exactMatch?: boolean;
  excludePath?: string;
}

interface SidebarProps {
  templeName: string;
  userName: string;
  isAdmin: boolean;
}

const TOP_ITEM: NavItemDef = {
  icon: LayoutDashboard,
  label: "きょうの動き",
  href: "/admin",
  exactMatch: true,
};

const GROUP_SECTIONS: { title: string; items: NavItemDef[] }[] = [
  {
    title: "集いを企画する",
    items: [
      { icon: CalendarDays, label: "集い一覧", href: "/admin/events", excludePath: "/admin/events/new" },
      { icon: CalendarPlus, label: "新しい集いを作る", href: "/admin/events/new", exactMatch: true },
    ],
  },
  {
    title: "発信する",
    items: [
      { icon: Megaphone, label: "お寺の声", href: "/admin/posts" },
      { icon: Bell, label: "お知らせを送る", href: "/admin/announcements" },
      { icon: BookOpen, label: "学びの記事", href: "/admin/articles" },
    ],
  },
  {
    title: "フォロワー",
    items: [
      { icon: Users, label: "メンバー一覧", href: "/admin/members" },
    ],
  },
];

const SYSTEM_ITEMS: NavItemDef[] = [
  { icon: Send,    label: "LINE配信（自動化）", href: "/admin/line",     adminOnly: true },
  { icon: Settings, label: "お寺の設定",        href: "/admin/settings", adminOnly: true },
  { icon: UserCog, label: "スタッフ管理",       href: "/admin/staff",    adminOnly: true },
  { icon: History, label: "操作ログ",           href: "/admin/logs" },
];

export default function Sidebar({ templeName, userName, isAdmin }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActiveItem = (item: NavItemDef): boolean => {
    if (item.exactMatch) return pathname === item.href;
    if (item.excludePath && pathname.startsWith(item.excludePath)) return false;
    return pathname.startsWith(item.href);
  };

  const closeMobile = () => setMobileOpen(false);

  const content = (
    <div className="flex flex-col h-full bg-paper">
      {/* ── ヘッダー ── */}
      <div
        className="flex items-center gap-3 px-4 py-4"
        style={{ borderBottom: "0.5px solid var(--color-border)" }}
      >
        <div className="w-8 h-8 bg-paper-soft shrink-0 flex items-center justify-center">
          <span className="font-serif text-base text-ink-secondary leading-none">
            {templeName.charAt(0)}
          </span>
        </div>
        <div className="min-w-0">
          <p className="font-serif text-[10px] text-ink-tertiary tracking-section leading-none mb-1">
            てらログ 管理
          </p>
          <p className="font-serif text-sm text-ink font-light truncate leading-tight">
            {templeName}
          </p>
        </div>
      </div>

      {/* ── ナビゲーション ── */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5">
        {/* 最上位: きょうの動き */}
        <div className="px-3">
          <SidebarLink item={TOP_ITEM} active={isActiveItem(TOP_ITEM)} onNavigate={closeMobile} />
        </div>

        {/* グループセクション */}
        {GROUP_SECTIONS.map((section) => {
          const visibleItems = section.items.filter((item) => !item.adminOnly || isAdmin);
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.title} className="pt-2">
              {/* グループ見出し(クリック不可) */}
              <p className="font-serif text-[10px] text-ink-tertiary tracking-section uppercase px-3 pb-1 pt-1 cursor-default">
                {section.title}
              </p>
              {/* グループ項目 */}
              <div className="px-3">
                {visibleItems.map((item) => (
                  <SidebarLink
                    key={item.href}
                    item={item}
                    active={isActiveItem(item)}
                    onNavigate={closeMobile}
                    indented
                  />
                ))}
              </div>
            </div>
          );
        })}

        {/* 区切り線 */}
        <div
          className="mx-3 my-3"
          style={{ borderTop: "0.5px solid var(--color-border)" }}
        />

        {/* システム項目 */}
        <div className="px-3">
          {SYSTEM_ITEMS.filter((item) => !item.adminOnly || isAdmin).map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              active={isActiveItem(item)}
              onNavigate={closeMobile}
            />
          ))}
        </div>
      </nav>

      {/* ── フッター ── */}
      <div
        className="px-4 py-4"
        style={{ borderTop: "0.5px solid var(--color-border)" }}
      >
        <p className="font-serif text-[11px] text-ink-tertiary font-light mb-3 truncate">
          {userName}
        </p>
        <div className="flex items-center gap-4">
          <Link
            href="/app"
            className="flex items-center gap-1.5 font-serif text-[11px] text-ink-secondary hover:text-ink transition-colors"
          >
            <Eye size={11} />
            利用者画面
          </Link>
          <button
            type="button"
            onClick={async () => { await logout(); }}
            className="flex items-center gap-1.5 font-serif text-[11px] text-ink-tertiary hover:text-ink transition-colors"
          >
            <LogOut size={11} />
            ログアウト
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* モバイル: ハンバーガーボタン */}
      <button
        className="lg:hidden fixed top-3 left-3 z-50 bg-paper p-2"
        style={{ border: "0.5px solid var(--color-border)" }}
        onClick={() => setMobileOpen((v) => !v)}
        aria-label="メニュー"
      >
        {mobileOpen
          ? <X size={18} className="text-ink-secondary" />
          : <Menu size={18} className="text-ink-secondary" />
        }
      </button>

      {/* モバイル: オーバーレイ */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-ink/30"
          onClick={closeMobile}
        />
      )}

      {/* モバイル: ドロワー */}
      <div
        className={`lg:hidden fixed top-0 left-0 z-40 h-full w-60 transform transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ borderRight: "0.5px solid var(--color-border)" }}
      >
        {content}
      </div>

      {/* デスクトップ: 固定サイドバー */}
      <aside
        className="hidden lg:flex flex-col w-60 shrink-0 h-screen sticky top-0"
        style={{ borderRight: "0.5px solid var(--color-border)" }}
      >
        {content}
      </aside>
    </>
  );
}

// ── サイドバーリンク ──────────────────────────────────────────

function SidebarLink({
  item,
  active,
  onNavigate,
  indented = false,
}: {
  item: NavItemDef;
  active: boolean;
  onNavigate: () => void;
  indented?: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`
        flex items-center gap-2 font-sans text-sm py-2 transition-colors
        ${indented ? "pl-4 pr-2" : "px-2"}
        ${active ? "bg-ink text-paper" : "text-ink-secondary hover:bg-paper-soft"}
      `}
    >
      <Icon size={15} strokeWidth={1.6} className="flex-shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}
