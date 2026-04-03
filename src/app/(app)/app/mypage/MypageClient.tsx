"use client";

import { useTransition, useState } from "react";
import Link from "next/link";
import { logout } from "@/app/auth/actions";
import {
  CalendarDays, ScrollText, Coins, BookOpen, Heart, Gift,
  Ticket, MapPin, Settings, Bell, Smartphone, ClipboardList,
  ChevronRight, LogOut, Pencil,
} from "lucide-react";

interface Props {
  user: { name: string; email: string; role: string };
  member: { id: string; type: string; familyName: string } | null;
  templeId: string;
  subscriptionPlanName: string | null;
  lineLinked: boolean;
}

export default function MypageClient({ user, member, templeId, subscriptionPlanName, lineLinked }: Props) {
  const [isLogoutPending, startLogoutTransition] = useTransition();
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [promoteMsg, setPromoteMsg] = useState<string | null>(null);

  const isDanka = member?.type === "DANKA";
  const isGoen = member?.type === "GOEN";

  async function handlePromoteRequest() {
    if (!member || promoteLoading) return;
    setPromoteLoading(true);
    try {
      const res = await fetch(`/api/members/${member.id}/promote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requested: true }),
      });
      setPromoteMsg(res.ok ? "申請を受け付けました。お寺の担当者がご確認します。" : "申請に失敗しました。");
    } catch {
      setPromoteMsg("申請に失敗しました。もう一度お試しください。");
    } finally {
      setPromoteLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-stone-100 px-5 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-stone-800">マイページ</h1>
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
          {/* 上部グラデーション帯 */}
          <div className="h-2 bg-gradient-to-r from-amber-700 to-amber-500" />
          <div className="p-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-white font-bold text-xl shadow-sm shrink-0">
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-stone-800 text-base">{user.name}</p>
                <p className="text-xs text-stone-400 truncate mt-0.5">{user.email}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                    isDanka ? "bg-amber-100 text-amber-800" : "bg-teal-50 text-teal-700 border border-teal-200"
                  }`}>
                    {isDanka ? "檀家" : "ご縁さん"}
                  </span>
                  {isGoen && subscriptionPlanName && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                      ✓ {subscriptionPlanName}
                    </span>
                  )}
                  {isGoen && !subscriptionPlanName && (
                    <Link href="/app/subscriptions"
                      className="text-xs px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-400 hover:bg-amber-50 hover:text-amber-700 transition-colors">
                      会員プランなし
                    </Link>
                  )}
                </div>
              </div>
              <Link href="/app/mypage/profile"
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-xl border border-stone-200 text-stone-400 hover:border-amber-300 hover:text-amber-700 hover:bg-amber-50 transition-all">
                <Pencil size={14} />
              </Link>
            </div>
          </div>
        </div>

        {/* よく使う機能（檀家） */}
        {isDanka && (
          <NavSection title="よく使う機能">
            <NavItem href="/app/reservations" icon={CalendarDays} label="法要予約" iconColor="text-amber-700 bg-amber-50" />
            <NavItem href="/app/ofuse" icon={Coins} label="お布施履歴" iconColor="text-yellow-700 bg-yellow-50" />
            <NavItem href="/app/deceased" icon={ScrollText} label="過去帳" iconColor="text-stone-600 bg-stone-100" />
          </NavSection>
        )}

        {/* よく使う機能（ご縁さん） */}
        {isGoen && (
          <NavSection title="よく使う機能">
            <NavItem href="/app/subscriptions" icon={Ticket} label="会員プラン"
              iconColor="text-emerald-700 bg-emerald-50"
              badge={subscriptionPlanName ? <Badge color="emerald">加入中</Badge> : undefined} />
            <NavItem href="/app/events" icon={BookOpen} label="イベント一覧" iconColor="text-teal-700 bg-teal-50" />
            <NavItem href="/app/events/my" icon={Heart} label="参加予定のイベント" iconColor="text-rose-600 bg-rose-50" />
          </NavSection>
        )}

        {/* 履歴・記録 */}
        {member && (
          <NavSection title="履歴・記録">
            <NavItem href="/app/events/my" icon={Heart} label="イベント参加履歴" iconColor="text-rose-600 bg-rose-50" />
            {isDanka && <NavItem href="/app/reservations" icon={CalendarDays} label="法要予約履歴" iconColor="text-amber-700 bg-amber-50" />}
            {isDanka && <NavItem href="/app/ofuse" icon={Coins} label="お布施履歴" iconColor="text-yellow-700 bg-yellow-50" />}
            <NavItem href="/app/donations" icon={Gift} label="寄付履歴" iconColor="text-purple-600 bg-purple-50" />
          </NavSection>
        )}

        {/* お寺・サービス */}
        {member && (
          <NavSection title="お寺・サービス">
            {templeId && (
              <NavItem href={`/app/temples/${templeId}`} icon={MapPin} label="お寺について" iconColor="text-stone-600 bg-stone-100" />
            )}
            {isGoen && (
              <NavItem href="/app/subscriptions" icon={Ticket} label="会員プラン"
                iconColor="text-emerald-700 bg-emerald-50"
                badge={subscriptionPlanName ? <Badge color="emerald">加入中</Badge> : undefined} />
            )}
            <NavItem href="/app/donations/new" icon={Gift} label="寄付する" iconColor="text-purple-600 bg-purple-50" />
          </NavSection>
        )}

        {/* アカウント設定 */}
        <NavSection title="設定">
          {isDanka && (
            <NavItem href="/app/mypage/danka-info" icon={ClipboardList} label="檀家情報" iconColor="text-amber-700 bg-amber-50" />
          )}
          <NavItem href="/app/mypage/display" icon={Settings} label="表示設定" iconColor="text-stone-600 bg-stone-100" />
          <NavItem href="/app/mypage/notifications" icon={Bell} label="通知設定" iconColor="text-sky-600 bg-sky-50" />
          <NavItem
            href="/app/mypage/line"
            icon={Smartphone}
            label="LINE連携"
            iconColor="text-green-600 bg-green-50"
            badge={
              lineLinked
                ? <Badge color="green">連携済み</Badge>
                : <Badge color="amber">未連携</Badge>
            }
          />
        </NavSection>

        {/* ご縁さん：檀家昇格申請 */}
        {isGoen && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 space-y-3">
            <div>
              <h2 className="font-bold text-stone-800">檀家として登録する</h2>
              <p className="text-xs text-stone-500 mt-1">
                このお寺の檀家としてご登録を希望される場合は、申請してください。
              </p>
            </div>
            {promoteMsg ? (
              <p className="text-sm text-emerald-600 font-medium">{promoteMsg}</p>
            ) : (
              <button
                type="button"
                onClick={handlePromoteRequest}
                disabled={promoteLoading}
                className="w-full py-2.5 bg-amber-700 text-white text-sm font-semibold rounded-xl hover:bg-amber-800 disabled:opacity-40 transition-colors shadow-sm"
              >
                {promoteLoading ? "申請中…" : "檀家登録を申請する"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── 共通コンポーネント ──────────────────────────────────────

function NavSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
      <p className="text-[10px] font-bold text-stone-400 px-4 pt-3.5 pb-1.5 uppercase tracking-widest">
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
      <span className="flex items-center gap-3 text-sm text-stone-700">
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

function Badge({ color, children }: { color: "emerald" | "green" | "amber"; children: React.ReactNode }) {
  const colors = {
    emerald: "text-emerald-600 bg-emerald-50 border border-emerald-200",
    green: "text-green-600 bg-green-50 border border-green-200",
    amber: "text-amber-600 bg-amber-50 border border-amber-200",
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${colors[color]}`}>
      {children}
    </span>
  );
}
