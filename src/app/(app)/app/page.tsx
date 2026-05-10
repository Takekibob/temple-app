import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCategoryLabel } from "@/lib/eventCategories";
import { getArticleCategoryLabel } from "@/lib/articleCategories";
import { BookOpen, ChevronRight, PenLine } from "lucide-react";
import { getGreeting } from "@/lib/greetings";
import NotificationBell from "@/components/teralog/NotificationBell";

export default async function AppHomePage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");

  const memberId = authUser.member?.id;
  const now = new Date();

  const subMessage = getGreeting();

  const followedTempleIds: string[] = memberId
    ? await prisma.memberFavoriteTemple
        .findMany({ where: { memberId }, select: { templeId: true } })
        .then((favs) => favs.map((f) => f.templeId))
    : [];

  const allTempleIds = Array.from(
    new Set([...(authUser.templeId ? [authUser.templeId] : []), ...followedTempleIds])
  );

  const [
    upcomingParticipations,
    followedEvents,
    followedTemples,
    discoveryTemples,
    latestPosts,
    latestArticles,
  ] = await Promise.all([
    // 参加予定のイベント (up to 3)
    memberId
      ? prisma.eventParticipation.findMany({
          where: {
            memberId,
            status: { in: ["APPLIED", "CONFIRMED"] },
            event: { eventDate: { gte: now } },
          },
          include: {
            event: {
              select: {
                id: true,
                title: true,
                eventDate: true,
                startTime: true,
                category: true,
                temple: { select: { name: true } },
              },
            },
          },
          orderBy: { event: { eventDate: "asc" } },
          take: 3,
        })
      : Promise.resolve([]),

    // フォロー中のお寺の未参加イベント (up to 3)
    followedTempleIds.length > 0 && memberId
      ? prisma.event.findMany({
          where: {
            templeId: { in: followedTempleIds },
            status: "PUBLISHED",
            eventDate: { gte: now },
            participations: { none: { memberId, status: { notIn: ["CANCELLED"] } } },
          },
          select: {
            id: true,
            title: true,
            eventDate: true,
            startTime: true,
            category: true,
            fee: true,
            temple: { select: { name: true } },
          },
          orderBy: { eventDate: "asc" },
          take: 3,
        })
      : prisma.event.findMany({
          where: { status: "PUBLISHED", eventDate: { gte: now } },
          select: {
            id: true,
            title: true,
            eventDate: true,
            startTime: true,
            category: true,
            fee: true,
            temple: { select: { name: true } },
          },
          orderBy: { eventDate: "asc" },
          take: 3,
        }),

    // フォロー中のお寺 (up to 3)
    followedTempleIds.length > 0
      ? prisma.temple.findMany({
          where: { id: { in: followedTempleIds }, isActive: true },
          select: { id: true, name: true, denomination: true, logoUrl: true, address: true },
          take: 3,
        })
      : Promise.resolve([]),

    // 発見用お寺 (when no follows)
    followedTempleIds.length === 0
      ? prisma.temple.findMany({
          where: { isActive: true },
          take: 3,
          select: { id: true, name: true, denomination: true, logoUrl: true, address: true },
        })
      : Promise.resolve([]),

    // お寺の声 (up to 3)
    allTempleIds.length > 0
      ? prisma.templePost.findMany({
          where: { templeId: { in: allTempleIds } },
          include: {
            photos: { orderBy: { order: "asc" }, take: 1 },
            temple: { select: { id: true, name: true } },
          },
          orderBy: { publishedAt: "desc" },
          take: 3,
        })
      : Promise.resolve([]),

    // 学びの記事 (up to 3)
    prisma.article.findMany({
      where: { status: "PUBLISHED" },
      select: {
        slug: true,
        title: true,
        excerpt: true,
        category: true,
        coverImage: true,
        publishedAt: true,
      },
      orderBy: { publishedAt: "desc" },
      take: 3,
    }),

  ]);

  // 集いセクション: 参加予定 > フォロー中未参加 > 全体
  const eventsToShow =
    upcomingParticipations.length > 0
      ? upcomingParticipations.map((p) => ({
          id: p.event.id,
          title: p.event.title,
          eventDate: p.event.eventDate,
          startTime: p.event.startTime,
          category: p.event.category,
          templeName: p.event.temple?.name ?? "",
          isParticipating: true,
          fee: 0,
        }))
      : followedEvents.map((e) => ({
          id: e.id,
          title: e.title,
          eventDate: e.eventDate,
          startTime: e.startTime,
          category: e.category,
          templeName: e.temple.name,
          isParticipating: false,
          fee: e.fee,
        }));

  const displayTemples = followedTemples.length > 0 ? followedTemples : discoveryTemples;
  const DAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

  return (
    <div className="pb-32 max-w-lg mx-auto">
      {/* ヘッダー */}
      <div className="px-5 pt-6 pb-5 flex items-start justify-between">
        <div>
          <p className="font-serif text-[11px] text-ink-tertiary tracking-section mb-1">てらログ</p>
          <h1 className="font-serif text-xl text-ink font-medium">{authUser.name}</h1>
          <p className="font-serif text-sm text-ink-tertiary font-light mt-0.5">{subMessage}</p>
        </div>
        <NotificationBell />
      </div>

      <div className="px-5 space-y-8">
        {/* ─── 集い ─── */}
        <section>
          <SectionHeaderLink label="集 い" href="/app/events" moreLabel="すべて見る" />
          {eventsToShow.length === 0 ? (
            <div className="mt-3 py-6 text-center">
              <p className="font-serif text-sm text-ink-tertiary font-light">あなたのペースで、お寺を探してみませんか</p>
              <Link
                href="/app/events"
                className="font-serif text-sm text-ink font-light border-b-[0.5px] border-ink mt-3 inline-block"
              >
                集いを見る
              </Link>
            </div>
          ) : (
            <div className="mt-3">
              {eventsToShow.map((e) => {
                const d = new Date(e.eventDate);
                return (
                  <Link
                    key={e.id}
                    href={`/app/events/${e.id}`}
                    className="block py-3.5"
                    style={{ borderBottom: "0.5px solid var(--color-border-thin)" }}
                  >
                    <div className="flex items-baseline justify-between mb-0.5">
                      <time className="font-sans text-[11px] text-ink-tertiary">
                        {d.getMonth() + 1}.{d.getDate()} {DAYS[d.getDay()]}
                        {e.startTime && ` · ${e.startTime}`}
                      </time>
                      {e.isParticipating && (
                        <span className="font-serif text-[10px] text-ink-tertiary">参加予定</span>
                      )}
                    </div>
                    <p className="font-serif text-sm text-ink font-light truncate">{e.title}</p>
                    <p className="font-serif text-[11px] text-ink-tertiary font-light mt-0.5">
                      {e.templeName} · {getCategoryLabel(e.category)}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* ─── お寺との出会い ─── */}
        <section>
          <SectionHeaderLink
            label={followedTemples.length > 0 ? "フォロー中のお寺" : "お 寺 を 探 す"}
            href="/app/temples"
            moreLabel="すべて見る"
          />
          {displayTemples.length === 0 ? (
            <div className="mt-3 py-6 text-center">
              <p className="font-serif text-sm text-ink-tertiary font-light">お寺を見つけよう</p>
              <Link
                href="/app/temples/map"
                className="font-serif text-sm text-ink font-light border-b-[0.5px] border-ink mt-3 inline-block"
              >
                地図で探す
              </Link>
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 mt-3 -mx-5 px-5">
              {displayTemples.map((t) => (
                <Link
                  key={t.id}
                  href={`/app/temples/${t.id}`}
                  className="flex-shrink-0 w-32 bg-paper border-[0.5px] border-border p-3"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-paper-soft mb-2 relative">
                    {t.logoUrl ? (
                      <Image src={t.logoUrl} alt={t.name} fill className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-serif text-lg text-ink-tertiary">
                        {t.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <p className="font-serif text-xs text-ink font-light leading-snug line-clamp-2">{t.name}</p>
                  {t.denomination && (
                    <p className="font-serif text-[10px] text-ink-tertiary mt-1">{t.denomination}</p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* ─── お寺の声 ─── */}
        {latestPosts.length > 0 && (
          <section>
            <SectionHeaderLink label="お 寺 の 声" href="/app/posts" moreLabel="すべて見る" />
            <div className="mt-3">
              {latestPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/app/posts/${post.id}`}
                  className="flex items-start gap-3 py-3.5"
                  style={{ borderBottom: "0.5px solid var(--color-border-thin)" }}
                >
                  {post.photos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.photos[0].url} alt="" className="w-12 h-12 object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 bg-paper-soft flex items-center justify-center shrink-0">
                      <PenLine size={16} className="text-ink-tertiary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-[11px] text-ink-tertiary mb-0.5">{post.temple.name}</p>
                    <p className="font-serif text-sm text-ink font-light truncate">
                      {post.title ?? post.body.slice(0, 30) + (post.body.length > 30 ? "…" : "")}
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-ink-tertiary shrink-0 mt-1" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ─── 学びの記事 ─── */}
        {latestArticles.length > 0 && (
          <section>
            <SectionHeaderLink label="学 び の 記 事" href="/app/articles" moreLabel="すべて見る" />
            <div className="mt-3">
              {latestArticles.map((article) => (
                <Link
                  key={article.slug}
                  href={`/app/articles/${article.slug}`}
                  className="flex items-start gap-3 py-3.5"
                  style={{ borderBottom: "0.5px solid var(--color-border-thin)" }}
                >
                  {article.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={article.coverImage} alt="" className="w-12 h-12 object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 bg-paper-soft flex items-center justify-center shrink-0">
                      <BookOpen size={16} className="text-ink-tertiary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-[11px] text-ink-tertiary mb-0.5">
                      {getArticleCategoryLabel(article.category)}
                    </p>
                    <p className="font-serif text-sm text-ink font-light truncate">{article.title}</p>
                  </div>
                  <ChevronRight size={14} className="text-ink-tertiary shrink-0 mt-1" />
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function SectionHeaderLink({
  label,
  href,
  moreLabel,
}: {
  label: string;
  href: string;
  moreLabel: string;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <p className="font-serif text-[11px] text-ink-tertiary tracking-section">{label}</p>
      <Link
        href={href}
        className="font-serif text-[11px] text-ink-tertiary tracking-section flex items-center gap-0.5"
      >
        {moreLabel}
        <ChevronRight size={11} />
      </Link>
    </div>
  );
}
