"use client";

import { useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { logout } from "@/app/auth/actions";
import {
  Bell, Smartphone, ChevronRight, LogOut, Pencil, MapPin,
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
    <div className="pb-28 max-w-lg mx-auto">
      {/* ヘッダー */}
      <div className="px-5 pt-6 pb-5 flex items-center justify-between">
        <p className="font-serif text-[11px] text-ink-tertiary tracking-section">設 定</p>
        <button
          onClick={() => startLogoutTransition(async () => { await logout(); })}
          disabled={isLogoutPending}
          className="flex items-center gap-1 font-serif text-[11px] text-ink-tertiary hover:text-ink transition-colors"
        >
          <LogOut size={11} />
          {isLogoutPending ? "…" : "ログアウト"}
        </button>
      </div>

      <div className="px-5 space-y-6">
        {/* プロフィール */}
        <section>
          <SectionLabel>プロフィール</SectionLabel>
          <div
            className="bg-paper mt-3 flex items-center gap-3.5 px-4 py-3.5"
            style={{ border: "0.5px solid var(--color-border)" }}
          >
            <div className="w-12 h-12 overflow-hidden bg-paper-soft shrink-0 relative">
              {user.avatarUrl ? (
                <Image src={user.avatarUrl} alt={user.name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-serif text-xl text-ink-secondary">
                  {user.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-serif text-sm text-ink font-medium">{user.name}</p>
              <p className="font-serif text-xs text-ink-tertiary truncate mt-0.5">{user.email}</p>
            </div>
            <Link
              href="/app/settings/profile"
              className="shrink-0 flex items-center gap-1 font-serif text-[11px] text-ink-tertiary tracking-section border-b-[0.5px] border-border"
            >
              <Pencil size={10} />
              編集
            </Link>
          </div>
        </section>

        {/* 通知・LINE */}
        <section>
          <SectionLabel>通知・LINE</SectionLabel>
          <div className="mt-3" style={{ border: "0.5px solid var(--color-border)" }}>
            <NavItem
              href="/app/settings/line"
              icon={Smartphone}
              label="LINE 連携"
              badge={
                lineLinked
                  ? <Badge variant="linked">連携済み</Badge>
                  : <Badge variant="unlinked">未連携</Badge>
              }
            />
            <div style={{ borderTop: "0.5px solid var(--color-border-thin)" }}>
              <NavItem
                href="/app/settings/notifications"
                icon={Bell}
                label="通知設定"
              />
            </div>
          </div>
        </section>

        {/* お寺との繋がり */}
        <section>
          <SectionLabel>お寺との繋がり</SectionLabel>
          <div className="mt-3" style={{ border: "0.5px solid var(--color-border)" }}>
            <NavItem
              href={templeId ? `/app/temples/${templeId}` : "/app/temples?tab=following"}
              icon={MapPin}
              label={templeId ? "所属寺院について" : "フォロー中のお寺"}
            />
          </div>
        </section>
      </div>
    </div>
  );
}

// ── 共通コンポーネント ──────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-serif text-[11px] text-ink-tertiary tracking-section">{children}</p>
  );
}

function NavItem({
  href, icon: Icon, label, badge,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
  badge?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between bg-paper px-4 py-3.5 hover:bg-paper-soft transition-colors"
    >
      <span className="flex items-center gap-3">
        <Icon size={14} strokeWidth={1.6} className="text-ink-secondary" />
        <span className="font-serif text-sm text-ink font-light">{label}</span>
      </span>
      <span className="flex items-center gap-2">
        {badge}
        <ChevronRight size={13} className="text-ink-tertiary" />
      </span>
    </Link>
  );
}

function Badge({ variant, children }: { variant: "linked" | "unlinked"; children: React.ReactNode }) {
  return (
    <span
      className={`font-sans text-[10px] px-2 py-0.5 ${
        variant === "linked" ? "text-ink-secondary bg-paper-soft" : "text-ink-tertiary bg-paper-soft"
      }`}
      style={{ border: "0.5px solid var(--color-border)" }}
    >
      {children}
    </span>
  );
}
