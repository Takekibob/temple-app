import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCategoryLabel } from "@/lib/eventCategories";
import { getMoodIcon, getMoodLabel } from "@/lib/journalMoods";
import MonthlyShareButton from "./MonthlyShareButton";
import {
  Pencil, PenLine, CalendarCheck, Building2, ChevronRight,
} from "lucide-react";

function calcStreak(entryDates: Date[]): number {
  const unique = Array.from(new Set(entryDates.map((d) => new Date(d).toDateString())))
    .map((s) => new Date(s))
    .sort((a, b) => b.getTime() - a.getTime());
  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < unique.length; i++) {
    const expected = new Date(today);
    expected.setDate(today.getDate() - i);
    if (unique[i].toDateString() === expected.toDateString()) streak++;
    else break;
  }
  return streak;
}

export default async function MyPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");

  const userId = authUser.id;
  const memberId = authUser.member?.id;

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [
    allJournalDates,
    thisMonthJournalCount,
    thisMonthEventCount,
    followedTemples,
    recentJournals,
    pastEvents,
    totalEventCount,
    thisMonthJournalTags,
  ] = await Promise.all([
    prisma.journal.findMany({ where: { userId }, select: { entryDate: true } }),
    prisma.journal.count({ where: { userId, entryDate: { gte: thisMonthStart } } }),
    memberId
      ? prisma.eventParticipation.count({
          where: { memberId, status: { in: ["APPLIED", "CONFIRMED"] }, event: { eventDate: { gte: thisMonthStart, lte: now } } },
        })
      : Promise.resolve(0),
    memberId
      ? prisma.memberFavoriteTemple.findMany({
          where: { memberId },
          include: { temple: { select: { id: true, name: true, denomination: true, logoUrl: true } } },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    prisma.journal.findMany({
      where: { userId },
      select: { id: true, title: true, content: true, mood: true, tags: true, entryDate: true },
      orderBy: { entryDate: "desc" },
      take: 3,
    }),
    memberId
      ? prisma.eventParticipation.findMany({
          where: { memberId, status: { in: ["APPLIED", "CONFIRMED"] }, event: { eventDate: { gte: sixMonthsAgo, lte: now } } },
          include: {
            event: {
              select: {
                id: true, title: true, eventDate: true, startTime: true, category: true,
                temple: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { event: { eventDate: "desc" } },
          take: 10,
        })
      : Promise.resolve([]),
    memberId
      ? prisma.eventParticipation.count({ where: { memberId, status: { in: ["APPLIED", "CONFIRMED"] } } })
      : Promise.resolve(0),
    prisma.journal.findMany({
      where: { userId, entryDate: { gte: thisMonthStart } },
      select: { tags: true },
    }),
  ]);

  // 今月のトップタグ（3件）
  const tagCounts = new Map<string, number>();
  for (const j of thisMonthJournalTags) {
    for (const tag of j.tags) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  }
  const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);

  const streakDays = calcStreak(allJournalDates.map((j) => j.entryDate));
  const daysSinceJoined = Math.floor((now.getTime() - new Date(authUser.createdAt).getTime()) / (1000 * 60 * 60 * 24));

  const DAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

  return (
    <div className="pb-28 max-w-lg mx-auto">
      {/* ─── ヘッダー ─── */}
      <div className="px-5 pt-6 pb-5">
        <p className="font-serif text-[11px] text-ink-tertiary tracking-section mb-3">あなたのてらログ</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-paper-soft shrink-0 relative">
              {authUser.avatarUrl ? (
                <Image src={authUser.avatarUrl} alt={authUser.name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-serif text-2xl text-ink-secondary">
                  {authUser.name.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <p className="font-serif text-lg text-ink font-medium">{authUser.name}</p>
              <p className="font-serif text-[11px] text-ink-tertiary font-light mt-0.5">
                {now.getFullYear()}年{now.getMonth() + 1}月のあなた
              </p>
            </div>
          </div>
          <Link
            href="/app/settings/profile"
            className="flex items-center gap-1 font-serif text-[11px] text-ink-tertiary tracking-section border-b-[0.5px] border-border"
          >
            <Pencil size={10} />
            編集
          </Link>
        </div>
      </div>

      <div className="px-5 space-y-8">
        {/* ─── 今月のサマリー ─── */}
        <section>
          <SectionLabel>今 月 の ま と め</SectionLabel>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <SummaryCard
              icon={<PenLine size={16} className="text-ink-secondary" />}
              count={thisMonthJournalCount}
              label="日記"
              href="/app/journal"
            />
            <SummaryCard
              icon={<CalendarCheck size={16} className="text-ink-secondary" />}
              count={thisMonthEventCount}
              label="参加した集い"
              href="/app/events/my"
            />
            <SummaryCard
              icon={<Building2 size={16} className="text-ink-secondary" />}
              count={followedTemples.length}
              label="フォロー中"
              href="/app/temples"
            />
          </div>
          <div className="mt-4">
            <MonthlyShareButton
              year={now.getFullYear()}
              month={now.getMonth() + 1}
              journalCount={thisMonthJournalCount}
              eventCount={thisMonthEventCount}
              topTags={topTags}
            />
          </div>
        </section>

        {/* ─── 最近の記録 ─── */}
        <section>
          <SectionHeaderLink label="最 近 の 記 録" href="/app/journal" moreLabel="すべて見る" />
          {recentJournals.length === 0 ? (
            <EmptyState
              message="まだ記録がありません"
              action={{ label: "最初の記録を書く", href: "/app/journal/new" }}
            />
          ) : (
            <div className="mt-3">
              {recentJournals.map((j) => {
                const d = new Date(j.entryDate);
                const excerpt = j.content.replace(/[#*`>\-\[\]!\n]/g, " ").trim().slice(0, 80);
                return (
                  <Link
                    key={j.id}
                    href={`/app/journal/${j.id}`}
                    className="block py-3.5"
                    style={{ borderBottom: "0.5px solid var(--color-border-thin)" }}
                  >
                    <div className="flex items-baseline justify-between mb-1">
                      <time className="font-sans text-[11px] text-ink-tertiary">
                        {d.getMonth() + 1}.{d.getDate()} {DAYS[d.getDay()]}
                      </time>
                      {j.mood && (
                        <span className="font-serif text-[11px] text-ink-tertiary">
                          {getMoodIcon(j.mood)} {getMoodLabel(j.mood)}
                        </span>
                      )}
                    </div>
                    {j.title && (
                      <p className="font-serif text-sm text-ink font-light truncate mb-0.5">{j.title}</p>
                    )}
                    <p className="font-serif text-xs text-ink-secondary font-light leading-relaxed line-clamp-2">
                      {excerpt || "（本文なし）"}
                    </p>
                    {j.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {j.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="font-sans text-[10px] text-ink-tertiary bg-paper-soft px-1.5 py-0.5">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* ─── 参加した集い ─── */}
        <section>
          <SectionHeaderLink label="参 加 し た 集 い" href="/app/events/my" moreLabel="すべて見る" />
          {pastEvents.length === 0 ? (
            <EmptyState
              message="過去6ヶ月の参加記録がありません"
              action={{ label: "イベントを探す", href: "/app/events" }}
            />
          ) : (
            <div className="mt-3">
              {pastEvents.map((p) => {
                const d = new Date(p.event.eventDate);
                return (
                  <Link
                    key={p.event.id}
                    href={`/app/events/${p.event.id}`}
                    className="flex items-center justify-between py-3.5"
                    style={{ borderBottom: "0.5px solid var(--color-border-thin)" }}
                  >
                    <div className="flex-1 min-w-0 pr-3">
                      <p className="font-serif text-[11px] text-ink-tertiary tracking-section mb-0.5">
                        {d.getMonth() + 1}.{d.getDate()} {DAYS[d.getDay()]}
                        {p.event.startTime && ` · ${p.event.startTime}`}
                        {p.event.temple && (
                          <span className="ml-2">{p.event.temple.name}</span>
                        )}
                      </p>
                      <p className="font-serif text-sm text-ink font-light truncate">{p.event.title}</p>
                      <p className="font-serif text-[11px] text-ink-tertiary font-light mt-0.5">
                        {getCategoryLabel(p.event.category)}
                      </p>
                    </div>
                    <ChevronRight size={14} className="text-ink-tertiary shrink-0" />
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* ─── フォロー中のお寺 ─── */}
        <section>
          <SectionHeaderLink label="フォロー中のお寺" href="/app/temples" moreLabel="すべて見る" />
          {followedTemples.length === 0 ? (
            <EmptyState
              message="まだお寺をフォローしていません"
              action={{ label: "お寺を探す", href: "/app/temples" }}
            />
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 mt-3 -mx-5 px-5">
              {followedTemples.map((f) => (
                <Link
                  key={f.temple.id}
                  href={`/app/temples/${f.temple.id}`}
                  className="flex-shrink-0 w-32 bg-paper border-[0.5px] border-border p-3"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-paper-soft mb-2 relative">
                    {f.temple.logoUrl ? (
                      <Image src={f.temple.logoUrl} alt={f.temple.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-serif text-lg text-ink-tertiary">
                        {f.temple.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <p className="font-serif text-xs text-ink font-light leading-snug line-clamp-2">{f.temple.name}</p>
                  {f.temple.denomination && (
                    <p className="font-serif text-[10px] text-ink-tertiary mt-1">{f.temple.denomination}</p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ─── 積み重ね ─── */}
        <section>
          <SectionLabel>積 み 重 ね</SectionLabel>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <StatCard count={totalEventCount} label="累計参加回数" unit="回" />
            <StatCard count={streakDays} label="日記連続日数" unit="日" />
            <StatCard count={daysSinceJoined} label="利用開始から" unit="日" />
          </div>
        </section>

        {/* ─── 設定リンク ─── */}
        <div className="pt-2" style={{ borderTop: "0.5px solid var(--color-border)" }}>
          <Link
            href="/app/settings"
            className="font-serif text-[11px] text-ink-tertiary tracking-section"
          >
            設定 →
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── 共通小コンポーネント ──────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-serif text-[11px] text-ink-tertiary tracking-section">{children}</p>
  );
}

function SectionHeaderLink({ label, href, moreLabel }: { label: string; href: string; moreLabel: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <SectionLabel>{label}</SectionLabel>
      <Link href={href} className="font-serif text-[11px] text-ink-tertiary tracking-section flex items-center gap-0.5">
        {moreLabel}<ChevronRight size={11} />
      </Link>
    </div>
  );
}

function SummaryCard({
  icon, count, label, href,
}: { icon: React.ReactNode; count: number; label: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center py-4 bg-paper border-[0.5px] border-border gap-1.5"
    >
      {icon}
      <span className="font-serif text-2xl text-ink font-light">{count}</span>
      <span className="font-serif text-[10px] text-ink-tertiary tracking-section text-center leading-snug">
        {label}
      </span>
    </Link>
  );
}

function StatCard({ count, label, unit }: { count: number; label: string; unit: string }) {
  return (
    <div className="flex flex-col items-center py-4 bg-paper-soft gap-1">
      <span className="font-serif text-2xl text-ink font-light">
        {count.toLocaleString()}
      </span>
      <span className="font-sans text-[10px] text-ink-tertiary">{unit}</span>
      <span className="font-serif text-[10px] text-ink-tertiary text-center leading-snug px-1">
        {label}
      </span>
    </div>
  );
}

function EmptyState({ message, action }: { message: string; action: { label: string; href: string } }) {
  return (
    <div className="py-8 text-center mt-3">
      <p className="font-serif text-sm text-ink-tertiary font-light mb-3">{message}</p>
      <Link href={action.href} className="font-serif text-sm text-ink font-light border-b-[0.5px] border-ink">
        {action.label}
      </Link>
    </div>
  );
}
