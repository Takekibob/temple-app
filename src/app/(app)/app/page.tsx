import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { AnnouncementTarget } from "@/generated/prisma/enums";
import { getCategoryLabel } from "@/lib/eventCategories";
import GoenCtaBanner from "@/components/app/GoenCtaBanner";

const RESERVATION_TYPE_LABELS: Record<string, string> = {
  ANNUAL_MEMORIAL: "年忌法要",
  MONTHLY_MEMORIAL: "月命日",
  NIBON: "初盆・お盆",
  KUYO: "供養",
  FUNERAL: "葬儀",
  OTHER: "その他",
};

// クイックアクセスアイテム定義
type QuickItem = { icon: string; label: string; href: string };

const DANKA_QUICK: QuickItem[] = [
  { icon: "📿", label: "法要予約", href: "/app/reservations" },
  { icon: "🗓", label: "カレンダー", href: "/app/calendar" },
  { icon: "📖", label: "過去帳", href: "/app/deceased" },
  { icon: "💰", label: "お布施", href: "/app/ofuse" },
  { icon: "❤️", label: "参加予定", href: "/app/events/my" },
  { icon: "🎁", label: "寄付", href: "/app/donations" },
];

const GOEN_QUICK_BASE: QuickItem[] = [
  { icon: "📅", label: "イベント", href: "/app/events" },
  { icon: "📝", label: "ブログ", href: "/app/blog" },
  { icon: "🗓", label: "カレンダー", href: "/app/calendar" },
  { icon: "❤️", label: "参加予定", href: "/app/events/my" },
  { icon: "🎁", label: "寄付", href: "/app/donations" },
];

const GOEN_QUICK_SUBSCRIBED: QuickItem[] = [
  { icon: "📅", label: "イベント", href: "/app/events" },
  { icon: "📝", label: "ブログ", href: "/app/blog" },
  { icon: "🗓", label: "カレンダー", href: "/app/calendar" },
  { icon: "🎫", label: "会員プラン", href: "/app/subscriptions" },
  { icon: "❤️", label: "参加予定", href: "/app/events/my" },
  { icon: "🎁", label: "寄付", href: "/app/donations" },
];

const GOEN_QUICK_FREE: QuickItem[] = [
  ...GOEN_QUICK_BASE,
  { icon: "🏯", label: "お寺について", href: "/app/temples" },
];

export default async function AppHomePage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");

  const isDanka = authUser.member?.type === "DANKA";
  const isGoen = authUser.member?.type === "GOEN";
  const now = new Date();

  // GOEN: このお寺の有効なサブスクリプション確認
  const hasSubscription =
    isGoen && authUser.member
      ? await prisma.memberSubscription
          .findFirst({
            where: {
              memberId: authUser.member.id,
              status: "ACTIVE",
              templeId: authUser.templeId,
            },
            include: { plan: { select: { name: true } } },
          })
          .then((s) => s ?? null)
      : null;

  const isSubscribed = !!hasSubscription;

  // GOEN 会員限定コンテンツのプレビュー（加入済み・未加入ともに取得）
  const exclusivePreview =
    isGoen
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

  // 次回予約（檀家のみ）
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

  // 申込済みイベント
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

  // 注目イベント（未申込）
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

  // 最新お知らせ
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

  const displayName = authUser.member?.familyName
    ? `${authUser.member.familyName}家`
    : authUser.name;

  // クイックアクセス items
  const quickItems: QuickItem[] = isDanka
    ? DANKA_QUICK
    : isSubscribed
    ? GOEN_QUICK_SUBSCRIBED
    : GOEN_QUICK_FREE;

  const [exclusiveBlog, exclusiveEvent] = exclusivePreview ?? [null, null];

  return (
    <div className="p-4 pb-24 max-w-lg mx-auto">
      {/* ヘッダー挨拶 */}
      <div className="mb-5 pt-2">
        <h1 className="text-xl font-bold text-stone-800">
          こんにちは、{displayName}さん
        </h1>
        {isGoen && isSubscribed && (
          <span className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
            ✅ {hasSubscription.plan.name}
          </span>
        )}
        {isGoen && !isSubscribed && (
          <p className="text-xs text-stone-400 mt-0.5">ご縁さん</p>
        )}
        {isDanka && (
          <p className="text-xs text-stone-400 mt-0.5">檀家</p>
        )}
      </div>

      {/* クイックアクセス */}
      <div className="mb-5">
        <div className="grid grid-cols-3 gap-2">
          {quickItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center gap-1 bg-white border border-stone-200 rounded-xl py-3 hover:border-amber-300 hover:bg-amber-50 transition-colors"
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-xs text-stone-600 font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* GOEN 未加入: 入会促進バナー（dismissable） */}
      {isGoen && !isSubscribed && <GoenCtaBanner />}

      {/* GOEN 加入済み: 会員限定コンテンツカード */}
      {isGoen && isSubscribed && (exclusiveBlog || exclusiveEvent) && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-amber-800 mb-2">🔓 会員限定コンテンツ</p>
          <div className="space-y-2">
            {exclusiveBlog && (
              <Link
                href={`/app/blog/${exclusiveBlog.id}`}
                className="flex items-center gap-2 text-sm text-stone-700 hover:text-amber-800 transition-colors"
              >
                <span className="text-base">📝</span>
                <span className="truncate">{exclusiveBlog.title}</span>
              </Link>
            )}
            {exclusiveEvent && (
              <Link
                href={`/app/events/${exclusiveEvent.id}`}
                className="flex items-center gap-2 text-sm text-stone-700 hover:text-amber-800 transition-colors"
              >
                <span className="text-base">📅</span>
                <span className="truncate">{exclusiveEvent.title}</span>
                <span className="text-xs text-stone-400 shrink-0">
                  {exclusiveEvent.eventDate.toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}
                </span>
              </Link>
            )}
          </div>
          <Link href="/app/blog" className="text-xs text-amber-700 hover:underline mt-2 inline-block">
            すべて見る →
          </Link>
        </div>
      )}

      {/* GOEN 未加入: ロックされたコンテンツのFOMO表示 */}
      {isGoen && !isSubscribed && (exclusiveBlog || exclusiveEvent) && (
        <div className="mb-5 bg-stone-50 border border-stone-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-stone-500 mb-2">🔒 会員限定コンテンツ</p>
          <div className="space-y-2">
            {exclusiveBlog && (
              <div className="flex items-center gap-2 text-sm text-stone-400">
                <span className="text-base">📝</span>
                <span className="truncate blur-sm select-none">{exclusiveBlog.title}</span>
              </div>
            )}
            {exclusiveEvent && (
              <div className="flex items-center gap-2 text-sm text-stone-400">
                <span className="text-base">📅</span>
                <span className="truncate blur-sm select-none">{exclusiveEvent.title}</span>
              </div>
            )}
          </div>
          <Link
            href="/app/subscriptions"
            className="text-xs text-amber-700 hover:underline mt-2 inline-block font-medium"
          >
            会員登録で読める →
          </Link>
        </div>
      )}

      {/* 檀家: 次回法要予約 */}
      {isDanka && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-stone-600">次回の法要予約</h2>
            <Link href="/app/reservations" className="text-xs text-amber-700 hover:underline">
              一覧 →
            </Link>
          </div>
          {nextReservation ? (
            <Link
              href={`/app/reservations/${nextReservation.id}`}
              className="block bg-amber-50 border border-amber-200 rounded-xl p-4"
            >
              <p className="text-xs text-amber-700 font-medium mb-0.5">
                {nextReservation.scheduledAt.toLocaleDateString("ja-JP", {
                  year: "numeric", month: "long", day: "numeric", weekday: "short",
                })}{" "}
                {nextReservation.scheduledAt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
              </p>
              <p className="font-semibold text-stone-800">
                {RESERVATION_TYPE_LABELS[nextReservation.type] ?? nextReservation.type}
              </p>
              <p className={`text-xs mt-1 ${nextReservation.status === "CONFIRMED" ? "text-teal-700" : "text-amber-700"}`}>
                {nextReservation.status === "CONFIRMED" ? "確定済み" : "確認待ち"}
              </p>
            </Link>
          ) : (
            <div className="bg-white border border-stone-200 rounded-xl p-4 text-sm text-stone-400 text-center">
              予約はありません
              <br />
              <Link href="/app/reservations/new" className="text-amber-700 text-xs hover:underline mt-1 inline-block">
                法要を予約する →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* 申込済みイベント */}
      {upcomingParticipations.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-stone-600">参加予定のイベント</h2>
            <Link href="/app/events/my" className="text-xs text-amber-700 hover:underline">
              すべて →
            </Link>
          </div>
          <ul className="space-y-2">
            {upcomingParticipations.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/app/events/${p.event.id}`}
                  className="block bg-white rounded-xl border border-stone-200 p-3 hover:border-amber-200 transition-colors"
                >
                  <p className="text-xs text-amber-700 font-medium">{getCategoryLabel(p.event.category)}</p>
                  <p className="font-medium text-stone-800 text-sm">{p.event.title}</p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {p.event.eventDate.toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}{" "}
                    {p.event.startTime}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 注目イベント */}
      {featuredEvents.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-stone-600">
              {isGoen ? "おすすめイベント" : "今後のイベント"}
            </h2>
            <Link href="/app/events" className="text-xs text-amber-700 hover:underline">
              すべて →
            </Link>
          </div>
          <ul className="space-y-2">
            {featuredEvents.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/app/events/${e.id}`}
                  className="block bg-white rounded-xl border border-stone-200 p-3 hover:border-amber-200 transition-colors"
                >
                  <p className="text-xs text-amber-700 font-medium">{getCategoryLabel(e.category)}</p>
                  <p className="font-medium text-stone-800 text-sm">{e.title}</p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {e.eventDate.toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}{" "}
                    {e.startTime}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* お知らせ */}
      {latestNews.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-stone-600">お知らせ</h2>
            <Link href="/app/news" className="text-xs text-amber-700 hover:underline">
              すべて →
            </Link>
          </div>
          <ul className="space-y-1.5">
            {latestNews.map((n) => (
              <li key={n.id}>
                <Link
                  href={`/app/news/${n.id}`}
                  className="flex items-center justify-between bg-white rounded-xl border border-stone-200 px-4 py-3 hover:border-amber-200 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-stone-700 truncate">{n.title}</p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {n.publishedAt!.toLocaleDateString("ja-JP", { month: "long", day: "numeric" })}
                    </p>
                  </div>
                  <span className="text-stone-300 ml-2 shrink-0">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
