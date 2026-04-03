import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { AnnouncementTarget } from "@/generated/prisma/enums";
import { getCategoryLabel } from "@/lib/eventCategories";
import GoenCtaBanner from "@/components/app/GoenCtaBanner";
import {
  CalendarDays, CalendarRange, BookOpen, Heart, Gift,
  Newspaper, MapPin, ChevronRight, Clock, Lock, Bell,
  Compass, Coins, Stamp,
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

// 同じ役割のアイテムはアイコン・色を統一
const DANKA_QUICK: QuickItem[] = [
  { icon: BookOpen,      label: "イベント",   href: "/app/events",          color: "bg-sky-50 text-sky-600" },
  { icon: CalendarDays,  label: "法要予約",   href: "/app/reservations",    color: "bg-amber-50 text-amber-700" },
  { icon: CalendarRange, label: "カレンダー", href: "/app/calendar",        color: "bg-violet-50 text-violet-600" },
  { icon: Bell,          label: "お知らせ",   href: "/app/news",            color: "bg-orange-50 text-orange-600" },
  { icon: Coins,         label: "お布施",     href: "/app/ofuse",           color: "bg-yellow-50 text-yellow-700" },
  { icon: Stamp,         label: "参拝記録",   href: "/app/temples/visit",   color: "bg-teal-50 text-teal-600" },
];

const GOEN_QUICK: QuickItem[] = [
  { icon: BookOpen,      label: "イベント",   href: "/app/events",          color: "bg-sky-50 text-sky-600" },
  { icon: Bell,          label: "お知らせ",   href: "/app/news",            color: "bg-orange-50 text-orange-600" },
  { icon: CalendarRange, label: "カレンダー", href: "/app/calendar",        color: "bg-violet-50 text-violet-600" },
  { icon: Compass,       label: "お寺を探す", href: "/app/temples",         color: "bg-sky-50 text-sky-600" },
  { icon: Stamp,         label: "参拝記録",   href: "/app/temples/visit",   color: "bg-teal-50 text-teal-600" },
  { icon: Gift,          label: "寄付",       href: "/app/donations/new",   color: "bg-purple-50 text-purple-600" },
];

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

  // GOEN: フォロー中寺院 + イベント + ブログ + 発見用お寺
  const goenFollowedTempleIds: string[] = isGoen && authUser.member
    ? await prisma.memberFavoriteTemple
        .findMany({ where: { memberId: authUser.member.id }, select: { templeId: true } })
        .then((favs) => favs.map((f) => f.templeId))
    : [];

  const allGoenTempleIds = isGoen
    ? Array.from(new Set([...(authUser.templeId ? [authUser.templeId] : []), ...goenFollowedTempleIds]))
    : [];

  const goenEvents = isGoen && allGoenTempleIds.length > 0 && authUser.member
    ? await prisma.event.findMany({
        where: {
          templeId: { in: allGoenTempleIds },
          status: "PUBLISHED",
          eventDate: { gte: now },
          visibility: { in: ["PUBLIC", "MEMBERS_ONLY"] },
          participations: { none: { memberId: authUser.member.id, status: { notIn: ["CANCELLED"] } } },
        },
        select: {
          id: true, title: true, eventDate: true, startTime: true, category: true, fee: true,
          temple: { select: { name: true } },
        },
        orderBy: { eventDate: "asc" },
        take: 5,
      })
    : [];

  const goenBlogPosts = isGoen && allGoenTempleIds.length > 0
    ? await prisma.blogPost.findMany({
        where: {
          templeId: { in: allGoenTempleIds },
          status: "PUBLISHED",
          publishedAt: { lte: now },
          isSubscriberOnly: false,
        },
        select: {
          id: true, title: true, publishedAt: true,
          temple: { select: { name: true } },
        },
        orderBy: { publishedAt: "desc" },
        take: 3,
      })
    : [];

  const discoveryTemples = isGoen && goenFollowedTempleIds.length === 0
    ? await prisma.temple.findMany({
        where: { isActive: true, ...(authUser.templeId ? { id: { not: authUser.templeId } } : {}) },
        take: 4,
        select: { id: true, name: true, denomination: true, logoUrl: true, address: true },
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

  const quickItems: QuickItem[] = isDanka ? DANKA_QUICK : GOEN_QUICK;

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

        {/* GOEN: フォロー0件 — お寺発見セクション */}
        {isGoen && goenFollowedTempleIds.length === 0 && (
          <section>
            <SectionHeader title="お寺を見つけよう" moreHref="/app/temples" moreLabel="すべて見る" />
            <Link
              href="/app/temples"
              className="flex items-center gap-4 bg-gradient-to-r from-teal-50 to-amber-50 rounded-2xl border border-teal-100 px-4 py-4 hover:shadow-md transition-all mb-2"
            >
              <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
                <MapPin size={20} className="text-teal-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-stone-800">近くのお寺を探そう</p>
                <p className="text-xs text-stone-500 mt-0.5">フォローするとイベントやブログが届きます</p>
              </div>
              <span className="shrink-0 text-xs font-semibold text-teal-700 bg-white px-3 py-1.5 rounded-full border border-teal-200 shadow-sm whitespace-nowrap">
                探す
              </span>
            </Link>
            {discoveryTemples.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {discoveryTemples.map((t) => (
                  <Link
                    key={t.id}
                    href={`/app/temples/${t.id}`}
                    className="bg-white border border-stone-100 rounded-xl p-3 hover:border-teal-200 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      {t.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={t.logoUrl} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-sm shrink-0">🏯</div>
                      )}
                      <p className="text-xs font-bold text-stone-800 truncate">{t.name}</p>
                    </div>
                    {t.denomination && (
                      <p className="text-[10px] text-amber-700 font-medium truncate">{t.denomination}</p>
                    )}
                    {t.address && (
                      <p className="text-[10px] text-stone-400 truncate mt-0.5">{t.address}</p>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {/* GOEN: フォロー中のお寺のイベント */}
        {isGoen && goenEvents.length > 0 && (
          <section>
            <SectionHeader title="フォロー中のお寺のイベント" moreHref="/app/events" moreLabel="すべて" />
            <div className="space-y-2">
              {goenEvents.map((e) => (
                <Link
                  key={e.id}
                  href={`/app/events/${e.id}`}
                  className="flex items-center gap-3 bg-white border border-stone-100 rounded-xl px-4 py-3 shadow-sm hover:border-teal-200 hover:shadow-md transition-all"
                >
                  <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center shrink-0">
                    <BookOpen size={16} className="text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-teal-700 font-medium">
                      {getCategoryLabel(e.category)}
                      <span className="text-stone-300 mx-1">·</span>
                      <span className="text-stone-400 font-normal">{e.temple.name}</span>
                    </p>
                    <p className="text-sm font-semibold text-stone-800 truncate">{e.title}</p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {e.eventDate.toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}
                      {e.startTime && ` ${e.startTime}`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                    <span className="text-xs font-bold text-amber-700">
                      {e.fee === 0 ? "無料" : `¥${e.fee.toLocaleString()}`}
                    </span>
                    <ChevronRight size={14} className="text-stone-300" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* GOEN: 最新ブログ */}
        {isGoen && goenBlogPosts.length > 0 && (
          <section>
            <SectionHeader title="最新ブログ" moreHref="/app/blog" moreLabel="すべて" />
            <div className="space-y-2">
              {goenBlogPosts.map((p) => (
                <Link
                  key={p.id}
                  href={`/app/blog/${p.id}`}
                  className="flex items-center gap-3 bg-white border border-stone-100 rounded-xl px-4 py-3 shadow-sm hover:border-amber-200 hover:shadow-md transition-all"
                >
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
                    <Newspaper size={16} className="text-amber-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-stone-400">
                      {p.publishedAt?.toLocaleDateString("ja-JP", { month: "long", day: "numeric" })}
                      <span className="mx-1 text-stone-300">·</span>
                      {p.temple.name}
                    </p>
                    <p className="text-sm font-semibold text-stone-800 truncate">{p.title}</p>
                  </div>
                  <ChevronRight size={14} className="text-stone-300 shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        )}

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

        {/* GOEN: フォロー中お寺のイベントがなければ全体から表示 */}
        {isGoen && goenEvents.length === 0 && featuredEvents.length > 0 && (
          <section>
            <SectionHeader title="今後のイベント" moreHref="/app/events" moreLabel="すべて" />
            <div className="space-y-2">
              {featuredEvents.map((e) => (
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
                      {e.startTime && ` ${e.startTime}`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                    <span className="text-xs font-bold text-amber-700">
                      {e.fee === 0 ? "無料" : `¥${e.fee.toLocaleString()}`}
                    </span>
                    <ChevronRight size={14} className="text-stone-300" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* GOEN: 法要について */}
        {isGoen && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
            <p className="text-xs font-bold text-amber-800 mb-1.5 flex items-center gap-1.5">
              <CalendarDays size={13} />
              法要・命日管理について
            </p>
            <p className="text-xs text-stone-600 leading-relaxed">
              年忌法要・月命日などの法要予約・過去帳管理は、檀家としてご登録された方のみご利用いただけます。詳しくはお寺にお問い合わせください。
            </p>
          </div>
        )}

        {/* 次回の行事（檀家のみ） */}
        {isDanka && featuredEvents.length > 0 && (
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
