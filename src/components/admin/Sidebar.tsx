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
  /** このプレフィックスで始まるパスでは active にしない */
  excludePrefix?: string;
  /** href の代わりにこのプレフィックスで active 判定する */
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
  planStatus?: string;
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
    ],
  },
  {
    title: "会計管理",
    items: [
      { icon: "💴", label: "お布施", href: "/admin/ofuse" },
      { icon: "🏦", label: "護持会費", href: "/admin/gojikai" },
      { icon: "📊", label: "レポート", href: "/admin/reports" },
    ],
  },
  {
    title: "イベント管理",
    items: [
      { icon: "🎋", label: "イベント", href: "/admin/events", excludePrefix: "/admin/events/analytics" },
      { icon: "📊", label: "分析", href: "/admin/events/analytics", adminOnly: true },
    ],
  },
  {
    title: "配信管理",
    items: [
      { icon: "📢", label: "お知らせ", href: "/admin/announcements" },
      { icon: "📅", label: "行事", href: "/admin/annual-events" },
      { icon: "💚", label: "LINE配信", href: "/admin/line", adminOnly: true },
    ],
  },
  {
    title: "CRM・収益",
    items: [
      { icon: "📈", label: "パイプライン", href: "/admin/pipeline" },
      { icon: "💰", label: "収益管理", href: "/admin/revenue", adminOnly: true },
      { icon: "📊", label: "経営分析", href: "/admin/analytics/retention", adminOnly: true },
    ],
  },
  {
    title: "ブランディング",
    items: [
      { icon: "🌐", label: "寺院公開LP", href: "/admin/temple-page", adminOnly: true },
      { icon: "📷", label: "OCR取り込み", href: "/admin/ocr", adminOnly: true },
      { icon: "📦", label: "導入サポート", href: "/admin/onboarding-pack", adminOnly: true },
    ],
  },
  {
    title: "システム",
    items: [
      { icon: "⚙️", label: "設定", href: "/admin/settings", adminOnly: true, excludePrefix: "/admin/settings/scoring" },
      { icon: "🎯", label: "スコアリング設定", href: "/admin/settings/scoring", adminOnly: true },
      { icon: "👥", label: "スタッフ管理", href: "/admin/staff", adminOnly: true },
      { icon: "💳", label: "プラン・お支払い", href: "/admin/billing", adminOnly: true },
      { icon: "🔍", label: "操作ログ", href: "/admin/logs", adminOnly: true },
    ],
  },
];

export default function Sidebar({ templeName, userName, isAdmin, planStatus }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

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
                  isActive(item)
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

      {/* プランステータス */}
      {planStatus && planStatus !== "ACTIVE" && (
        <div className="px-3 pb-2">
          <Link
            href="/admin/billing"
            onClick={() => setOpen(false)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border w-full ${
              planStatus === "TRIAL"
                ? "text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100"
                : planStatus === "PAST_DUE"
                ? "text-orange-700 bg-orange-50 border-orange-200 hover:bg-orange-100"
                : "text-red-700 bg-red-50 border-red-200 hover:bg-red-100"
            }`}
          >
            <span>💳</span>
            <span>
              {planStatus === "TRIAL" && "トライアル中"}
              {planStatus === "PAST_DUE" && "支払い遅延"}
              {planStatus === "CANCELLED" && "解約済み"}
              {planStatus === "SUSPENDED" && "停止中"}
            </span>
          </Link>
        </div>
      )}

      {/* ユーザー情報 */}
      <div className="px-4 py-4 border-t border-stone-200">
        <p className="text-xs text-stone-500 truncate">{userName}</p>
        <div className="flex items-center gap-3 mt-1.5">
          <Link
            href="/app"
            className="text-xs text-amber-700 hover:text-amber-900 font-medium"
          >
            👁 利用者画面を見る
          </Link>
          <span className="text-stone-200">|</span>
          <button
            onClick={async () => { await logout(); }}
            className="text-xs text-stone-400 hover:text-stone-600"
          >
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
