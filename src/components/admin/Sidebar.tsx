"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { logout } from "@/app/auth/actions";
import {
  LayoutDashboard, Users, Calendar,
  Bell, MessageCircle, BookOpen,
  Settings, UserCog,
  ChevronRight, Eye, LogOut, Menu, X,
} from "lucide-react";

interface NavItem {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
  href: string;
  adminOnly?: boolean;
  excludePrefix?: string;
  activePrefix?: string;
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
    items: [{ icon: LayoutDashboard, label: "ダッシュボード", href: "/admin" }],
  },
  {
    title: "会員",
    items: [
      { icon: Users, label: "メンバー一覧", href: "/admin/members" },
    ],
  },
  {
    title: "イベント・お知らせ",
    items: [
      { icon: Calendar, label: "イベント一覧", href: "/admin/events" },
      { icon: Bell, label: "お知らせ", href: "/admin/announcements" },
      { icon: Eye, label: "お寺の声", href: "/admin/posts" },
      { icon: BookOpen, label: "学びの記事", href: "/admin/articles" },
      { icon: MessageCircle, label: "LINE配信", href: "/admin/line", adminOnly: true },
    ],
  },
  {
    title: "設定",
    items: [
      { icon: Settings, label: "お寺の設定", href: "/admin/settings", adminOnly: true },
      { icon: UserCog, label: "スタッフ管理", href: "/admin/staff", adminOnly: true },
    ],
  },
];

export default function Sidebar({ templeName, userName, isAdmin }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.adminOnly || isAdmin),
  })).filter((section) => section.items.length > 0);

  const isActive = (item: NavItem) => {
    const matchPath = item.activePrefix ?? item.href;
    if (matchPath === "/admin") return pathname === "/admin";
    if (item.excludePrefix && pathname.startsWith(item.excludePrefix)) return false;
    return pathname.startsWith(matchPath);
  };

  const getActiveSection = () =>
    visibleSections.findIndex(
      (section) => section.title && section.items.some((item) => isActive(item))
    );

  const [openSections, setOpenSections] = useState<Set<number>>(
    () => new Set(getActiveSection() !== -1 ? [getActiveSection()] : [])
  );

  useEffect(() => {
    const activeIdx = getActiveSection();
    if (activeIdx !== -1) {
      setOpenSections((prev) => new Set([...prev, activeIdx]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleSection = (idx: number) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* ロゴ */}
      <div className="px-4 py-4 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {templeName.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-stone-400 font-medium leading-none mb-0.5">てらログ 管理</p>
            <p className="text-sm font-bold text-stone-800 truncate leading-tight">{templeName}</p>
          </div>
        </div>
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {visibleSections.map((section, si) => {
          if (!section.title) {
            return (
              <div key={si} className="mb-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all ${
                        isActive(item)
                          ? "bg-amber-700 text-white font-semibold shadow-sm"
                          : "text-stone-600 hover:bg-stone-100 hover:text-stone-800"
                      }`}
                    >
                      <Icon size={16} strokeWidth={1.8} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            );
          }

          const isOpen = openSections.has(si);
          const hasActive = section.items.some((item) => isActive(item));

          return (
            <div key={si} className="mb-0.5">
              <button
                type="button"
                onClick={() => toggleSection(si)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${
                  hasActive ? "text-amber-800" : "text-stone-400 hover:text-stone-600 hover:bg-stone-50"
                }`}
              >
                <span className={`text-[10px] font-bold uppercase tracking-widest ${hasActive ? "text-amber-700" : "text-stone-400"}`}>
                  {section.title}
                </span>
                <ChevronRight
                  size={13}
                  className={`transition-transform duration-200 ${isOpen ? "rotate-90" : ""} ${hasActive ? "text-amber-500" : "text-stone-300"}`}
                />
              </button>

              {isOpen && (
                <div className="ml-2 border-l-2 border-stone-100 pl-2 mb-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all ${
                          active
                            ? "bg-amber-50 text-amber-800 font-semibold"
                            : "text-stone-600 hover:bg-stone-100 hover:text-stone-800"
                        }`}
                      >
                        <Icon size={14} strokeWidth={1.8} className={active ? "text-amber-700" : "text-stone-400"} />
                        <span className="flex-1 text-[13px]">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* ユーザー情報 */}
      <div className="px-3 py-3 border-t border-stone-100">
        <p className="text-xs text-stone-500 font-medium truncate px-1 mb-2">{userName}</p>
        <div className="flex items-center gap-1">
          <Link
            href="/app"
            className="flex-1 flex items-center justify-center gap-1 text-xs text-stone-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg py-1.5 transition-colors font-medium"
          >
            <Eye size={12} />
            利用者画面
          </Link>
          <div className="w-px h-4 bg-stone-100" />
          <button
            onClick={async () => { await logout(); }}
            className="flex-1 flex items-center justify-center gap-1 text-xs text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg py-1.5 transition-colors"
          >
            <LogOut size={12} />
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
        className="lg:hidden fixed top-3 left-3 z-50 bg-white border border-stone-200 rounded-xl p-2 shadow-sm"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label="メニュー"
      >
        {mobileOpen
          ? <X size={18} className="text-stone-600" />
          : <Menu size={18} className="text-stone-600" />
        }
      </button>

      {/* モバイル: オーバーレイ */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* モバイル: ドロワー */}
      <div
        className={`lg:hidden fixed top-0 left-0 z-40 h-full w-60 bg-white border-r border-stone-100 transform transition-transform shadow-xl ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {content}
      </div>

      {/* デスクトップ: 固定サイドバー */}
      <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-white border-r border-stone-100 h-screen sticky top-0">
        {content}
      </aside>
    </>
  );
}
