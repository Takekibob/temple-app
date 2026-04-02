"use client";

import { useTransition, useState } from "react";
import Link from "next/link";
import { logout } from "@/app/auth/actions";

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
  const memberTypeLabel = isDanka ? "檀家" : isGoen ? "ご縁さん" : "—";

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
      <header className="bg-white border-b border-stone-100 px-4 py-4 flex items-center justify-between">
        <h1 className="text-lg font-bold text-stone-800">マイページ</h1>
        <button
          onClick={() => startLogoutTransition(async () => { await logout(); })}
          disabled={isLogoutPending}
          className="text-sm text-stone-500 hover:text-stone-700"
        >
          {isLogoutPending ? "…" : "ログアウト"}
        </button>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* プロフィールカード */}
        <div className="bg-white rounded-2xl border border-stone-100 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 font-bold text-lg shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-stone-800">{user.name}</p>
              <p className="text-sm text-stone-500 truncate">{user.email}</p>
            </div>
            <Link
              href="/app/mypage/profile"
              className="shrink-0 text-xs text-amber-700 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-50 transition-colors"
            >
              編集
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800 font-medium">
              {memberTypeLabel}
            </span>
            {isGoen && subscriptionPlanName && (
              <span className="text-xs px-2 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200 font-medium">
                ✅ {subscriptionPlanName}
              </span>
            )}
            {isGoen && !subscriptionPlanName && (
              <Link
                href="/app/subscriptions"
                className="text-xs px-2 py-1 rounded-full bg-stone-100 text-stone-500 hover:bg-amber-50 hover:text-amber-700 transition-colors"
              >
                会員プランなし →
              </Link>
            )}
          </div>
        </div>

        {/* サービス */}
        {member && (
          <NavSection title="サービス">
            <NavItem href="/app/subscriptions" icon="🎫" label="会員プラン"
              badge={subscriptionPlanName ? <span className="text-xs text-teal-600 font-medium">加入中</span> : undefined} />
            {templeId && <NavItem href={`/app/temples/${templeId}`} icon="🏯" label="お寺について" />}
            <NavItem href="/app/donations/new" icon="🎁" label="寄付する" />
          </NavSection>
        )}

        {/* 履歴・記録 */}
        {member && (
          <NavSection title="履歴・記録">
            <NavItem href="/app/events/my" icon="❤️" label="参加したイベント" />
            {isDanka && <NavItem href="/app/ofuse" icon="💰" label="お布施履歴" />}
            {isDanka && <NavItem href="/app/deceased" icon="📖" label="過去帳" />}
            <NavItem href="/app/donations" icon="🙏" label="寄付履歴" />
          </NavSection>
        )}

        {/* 設定 */}
        <NavSection title="設定">
          <NavItem href="/app/mypage/display" icon="🖥️" label="表示設定" />
          <NavItem href="/app/mypage/notifications" icon="🔔" label="通知設定" />
          {isDanka && <NavItem href="/app/mypage/danka-info" icon="📋" label="檀家情報" />}
          <NavItem
            href="/app/mypage/line"
            icon="💚"
            label="LINE設定"
            badge={
              lineLinked
                ? <span className="text-xs text-green-600 font-medium">連携済み</span>
                : <span className="text-xs text-amber-600 font-medium">未連携</span>
            }
          />
        </NavSection>

        {/* ご縁さん：檀家昇格申請 */}
        {isGoen && (
          <div className="bg-white rounded-2xl border border-stone-100 p-4 space-y-3">
            <h2 className="font-semibold text-stone-800">檀家として登録する</h2>
            <p className="text-sm text-stone-500">
              このお寺の檀家としてご登録を希望される場合は、申請してください。
            </p>
            {promoteMsg ? (
              <p className="text-sm text-green-600">{promoteMsg}</p>
            ) : (
              <button
                type="button"
                onClick={handlePromoteRequest}
                disabled={promoteLoading}
                className="w-full py-2.5 border border-amber-300 text-amber-700 text-sm rounded-xl hover:bg-amber-50 disabled:opacity-40 transition-colors"
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
    <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
      <p className="text-xs font-semibold text-stone-400 px-4 pt-4 pb-2 uppercase tracking-wider">
        {title}
      </p>
      <div className="divide-y divide-stone-50">{children}</div>
    </div>
  );
}

function NavItem({
  href, icon, label, badge,
}: {
  href: string;
  icon: string;
  label: string;
  badge?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between px-4 py-3.5 hover:bg-stone-50 transition-colors"
    >
      <span className="flex items-center gap-3 text-sm text-stone-700">
        <span className="text-lg w-6 text-center">{icon}</span>
        {label}
      </span>
      <span className="flex items-center gap-2">
        {badge}
        <span className="text-stone-300 text-sm">›</span>
      </span>
    </Link>
  );
}
