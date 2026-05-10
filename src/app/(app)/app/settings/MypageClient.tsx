"use client";

import { useTransition } from "react";
import Link from "next/link";
import { logout } from "@/app/auth/actions";
import Image from "next/image";
import {
  Bell, Smartphone,
  ChevronRight, LogOut, Pencil,
  MapPin,
} from "lucide-react";

interface Props {
  user: { name: string; email: string; avatarUrl: string | null };
  member: { id: string; familyName: string } | null;
  templeId: string | null;
  lineLinked: boolean;
}

export default function MypageClient({ user, member, templeId, lineLinked }: Props) {
  const [isLogoutPending, startLogoutTransition] = useTransition();

  return (
    <div className="min-h-screen bg-stone-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-stone-100 px-5 py-4 flex items-center justify-between">
        <h1 className="font-serif text-lg font-bold text-stone-800">マイページ</h1>
        <button
          onClick={() => startLogoutTransition(async () => { await logout(); })}
          disabled={isLogoutPending}
          className="flex items-center gap-1.5 text-sm text-stone-400 hover:text-stone-600 transition-colors"
        >
          <LogOut size={15} />
          {isLogoutPending ? "…" : "ログアウト"}
        </button>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-5 pb-28 space-y-3">

        {/* プロフィールカード */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-amber-700 to-amber-500" />
          <div className="p-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-white font-bold text-xl shadow-sm shrink-0 relative">
                {user.avatarUrl ? (
                  <Image src={user.avatarUrl} alt={user.name} fill className="object-cover" />
                ) : (
                  user.name.charAt(0)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-serif font-bold text-stone-800 text-base">{user.name}</p>
                <p className="font-serif text-xs text-stone-400 truncate mt-0.5">{user.email}</p>
              </div>
              <Link href="/app/settings/profile"
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl border border-stone-200 text-stone-400 hover:border-amber-300 hover:text-amber-700 hover:bg-amber-50 transition-all">
                <Pencil size={14} />
              </Link>
            </div>
          </div>
        </div>

        {/* LINE未連携バナー */}
        {!lineLinked && (
          <Link
            href="/app/settings/line"
            className="flex items-center gap-3.5 bg-[#06C755] rounded-2xl px-4 py-3.5 shadow-sm hover:brightness-95 transition-all"
          >
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white">
                <path d="M19.365 9.863c.349 0 .63.285.63.63 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.346 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-serif text-white font-bold text-sm">LINEと連携しよう</p>
              <p className="font-serif text-white/80 text-xs mt-0.5">イベントのお知らせをLINEで受け取れます</p>
            </div>
            <div className="shrink-0 bg-white text-[#06C755] text-xs font-bold px-3 py-1.5 rounded-full">
              連携する
            </div>
          </Link>
        )}

        {/* お寺との繋がり */}
        <NavSection title="お寺との繋がり">
          <NavItem
            href={templeId ? `/app/temples/${templeId}` : "/app/temples?tab=following"}
            icon={MapPin}
            label={templeId ? "所属寺院について" : "フォロー中のお寺"}
            iconColor="text-stone-600 bg-stone-100"
          />
        </NavSection>

        {/* アカウント情報 */}
        <NavSection title="アカウント情報">
          <NavItem
            href="/app/settings/line"
            icon={Smartphone}
            label="LINE連携"
            iconColor="text-green-600 bg-green-50"
            badge={
              lineLinked
                ? <Badge color="green">連携済み</Badge>
                : <Badge color="amber">未連携</Badge>
            }
          />
          <NavItem href="/app/settings/notifications" icon={Bell} label="通知設定" iconColor="text-sky-600 bg-sky-50" />
        </NavSection>

      </div>
    </div>
  );
}

// ── 共通コンポーネント ──────────────────────────────────────

function NavSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
      <p className="font-serif text-[10px] font-bold text-stone-400 px-4 pt-3.5 pb-1.5 uppercase tracking-widest">
        {title}
      </p>
      <div className="divide-y divide-stone-50">{children}</div>
    </div>
  );
}

function NavItem({
  href, icon: Icon, label, badge, iconColor,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
  badge?: React.ReactNode;
  iconColor: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between px-4 py-3 hover:bg-stone-50 transition-colors"
    >
      <span className="flex items-center gap-3 font-serif text-sm text-stone-700">
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconColor}`}>
          <Icon size={15} strokeWidth={1.8} />
        </span>
        {label}
      </span>
      <span className="flex items-center gap-2">
        {badge}
        <ChevronRight size={15} className="text-stone-300" />
      </span>
    </Link>
  );
}

function Badge({ color, children }: { color: "green" | "amber"; children: React.ReactNode }) {
  const colors = {
    green: "text-green-600 bg-green-50 border border-green-200",
    amber: "text-amber-600 bg-amber-50 border border-amber-200",
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${colors[color]}`}>
      {children}
    </span>
  );
}
