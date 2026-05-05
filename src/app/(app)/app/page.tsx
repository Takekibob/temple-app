import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCategoryLabel } from "@/lib/eventCategories";
import {
  CalendarRange, BookOpen, Heart,
  Bell, MapPin, ChevronRight, Clock,
  Compass, Stamp,
} from "lucide-react";

type QuickItem = {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  label: string;
  href: string;
  color: string;
};

const QUICK_ITEMS: QuickItem[] = [
  { icon: BookOpen,      label: "イベント",   href: "/app/events",         color: "bg-sky-50 text-sky-600" },
  { icon: CalendarRange, label: "カレンダー", href: "/app/calendar",       color: "bg-violet-50 text-violet-600" },
  { icon: Bell,          label: "お知らせ",   href: "/app/news",           color: "bg-orange-50 text-orange-600" },
  { icon: Compass,       label: "お寺を探す", href: "/app/temples",        color: "bg-emerald-50 text-emerald-600" },
  { icon: Stamp,         label: "参拝記録",   href: "/app/temples/visit",  color: "bg-teal-50 text-teal-600" },
];

export default async function AppHomePage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");

  const memberId = authUser.member?.id;
  const now = new Date();

  const followedTempleIds: string[] = memberId
    ? await prisma.memberFavoriteTemple
        .findMany({ where: { memberId }, select: { templeId: true } })
        .then((favs) => favs.map((f) => f.templeId))
    : [];

  const allTempleIds = Array.from(
    new Set([...(authUser.templeId ? [authUser.templeId] : []), ...followedTempleIds])
  );

  const [upcomingParticipations, followedEvents, featuredEvents, latestNews, discoveryTemples, latestPosts] =
    await Promise.all([
      memberId
        ? prisma.eventParticipation.findMany({
            where: {
              memberId,
              status: { in: ["APPLIED", "CONFIRMED"] },
              event: { eventDate: { gte: now } },
            },
            include: {
              event: { select: { id: true, title: true, eventDate: true, startTime: true, category: true } },
            },
            orderBy: { event: { eventDate: "asc" } },
            take: 3,
          })
        : Promise.resolve([]),

      followedTempleIds.length > 0 && memberId
        ? prisma.event.findMany({
            where: {
              templeId: { in: followedTempleIds },
              status: "PUBLISHED",
              eventDate: { gte: now },
              participations: { none: { memberId, status: { notIn: ["CANCELLED"] } } },
            },
            select: {
              id: true, title: true, eventDate: true, startTime: true, category: true, fee: true,
              temple: { select: { name: true } },
            },
            orderBy: { eventDate: "asc" },
            take: 5,
          })
        : Promise.resolve([]),

      authUser.templeId
        ? prisma.event.findMany({
            where: {
              templeId: authUser.templeId,
              status: "PUBLISHED",
              eventDate: { gte: now },
              ...(memberId
                ? { participations: { none: { memberId, status: { notIn: ["CANCELLED"] } } } }
                : {}),
            },
            orderBy: { eventDate: "asc" },
            take: 3,
          })
        : Promise.resolve([]),

      allTempleIds.length > 0
        ? prisma.announcement.findMany({
            where: {
              templeId: { in: allTempleIds },
              publishedAt: { not: null, lte: now },
            },
            orderBy: { publishedAt: "desc" },
            take: 3,
            select: { id: true, title: true, publishedAt: true },
          })
        : Promise.resolve([]),

      followedTempleIds.length === 0
        ? prisma.temple.findMany({
            where: {
              isActive: true,
              ...(authUser.templeId ? { id: { not: authUser.templeId } } : {}),
            },
            take: 4,
            select: { id: true, name: true, denomination: true, logoUrl: true, address: true },
          })
        : Promise.resolve([]),

      allTempleIds.length > 0
        ? prisma.templePost.findMany({
            where: { templeId: { in: allTempleIds } },
            include: {
              photos: { orderBy: { order: "asc" }, take: 1 },
              temple: { select: { id: true, name: true, logoUrl: true } },
            },
            orderBy: { publishedAt: "desc" },
            take: 3,
          })
        : Promise.resolve([]),
    ]);

  const displayName = authUser.name;

  return (
    <div className="pb-28 max-w-lg mx-auto">
      {/* ヘッダー */}
      <div className="px-5 pt-6 pb-5">
        <h1 className="text-2xl font-bold text-stone-800 tracking-tight">
          こんにちは、<span className="text-amber-800">{displayName}</span>さん
        </h1>
      </div>

      <div className="px-4 space-y-5">
        {/* クイックアクセス */}
        <div className="grid grid-cols-3 gap-2.5">
          {QUICK_ITEMS.map((item) => {
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

        {/* フォロー0件 — お寺発見セクション */}
        {followedTempleIds.length === 0 && (
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
                <p className="text-xs text-stone-500 mt-0.5">フォローするとイベントやお知らせが届きます</p>
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

        {/* フォロー中のお寺のイベント */}
        {followedEvents.length > 0 && (
          <section>
            <SectionHeader title="フォロー中のお寺のイベント" moreHref="/app/events" moreLabel="すべて" />
            <div className="space-y-2">
              {followedEvents.map((e) => (
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

        {/* フォロー中のイベントがなければ全体から表示 */}
        {followedEvents.length === 0 && featuredEvents.length > 0 && (
          <section>
            <SectionHeader title="今後のイベント" moreHref="/app/events" moreLabel="すべて" />
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

        {/* お寺の声 */}
        {latestPosts.length > 0 && (
          <section>
            <SectionHeader title="お寺の声" moreHref="/app/posts" moreLabel="すべて見る" />
            <div className="space-y-2">
              {latestPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/app/posts/${post.id}`}
                  className="flex items-center gap-3 bg-white border border-stone-100 rounded-xl px-4 py-3 shadow-sm hover:border-stone-200 hover:shadow-md transition-all"
                >
                  {post.photos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.photos[0].url} alt="" className="w-12 h-12 object-cover rounded-lg shrink-0" />
                  ) : (
                    <div className="w-12 h-12 bg-stone-50 rounded-lg flex items-center justify-center shrink-0">
                      <span className="text-stone-300 text-lg">—</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-stone-400 mb-0.5">{post.temple.name}</p>
                    <p className="text-sm font-medium text-stone-800 truncate">
                      {post.title ?? post.body.slice(0, 30) + (post.body.length > 30 ? "…" : "")}
                    </p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {post.publishedAt.toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-stone-300 shrink-0" />
                </Link>
              ))}
            </div>
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
