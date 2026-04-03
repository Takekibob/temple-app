import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { AnnouncementTarget } from "@/generated/prisma/enums";
import { getCategoryLabel } from "@/lib/eventCategories";
import GoenCtaBanner from "@/components/app/GoenCtaBanner";
import {
  CalendarDays, BookOpen, ScrollText, Coins, Heart, Gift,
  Newspaper, MapPin, Ticket, ChevronRight, Clock, Lock, Bell,
} from "lucide-react";

const RESERVATION_TYPE_LABELS: Record<string, string> = {
  ANNUAL_MEMORIAL: "年忌法要",
  MONTHLY_MEMORIAL: "月命日",
  NIBON: "初盆・お盆",
  KUYO: "供養",
  FUNERAL: "葬儀",
  OTHER: "その他",
};

type QuickItem = {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
  href: string;
  color: string;
};

const DANKA_QUICK: QuickItem[] = [
  { icon: CalendarDays, label: "法要予約",      href: "/app/reservations",  color: "bg-amber-50 text-amber-700" },
  { icon: MapPin,       label: "お気に入りの寺院", href: "/app/temples",     color: "bg-teal-50 text-teal-700" },
  { icon: BookOpen,     label: "イベント",      href: "/app/events",        color: "bg-sky-50 text-sky-600" },
  { icon: Heart,        label: "参加予定",      href: "/app/events/my",     color: "bg-rose-50 text-rose-600" },
  { icon: Coins,        label: "お布施",        href: "/app/ofuse",         color: "bg-yellow-50 text-yellow-700" },
  { icon: ScrollText,   label: "過去帳",        href: "/app/deceased",      color: "bg-stone-50 text-stone-600" },
];

const GOEN_QUICK_BASE: QuickItem[] = [
  { icon: BookOpen,    label: "イベント",    href: "/app/events",       color: "bg-teal-50 text-teal-700" },
  { icon: Newspaper,   label: "ブログ",      href: "/app/blog",         color: "bg-amber-50 text-amber-700" },
  { icon: CalendarDays,label: "カレンダー",  href: "/app/calendar",     color: "bg-sky-50 text-sky-600" },
  { icon: Heart,       label: "参加予定",    href: "/app/events/my",    color: "bg-rose-50 text-rose-600" },
  { icon: Gift,        label: "寄付",        href: "/app/donations",    color: "bg-purple-50 text-purple-600" },
];

const GOEN_QUICK_SUBSCRIBED: QuickItem[] = [
  { icon: BookOpen,    label: "イベント",    href: "/app/events",       color: "bg-teal-50 text-teal-700" },
  { icon: Newspaper,   label: "ブログ",      href: "/app/blog",         color: "bg-amber-50 text-amber-700" },
  { icon: CalendarDays,label: "カレンダー",  href: "/app/calendar",     color: "bg-sky-50 text-sky-600" },
  { icon: Ticket,      label: "会員プラン",  href: "/app/subscriptions",color: "bg-emerald-50 text-emerald-700" },
  { icon: Heart,       label: "参加予定",    href: "/app/events/my",    color: "bg-rose-50 text-rose-600" },
  { icon: Gift,        label: "寄付",        href: "/app/donations",    color: "bg-purple-50 text-purple-600" },
];

function getGoenQuickFree(templeId: string | null | undefined): QuickItem[] {
  return [
    ...GOEN_QUICK_BASE,
    { icon: MapPin, label: "お寺について", href: templeId ? `/app/temples/${templeId}` : "/app/events", color: "bg-stone-50 text-stone-600" },
  ];
}

export default async function AppHomePage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");

  const isDanka = authUser.member?.type === "DANKA";
  const isGoen = authUser.member?.type === "GOEN";
  const now = new Date();

  const hasSubscription =
    isGoen && authUser.member
      ? await prisma.memberSubscription
          .findFirst({
            where: { memberId: authUser.member.id, status: "ACTIVE", templeId: authUser.templeId },
            include: { plan: { select: { name: true } } },
          })
          .then((s) => s ?? null)
      : null;

  const isSubscribed = !!hasSubscription;

  const exclusivePreview = isGoen
    ? await Promise.all([
        prisma.blogPost.findFirst({
          where: { templeId: authUser.templeId, isSubscriberOnly: true, status: "PUBLISHED" },
          orderBy: { publishedAt: "desc" },
          select: { id: true, title: true },
        }),
        prisma.event.findFirst({
          where: {
            templeId: authUser.templeId,
            visibility: "SUBSCRIBERS_ONLY",
            status: "PUBLISHED",
            eventDate: { gte: now },
          },
          orderBy: { eventDate: "asc" },
          select: { id: true, title: true, eventDate: true },
        }),
      ])
    : null;

  const nextReservation =
    isDanka && authUser.member
      ? await prisma.reservation.findFirst({
          where: {
            memberId: authUser.member.id,
            scheduledAt: { gte: now },
            status: { in: ["PENDING", "CONFIRMED"] },
          },
          orderBy: { scheduledAt: "asc" },
        })
      : null;

  const upcomingParticipations = authUser.member
    ? await prisma.eventParticipation.findMany({
        where: {
          memberId: authUser.member.id,
          status: { in: ["APPLIED", "CONFIRMED"] },
          event: { eventDate: { gte: now } },
        },
        include: {
          event: { select: { id: true, title: true, eventDate: true, startTime: true, category: true } },
        },
        orderBy: { event: { eventDate: "asc" } },
        take: 3,
      })
    : [];

  const memberType = authUser.member?.type;
  const featuredEvents = await prisma.event.findMany({
    where: {
      templeId: authUser.templeId,
      status: "PUBLISHED",
      eventDate: { gte: now },
      visibility:
        memberType === "DANKA"
          ? { in: ["PUBLIC", "MEMBERS_ONLY", "DANKA_ONLY"] }
          : memberType === "GOEN"
          ? { in: ["PUBLIC", "MEMBERS_ONLY"] }
          : "PUBLIC",
      ...(authUser.member
        ? { participations: { none: { memberId: authUser.member.id, status: { notIn: ["CANCELLED"] } } } }
        : {}),
    },
    orderBy: { eventDate: "asc" },
    take: 3,
  });

  const allowedSegments: AnnouncementTarget[] =
    memberType === "DANKA" ? ["ALL", "DANKA"] : memberType === "GOEN" ? ["ALL", "GOEN"] : ["ALL"];

  const latestNews = await prisma.announcement.findMany({
    where: {
      templeId: authUser.templeId,
      publishedAt: { not: null, lte: now },
      OR: [
        { targetSegment: { in: allowedSegments }, memberId: null },
        ...(authUser.member ? [{ memberId: authUser.member.id }] : []),
      ],
    },
    orderBy: { publishedAt: "desc" },
    take: 3,
    select: { id: true, title: true, publishedAt: true },
  });

  const displayName = authUser.name;

  const quickItems: QuickItem[] = isDanka
    ? DANKA_QUICK
    : isSubscribed
    ? GOEN_QUICK_SUBSCRIBED
    : getGoenQuickFree(authUser.templeId);

  const [exclusiveBlog, exclusiveEvent] = exclusivePreview ?? [null, null];

  return (
    <div className="pb-28 max-w-lg mx-auto">
      {/* ヘッダー */}
      <div className="px-5 pt-6 pb-5">
        <p className="text-xs text-stone-400 font-medium mb-0.5">
          {isDanka ? "檀家" : isGoen ? "ご縁さん" : ""}
          {isGoen && isSubscribed && (
            <span className="ml-1.5 text-emerald-600 font-semibold">{hasSubscription.plan.name}</span>
          )}
        </p>
        <h1 className="text-2xl font-bold text-stone-800 tracking-tight">
          こんにちは、<span className="text-amber-800">{displayName}</span>さん
        </h1>
      </div>

      <div className="px-4 space-y-5">
        {/* クイックアクセス */}
        <div className="grid grid-cols-3 gap-2.5">
          {quickItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center gap-2 bg-white border border-stone-100 rounded-2xl py-4 shadow-sm hover:shadow-md hover:border-amber-200 hover:-translate-y-0.5 transition-all"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}>
                  <Icon size={20} strokeWidth={1.8} />
                </div>
                <span className="text-xs text-stone-600 font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* GOEN 未加入: CTA バナー */}
        {isGoen && !isSubscribed && <GoenCtaBanner />}

        {/* GOEN 加入済み: 会員限定コンテンツ */}
        {isGoen && isSubscribed && (exclusiveBlog || exclusiveEvent) && (
          <div className="bg-gradient-to-br from-amber-50 to-amber-100/60 border border-amber-200 rounded-2xl p-4">
            <p className="text-xs font-bold text-amber-800 mb-3 flex items-center gap-1.5">
              <span className="w-4 h-4 bg-amber-700 text-white rounded-full flex items-center justify-center text-[9px]">✓</span>
              会員限定コンテンツ
            </p>
            <div className="space-y-2">
              {exclusiveBlog && (
                <Link href={`/app/blog/${exclusiveBlog.id}`}
                  className="flex items-center gap-2.5 bg-white/70 rounded-xl px-3 py-2.5 hover:bg-white transition-colors">
                  <Newspaper size={14} className="text-amber-700 shrink-0" />
                  <span className="text-sm text-stone-700 truncate">{exclusiveBlog.title}</span>
                  <ChevronRight size={14} className="text-stone-300 ml-auto shrink-0" />
                </Link>
              )}
              {exclusiveEvent && (
                <Link href={`/app/events/${exclusiveEvent.id}`}
                  className="flex items-center gap-2.5 bg-white/70 rounded-xl px-3 py-2.5 hover:bg-white transition-colors">
                  <BookOpen size={14} className="text-amber-700 shrink-0" />
                  <span className="text-sm text-stone-700 truncate">{exclusiveEvent.title}</span>
                  <span className="text-xs text-stone-400 shrink-0 ml-auto">
                    {exclusiveEvent.eventDate.toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}
                  </span>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* GOEN 未加入: ロックコンテンツ */}
        {isGoen && !isSubscribed && (exclusiveBlog || exclusiveEvent) && (
          <div className="border border-stone-200 rounded-2xl p-4 bg-stone-50">
            <p className="text-xs font-semibold text-stone-400 mb-3 flex items-center gap-1.5">
              <Lock size={12} />
              会員限定コンテンツ
            </p>
            <div className="space-y-2">
              {exclusiveBlog && (
                <div className="flex items-center gap-2.5 bg-white rounded-xl px-3 py-2.5">
                  <Newspaper size={14} className="text-stone-300 shrink-0" />
                  <span className="text-sm text-stone-300 truncate blur-sm select-none">{exclusiveBlog.title}</span>
                </div>
              )}
              {exclusiveEvent && (
                <div className="flex items-center gap-2.5 bg-white rounded-xl px-3 py-2.5">
                  <BookOpen size={14} className="text-stone-300 shrink-0" />
                  <span className="text-sm text-stone-300 truncate blur-sm select-none">{exclusiveEvent.title}</span>
                </div>
              )}
            </div>
            <Link href="/app/subscriptions"
              className="mt-3 inline-block text-xs text-amber-700 font-semibold hover:underline">
              会員登録で読める →
            </Link>
          </div>
        )}

        {/* 檀家: 次回法要予約 */}
        {isDanka && (
          <section>
            <SectionHeader title="次回の法要予約" moreHref="/app/reservations" moreLabel="一覧" />
            {nextReservation ? (
              <Link href={`/app/reservations/${nextReservation.id}`}
                className="block bg-gradient-to-br from-amber-700 to-amber-800 rounded-2xl p-4 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-amber-200 text-xs font-medium mb-1">
                      {nextReservation.scheduledAt.toLocaleDateString("ja-JP", {
                        year: "numeric", month: "long", day: "numeric", weekday: "short",
                      })}
                    </p>
                    <p className="text-xl font-bold">
                      {RESERVATION_TYPE_LABELS[nextReservation.type] ?? nextReservation.type}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Clock size={12} className="text-amber-200" />
                      <p className="text-amber-100 text-xs">
                        {nextReservation.scheduledAt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}〜
                      </p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    nextReservation.status === "CONFIRMED"
                      ? "bg-white/20 text-white"
                      : "bg-amber-600/50 text-amber-100"
                  }`}>
                    {nextReservation.status === "CONFIRMED" ? "確定済み" : "確認待ち"}
                  </span>
                </div>
              </Link>
            ) : (
              <div className="bg-white border border-stone-100 rounded-2xl p-5 text-center shadow-sm">
                <CalendarDays size={28} className="text-stone-200 mx-auto mb-2" />
                <p className="text-sm text-stone-400 mb-2">予定している法要はありません</p>
                <Link href="/app/reservations/new"
                  className="text-xs text-amber-700 font-semibold hover:underline">
                  法要を予約する →
                </Link>
              </div>
            )}
          </section>
        )}

        {/* 参加予定のイベント */}
        {upcomingParticipations.length > 0 && (
          <section>
            <SectionHeader title="参加予定のイベント" moreHref="/app/events/my" moreLabel="すべて" />
            <div className="space-y-2">
              {upcomingParticipations.map((p) => (
                <Link key={p.id} href={`/app/events/${p.event.id}`}
                  className="flex items-center gap-3 bg-white border border-stone-100 rounded-xl px-4 py-3 shadow-sm hover:border-amber-200 hover:shadow-md transition-all">
                  <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center shrink-0">
                    <Heart size={16} className="text-rose-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-amber-700 font-medium">{getCategoryLabel(p.event.category)}</p>
                    <p className="text-sm font-semibold text-stone-800 truncate">{p.event.title}</p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {p.event.eventDate.toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}
                      {" "}{p.event.startTime}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-stone-300 shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 次回の行事 */}
        {featuredEvents.length > 0 && (
          <section>
            <SectionHeader title="次回の行事" moreHref="/app/events" moreLabel="すべて" />
            {/* ヒーローカード：直近1件 */}
            <Link href={`/app/events/${featuredEvents[0].id}`}
              className="block bg-gradient-to-br from-teal-600 to-teal-800 rounded-2xl p-4 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-teal-200 text-xs font-medium mb-1">
                    {featuredEvents[0].eventDate.toLocaleDateString("ja-JP", {
                      year: "numeric", month: "long", day: "numeric", weekday: "short",
                    })}
                  </p>
                  <p className="text-xl font-bold leading-snug">{featuredEvents[0].title}</p>
                  {featuredEvents[0].startTime && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Clock size={12} className="text-teal-200" />
                      <p className="text-teal-100 text-xs">{featuredEvents[0].startTime}〜</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="bg-white/20 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                    {getCategoryLabel(featuredEvents[0].category)}
                  </span>
                  <span className="text-teal-100 text-xs font-bold">
                    {featuredEvents[0].fee === 0 ? "無料" : `¥${featuredEvents[0].fee.toLocaleString()}`}
                  </span>
                </div>
              </div>
            </Link>
            {/* 残りのイベント */}
            {featuredEvents.length > 1 && (
              <div className="space-y-2 mt-2">
                {featuredEvents.slice(1).map((e) => (
                  <Link key={e.id} href={`/app/events/${e.id}`}
                    className="flex items-center gap-3 bg-white border border-stone-100 rounded-xl px-4 py-3 shadow-sm hover:border-teal-200 hover:shadow-md transition-all">
                    <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center shrink-0">
                      <BookOpen size={16} className="text-teal-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-teal-700 font-medium">{getCategoryLabel(e.category)}</p>
                      <p className="text-sm font-semibold text-stone-800 truncate">{e.title}</p>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {e.eventDate.toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}
                        {" "}{e.startTime}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-stone-300 shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {/* お知らせ */}
        {latestNews.length > 0 && (
          <section>
            <SectionHeader title="お知らせ" moreHref="/app/news" moreLabel="すべて" />
            <div className="space-y-2">
              {latestNews.map((n) => (
                <Link key={n.id} href={`/app/news/${n.id}`}
                  className="flex items-center gap-3 bg-white border border-stone-100 rounded-xl px-4 py-3.5 shadow-sm hover:border-amber-200 hover:shadow-md transition-all">
                  <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center shrink-0">
                    <Bell size={14} className="text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-stone-700 font-medium truncate">{n.title}</p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {n.publishedAt!.toLocaleDateString("ja-JP", { month: "long", day: "numeric" })}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-stone-300 shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title, moreHref, moreLabel }: { title: string; moreHref: string; moreLabel: string }) {
  return (
    <div className="flex items-center justify-between mb-2.5">
      <h2 className="text-sm font-bold text-stone-700">{title}</h2>
      <Link href={moreHref} className="text-xs text-amber-700 font-medium hover:underline flex items-center gap-0.5">
        {moreLabel}<ChevronRight size={12} />
      </Link>
    </div>
  );
}
