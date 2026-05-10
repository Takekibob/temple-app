import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCategoryLabel, getCategoryIcon } from "@/lib/eventCategories";
import { MapPin, Phone, Globe, CalendarDays, Home, ChevronLeft, ChevronRight, Users, Stamp, Youtube, Instagram, MessageCircle } from "lucide-react";
import FollowButton from "./FollowButton";

function CategoryLabel({ category }: { category: string }) {
  const Icon = getCategoryIcon(category);
  return <><Icon size={12} className="inline mr-1" />{getCategoryLabel(category)}</>;
}

export default async function TempleProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");

  const { id } = await params;

  const temple = await prisma.temple.findFirst({
    where: { id, isActive: true },
    select: {
      id: true,
      name: true,
      denomination: true,
      address: true,
      phone: true,
      description: true,
      logoUrl: true,
      coverImageUrl: true,
      websiteUrl: true,
      instagramUrl: true,
      lineOfficialUrl: true,
      youtubeUrl: true,
      stripeConnectOnboarded: true,
    },
  });

  if (!temple) notFound();

  const events = await prisma.event.findMany({
    where: {
      templeId: id,
      status: "PUBLISHED",
      eventDate: { gte: new Date(new Date().toDateString()) },
    },
    select: {
      id: true, title: true, category: true, eventDate: true, startTime: true, fee: true,
    },
    orderBy: { eventDate: "asc" },
    take: 10,
  });

  const memberId = authUser.member?.id;
  const isMyTemple = authUser.member?.templeId === id;

  const [followerCount, isFollowingRaw, recentPosts, recentArticles] = await Promise.all([
    prisma.memberFavoriteTemple.count({ where: { templeId: id } }),
    memberId
      ? prisma.memberFavoriteTemple.findUnique({
          where: { memberId_templeId: { memberId, templeId: id } },
        })
      : Promise.resolve(null),
    prisma.templePost.findMany({
      where: { templeId: id },
      include: { photos: { orderBy: { order: "asc" }, take: 1 } },
      orderBy: { publishedAt: "desc" },
      take: 3,
    }),
    prisma.article.findMany({
      where: { templeId: id, status: "PUBLISHED" },
      select: { slug: true, title: true, coverImage: true, publishedAt: true },
      orderBy: { publishedAt: "desc" },
      take: 3,
    }),
  ]);

  const isFollowing = !!isFollowingRaw;

  return (
    <div className="max-w-lg mx-auto pb-28">
      {/* カバー画像 */}
      {temple.coverImageUrl ? (
        <div className="relative h-52 bg-paper-soft overflow-hidden">
          <Image src={temple.coverImageUrl} alt={temple.name} fill className="object-cover" />
          <div className="absolute top-4 left-4">
            <Link
              href="/app/events"
              className="w-9 h-9 bg-paper/90 flex items-center justify-center"
              style={{ border: "0.5px solid var(--color-border)" }}
            >
              <ChevronLeft size={18} className="text-ink-secondary" />
            </Link>
          </div>
        </div>
      ) : (
        <div
          className="h-24 bg-paper-soft relative px-4 flex items-center"
          style={{ borderBottom: "0.5px solid var(--color-border)" }}
        >
          <Link
            href="/app/events"
            className="inline-flex items-center gap-1 font-serif text-sm text-ink-tertiary hover:text-ink"
          >
            <ChevronLeft size={16} />
            集い一覧
          </Link>
        </div>
      )}

      <div className="px-4 pt-4 space-y-5">
        {/* 寺院基本情報 */}
        <div className="bg-paper p-4" style={{ border: "0.5px solid var(--color-border)" }}>
          <div className="flex items-start gap-4 mb-4">
            {temple.logoUrl ? (
              <div
                className="relative w-16 h-16 overflow-hidden flex-shrink-0"
                style={{ border: "0.5px solid var(--color-border)" }}
              >
                <Image src={temple.logoUrl} alt={temple.name} fill className="object-cover" />
              </div>
            ) : (
              <div
                className="w-16 h-16 bg-paper-soft flex items-center justify-center flex-shrink-0"
                style={{ border: "0.5px solid var(--color-border)" }}
              >
                <span className="font-serif text-xl text-ink-tertiary">{temple.name.charAt(0)}</span>
              </div>
            )}
            <div className="flex-1">
              <h1 className="font-serif text-xl text-ink font-medium">{temple.name}</h1>
              {temple.denomination && (
                <p className="font-serif text-sm text-ink-secondary font-light mt-0.5">{temple.denomination}</p>
              )}
              {followerCount > 0 && (
                <p className="font-sans text-xs text-ink-tertiary mt-1 flex items-center gap-1">
                  <Users size={11} />
                  {followerCount}人がフォロー中
                </p>
              )}
            </div>
          </div>

          {/* 連絡先 */}
          <div>
            {temple.address && (
              <div
                className="flex items-start gap-3 py-2.5"
                style={temple.phone ? { borderBottom: "0.5px solid var(--color-border-thin)" } : undefined}
              >
                <MapPin size={14} className="text-ink-tertiary shrink-0 mt-0.5" />
                <span className="font-serif text-sm text-ink-secondary font-light">{temple.address}</span>
              </div>
            )}
            {temple.phone && (
              <div className="flex items-center gap-3 py-2.5">
                <Phone size={14} className="text-ink-tertiary shrink-0" />
                <a href={`tel:${temple.phone}`} className="font-sans text-sm text-ink-secondary hover:text-ink">
                  {temple.phone}
                </a>
              </div>
            )}
          </div>

          {/* リンク集 */}
          {(temple.websiteUrl || temple.instagramUrl || temple.lineOfficialUrl || temple.youtubeUrl) && (
            <div
              className="grid grid-cols-2 gap-2 pt-3 mt-1"
              style={{ borderTop: "0.5px solid var(--color-border-thin)" }}
            >
              {temple.websiteUrl && (
                <Link href={temple.websiteUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-ink text-paper font-sans text-xs py-2.5 hover:opacity-80 transition-opacity">
                  <Globe size={14} />公式サイト
                </Link>
              )}
              {temple.instagramUrl && (
                <Link href={temple.instagramUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-sans text-xs py-2.5 transition-colors">
                  <Instagram size={14} />Instagram
                </Link>
              )}
              {temple.lineOfficialUrl && (
                <Link href={temple.lineOfficialUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-white font-sans text-xs py-2.5"
                  style={{ background: "#06C755" }}>
                  <MessageCircle size={14} />LINE公式
                </Link>
              )}
              {temple.youtubeUrl && (
                <Link href={temple.youtubeUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-sans text-xs py-2.5 transition-colors">
                  <Youtube size={14} />YouTube
                </Link>
              )}
            </div>
          )}
        </div>

        {/* 説明文 */}
        {temple.description && (
          <div className="bg-paper p-4" style={{ border: "0.5px solid var(--color-border)" }}>
            <p className="font-serif text-[11px] text-ink-tertiary tracking-section mb-3">お 寺 に つ い て</p>
            <p className="font-serif text-sm text-ink-secondary font-light leading-relaxed whitespace-pre-wrap">
              {temple.description}
            </p>
          </div>
        )}

        {/* 開催予定の集い */}
        <div className="bg-paper overflow-hidden" style={{ border: "0.5px solid var(--color-border)" }}>
          <div
            className="px-4 pt-4 pb-3 flex items-center gap-2"
            style={{ borderBottom: "0.5px solid var(--color-border-thin)" }}
          >
            <CalendarDays size={14} className="text-ink-tertiary" />
            <h2 className="font-serif text-sm text-ink font-medium">開催予定の集い</h2>
          </div>
          {events.length === 0 ? (
            <p className="font-serif text-sm text-ink-tertiary font-light text-center py-6">開催予定の集いはありません</p>
          ) : (
            <div>
              {events.map((event, i) => (
                <Link
                  key={event.id}
                  href={`/app/events/${event.id}`}
                  className="flex items-center justify-between px-4 py-3.5 hover:bg-paper-soft transition-colors"
                  style={i < events.length - 1 ? { borderBottom: "0.5px solid var(--color-border-thin)" } : undefined}
                >
                  <div>
                    <p className="font-sans text-[10px] text-ink-tertiary mb-0.5">
                      <CategoryLabel category={event.category} />
                    </p>
                    <p className="font-serif text-sm text-ink font-light">{event.title}</p>
                    <p className="font-sans text-xs text-ink-tertiary mt-0.5">
                      {event.eventDate.toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}{" "}
                      {event.startTime}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="font-sans text-xs text-ink">
                      {event.fee === 0 ? "無料" : `¥${event.fee.toLocaleString()}`}
                    </span>
                    <ChevronRight size={14} className="text-ink-tertiary" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* お寺の声 */}
        {recentPosts.length > 0 && (
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <p className="font-serif text-[11px] text-ink-tertiary tracking-section">お 寺 の 声</p>
              <Link href="/app/posts" className="font-serif text-[11px] text-ink-tertiary tracking-section flex items-center gap-0.5">
                すべて見る<ChevronRight size={11} />
              </Link>
            </div>
            <div>
              {recentPosts.map((post, i) => (
                <Link
                  key={post.id}
                  href={`/app/posts/${post.id}`}
                  className="flex items-start gap-3 py-3.5 hover:bg-paper-soft transition-colors"
                  style={i < recentPosts.length - 1 ? { borderBottom: "0.5px solid var(--color-border-thin)" } : undefined}
                >
                  {post.photos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.photos[0].url} alt="" className="w-12 h-12 object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 bg-paper-soft shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-sm text-ink font-light truncate">
                      {post.title ?? post.body.slice(0, 28) + (post.body.length > 28 ? "…" : "")}
                    </p>
                    <p className="font-sans text-xs text-ink-tertiary mt-0.5">
                      {post.publishedAt.toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-ink-tertiary shrink-0 mt-1" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 学びの記事 */}
        {recentArticles.length > 0 && (
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <p className="font-serif text-[11px] text-ink-tertiary tracking-section">学 び の 記 事</p>
              <Link href="/app/articles" className="font-serif text-[11px] text-ink-tertiary tracking-section flex items-center gap-0.5">
                すべて見る<ChevronRight size={11} />
              </Link>
            </div>
            <div>
              {recentArticles.map((article, i) => (
                <Link
                  key={article.slug}
                  href={`/app/articles/${article.slug}`}
                  className="flex items-start gap-3 py-3.5 hover:bg-paper-soft transition-colors"
                  style={i < recentArticles.length - 1 ? { borderBottom: "0.5px solid var(--color-border-thin)" } : undefined}
                >
                  {article.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={article.coverImage} alt="" className="w-12 h-12 object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 bg-paper-soft shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-sm text-ink font-light truncate">{article.title}</p>
                    {article.publishedAt && (
                      <p className="font-sans text-xs text-ink-tertiary mt-0.5">
                        {article.publishedAt.toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}
                      </p>
                    )}
                  </div>
                  <ChevronRight size={14} className="text-ink-tertiary shrink-0 mt-1" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* アクションボタン */}
        <div className="space-y-3">
          {memberId && (
            <Link
              href={`/app/temples/${id}/visit`}
              className="flex items-center justify-center gap-2 w-full bg-ink text-paper font-sans text-sm py-3.5 hover:opacity-80 transition-opacity"
            >
              <Stamp size={16} />
              参拝を記録する
            </Link>
          )}
          {memberId && !isMyTemple && (
            <FollowButton templeId={id} initialFollowing={isFollowing} />
          )}
          {isMyTemple && (
            <div
              className="flex items-center justify-center gap-2 p-4 bg-paper-soft"
              style={{ border: "0.5px solid var(--color-border)" }}
            >
              <Home size={16} className="text-ink-secondary" />
              <span className="font-serif text-sm text-ink-secondary font-light">あなたの所属寺院です</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
