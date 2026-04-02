"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { logout } from "@/app/auth/actions";

interface NavItem {
  icon: string;
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
      { icon: "📋", label: "レポート", href: "/admin/reports" },
    ],
  },
  {
    title: "イベント管理",
    items: [
      { icon: "🎋", label: "イベント", href: "/admin/events", excludePrefix: "/admin/events/analytics" },
      { icon: "🔬", label: "分析", href: "/admin/events/analytics", adminOnly: true },
    ],
  },
  {
    title: "配信管理",
    items: [
      { icon: "📢", label: "お知らせ", href: "/admin/announcements" },
      { icon: "📝", label: "ブログ", href: "/admin/blog" },
      { icon: "📅", label: "行事", href: "/admin/annual-events" },
      { icon: "💚", label: "LINE配信", href: "/admin/line", adminOnly: true },
    ],
  },
  {
    title: "CRM・収益",
    items: [
      { icon: "📈", label: "パイプライン", href: "/admin/pipeline" },
      { icon: "💰", label: "収益管理", href: "/admin/revenue", adminOnly: true },
      { icon: "📉", label: "経営分析", href: "/admin/analytics/retention", adminOnly: true },
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
      { icon: "👤", label: "スタッフ管理", href: "/admin/staff", adminOnly: true },
      { icon: "🎫", label: "会員プラン", href: "/admin/plans", adminOnly: true },
      { icon: "💳", label: "プラン・お支払い", href: "/admin/billing", adminOnly: true },
      { icon: "🔍", label: "操作ログ", href: "/admin/logs", adminOnly: true },
    ],
  },
];

export default function Sidebar({ templeName, userName, isAdmin, planStatus }: SidebarProps) {
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

  // 現在のパスを含むセクションのインデックスを返す
  const getActiveSection = () =>
    visibleSections.findIndex(
      (section) => section.title && section.items.some((item) => isActive(item))
    );

  const [openSections, setOpenSections] = useState<Set<number>>(
    () => new Set(getActiveSection() !== -1 ? [getActiveSection()] : [])
  );

  // パス変更時にアクティブセクションを自動展開
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
      <div className="px-4 py-5 border-b border-stone-200">
        <p className="text-xs text-stone-400 font-medium">てらログ 管理</p>
        <p className="text-sm font-bold text-stone-800 mt-0.5 truncate">{templeName}</p>
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {visibleSections.map((section, si) => {
          if (!section.title) {
            // ダッシュボード：常に表示
            return (
              <div key={si} className="mb-1">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
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
            );
          }

          const isOpen = openSections.has(si);
          const hasActive = section.items.some((item) => isActive(item));

          return (
            <div key={si} className="mb-0.5">
              {/* セクションヘッダー（折りたたみトグル） */}
              <button
                type="button"
                onClick={() => toggleSection(si)}
                className={`w-full flex items-center justify-between px-2 py-2 rounded-lg text-left transition-colors ${
                  hasActive
                    ? "text-amber-800 bg-amber-50/60"
                    : "text-stone-500 hover:bg-stone-100"
                }`}
              >
                <span className={`text-[11px] font-semibold uppercase tracking-wider ${hasActive ? "text-amber-700" : "text-stone-400"}`}>
                  {section.title}
                </span>
                <span className={`text-xs transition-transform duration-200 ${isOpen ? "rotate-90" : ""} ${hasActive ? "text-amber-600" : "text-stone-300"}`}>
                  ›
                </span>
              </button>

              {/* セクション内アイテム */}
              {isOpen && (
                <div className="ml-1 border-l-2 border-stone-100 pl-2 mb-1">
                  {section.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
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
              )}
            </div>
          );
        })}
      </nav>

      {/* プランステータス */}
      {planStatus && planStatus !== "ACTIVE" && (
        <div className="px-3 pb-2">
          <Link
            href="/admin/billing"
            onClick={() => setMobileOpen(false)}
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
        onClick={() => setMobileOpen((v) => !v)}
        aria-label="メニュー"
      >
        <span className="text-stone-600 text-lg">{mobileOpen ? "✕" : "☰"}</span>
      </button>

      {/* モバイル: オーバーレイ */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/30"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* モバイル: ドロワー */}
      <div
        className={`lg:hidden fixed top-0 left-0 z-40 h-full w-60 bg-white border-r border-stone-200 transform transition-transform ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
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
