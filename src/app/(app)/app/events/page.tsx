import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { getCategoryLabel, getCategoryIcon, STANDARD_CATEGORY_KEYS } from "@/lib/eventCategories";
import { MapPin, Clock, Users, CheckCircle, Heart } from "lucide-react";
import { Suspense } from "react";
import SearchBar from "@/components/app/SearchBar";

type EventRow = Prisma.EventGetPayload<{
  include: {
    temple: { select: { id: true; name: true; denomination: true } };
    _count: { select: { participations: true } };
  };
}>;

function EventCard({
  event,
  showTemple,
  myStatus,
}: {
  event: EventRow;
  showTemple: boolean;
  myStatus?: string;
}) {
  const isFull = event.capacity != null && event._count.participations >= event.capacity;
  const remaining = event.capacity != null ? event.capacity - event._count.participations : null;
  const CategoryIcon = getCategoryIcon(event.category);

  return (
    <Link
      href={`/app/events/${event.id}`}
      className="block bg-paper overflow-hidden hover:bg-paper-soft transition-colors"
      style={{ border: "0.5px solid var(--color-border)" }}
    >
      {event.imageUrl && (
        <div className="relative h-40 overflow-hidden bg-paper-soft">
          <Image src={event.imageUrl} alt={event.title} fill className="object-cover" />
          <div className="absolute top-3 left-3 flex gap-1.5">
            <span className="bg-paper/90 text-ink-tertiary font-sans text-[10px] px-2 py-0.5 flex items-center gap-1">
              <CategoryIcon size={11} />
              {getCategoryLabel(event.category)}
            </span>
          </div>
        </div>
      )}

      <div className="p-4">
        {!event.imageUrl && (
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            <span className="font-sans text-[10px] text-ink-tertiary bg-paper-soft px-2 py-0.5 flex items-center gap-1">
              <CategoryIcon size={11} />
              {getCategoryLabel(event.category)}
            </span>
          </div>
        )}

        <h3 className="font-serif text-sm text-ink font-light leading-snug mb-2">{event.title}</h3>

        {showTemple && (
          <p className="font-serif text-[11px] text-ink-tertiary font-light mb-2 flex items-center gap-1">
            <MapPin size={11} />
            {event.temple.name}
            {event.temple.denomination && `（${event.temple.denomination}）`}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="font-sans text-xs text-ink-tertiary flex items-center gap-1">
              <Clock size={11} className="text-ink-tertiary" />
              {event.eventDate.toLocaleDateString("ja-JP", {
                month: "long", day: "numeric", weekday: "short",
              })}{" "}
              {event.startTime}〜{event.endTime}
            </p>
            {event.location && (
              <p className="font-sans text-xs text-ink-tertiary flex items-center gap-1">
                <MapPin size={11} />
                {event.location}
              </p>
            )}
          </div>

          <div className="text-right shrink-0 ml-3">
            <p className="font-sans text-sm text-ink font-light">
              {event.fee === 0 ? "無料" : `¥${event.fee.toLocaleString()}`}
            </p>
            {myStatus ? (
              <span className="inline-flex items-center gap-1 font-sans text-[10px] text-ink-secondary bg-paper-soft px-2 py-0.5">
                <CheckCircle size={10} />申込済
              </span>
            ) : isFull ? (
              <span className="inline-flex items-center gap-1 font-sans text-[10px] text-ink-tertiary bg-paper-soft px-2 py-0.5">
                <Users size={10} />満席
              </span>
            ) : remaining !== null ? (
              <span className="font-sans text-[10px] text-ink-tertiary">残{remaining}席</span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}

const INCLUDE = {
  temple: { select: { id: true as const, name: true as const, denomination: true as const } },
  _count: { select: { participations: true as const } },
} satisfies Prisma.EventInclude;

export default async function AppEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; denomination?: string; search?: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");

  const { category, denomination, search } = await searchParams;
  const memberId = authUser.member?.id ?? null;
  const today = new Date(new Date().toDateString());

  const STANDARD_NON_OTHER = STANDARD_CATEGORY_KEYS.filter((k) => k !== "OTHER");
  const categoryFilter: Prisma.EventWhereInput =
    category === "OTHER"
      ? { category: { notIn: STANDARD_NON_OTHER } }
      : category
      ? { category }
      : {};

  const searchFilter: Prisma.EventWhereInput = search
    ? {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
          { location: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};

  const baseWhere: Prisma.EventWhereInput = {
    status: "PUBLISHED",
    eventDate: { gte: today },
    ...categoryFilter,
    ...searchFilter,
    ...(denomination ? { temple: { denomination } } : {}),
  };

  // フォロー中寺院IDを取得
  let favoriteTempleIds: string[] = [];
  if (memberId) {
    const favs = await prisma.memberFavoriteTemple.findMany({
      where: { memberId },
      select: { templeId: true },
    });
    favoriteTempleIds = favs.map((f) => f.templeId);
  }

  let favoriteEvents: EventRow[] = [];
  let otherEvents: EventRow[] = [];

  if (favoriteTempleIds.length > 0) {
    [favoriteEvents, otherEvents] = await Promise.all([
      prisma.event.findMany({
        where: { ...baseWhere, templeId: { in: favoriteTempleIds } },
        include: INCLUDE,
        orderBy: { eventDate: "asc" },
        take: 20,
      }),
      prisma.event.findMany({
        where: { ...baseWhere, templeId: { notIn: favoriteTempleIds } },
        include: INCLUDE,
        orderBy: { eventDate: "asc" },
        take: 20,
      }),
    ]);
  } else {
    otherEvents = await prisma.event.findMany({
      where: baseWhere,
      include: INCLUDE,
      orderBy: { eventDate: "asc" },
      take: 40,
    });
  }

  const allEventIds = [...favoriteEvents, ...otherEvents].map((e) => e.id);
  const myParticipationMap: Record<string, string> = {};
  if (memberId && allEventIds.length > 0) {
    const myParts = await prisma.eventParticipation.findMany({
      where: {
        memberId,
        eventId: { in: allEventIds },
        status: { not: "CANCELLED" },
      },
      select: { eventId: true, status: true },
    });
    myParts.forEach((p) => { myParticipationMap[p.eventId] = p.status; });
  }

  const categories = ["ZAZEN", "SHAKYO", "YOGA", "MINDFULNESS", "LECTURE", "SEASONAL", "OTHER"];
  const hasAnyEvents = favoriteEvents.length > 0 || otherEvents.length > 0;

  return (
    <div className="max-w-lg mx-auto pb-28">
      {/* ヘッダー */}
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <h1 className="font-serif text-xl text-ink font-medium">集 い</h1>
        <Link
          href="/app/events/my"
          className="font-sans flex items-center gap-1 text-xs text-ink-secondary bg-paper-soft px-3 py-1.5 border-[0.5px] border-border hover:bg-paper-cream transition-colors"
        >
          <CheckCircle size={12} />
          申込済み
        </Link>
      </div>

      {/* 検索バー */}
      <div className="px-4 pb-3">
        <Suspense>
          <SearchBar placeholder="集いを検索…" />
        </Suspense>
      </div>

      {/* カテゴリフィルタ */}
      <div className="flex gap-2 overflow-x-auto px-5 pb-4 scrollbar-hide">
        <Link
          href="/app/events"
          className={`flex-shrink-0 font-sans px-4 py-1.5 text-xs transition-colors ${
            !category
              ? "bg-ink text-paper"
              : "bg-paper text-ink-tertiary border-[0.5px] border-border hover:border-ink"
          }`}
        >
          すべて
        </Link>
        {categories.map((c) => {
          const CategoryIcon = getCategoryIcon(c);
          return (
            <Link
              key={c}
              href={`/app/events?category=${c}`}
              className={`flex-shrink-0 font-sans px-4 py-1.5 text-xs transition-colors flex items-center gap-1.5 ${
                category === c
                  ? "bg-ink text-paper"
                  : "bg-paper text-ink-tertiary border-[0.5px] border-border hover:border-ink"
              }`}
            >
              <CategoryIcon size={13} />
              {getCategoryLabel(c)}
            </Link>
          );
        })}
      </div>

      <div className="px-4 space-y-6">
        {!hasAnyEvents && (
          <div className="py-8 text-center">
            <p className="font-serif text-sm text-ink-tertiary font-light">開催予定の集いはありません</p>
          </div>
        )}

        {/* フォロー0件の誘導バナー */}
        {favoriteTempleIds.length === 0 && (
          <Link
            href="/app/temples"
            className="flex items-center gap-4 bg-paper-soft px-4 py-4 hover:bg-paper-cream transition-colors"
            style={{ border: "0.5px solid var(--color-border)" }}
          >
            <div
              className="w-11 h-11 bg-paper flex items-center justify-center shrink-0"
              style={{ border: "0.5px solid var(--color-border)" }}
            >
              <Heart size={20} className="text-ink-tertiary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-serif text-sm text-ink font-light">お寺をフォローしよう</p>
              <p className="font-serif text-xs text-ink-tertiary font-light mt-0.5">
                フォローするとそのお寺の集いがここに表示されます
              </p>
            </div>
            <span
              className="shrink-0 font-sans text-xs text-ink-secondary bg-paper border-[0.5px] border-border px-3 py-1.5 whitespace-nowrap"
            >
              お寺を探す
            </span>
          </Link>
        )}

        {/* フォロー中のお寺の集い */}
        {favoriteEvents.length > 0 && (
          <section>
            <SectionLabel>フォロー中のお寺の集い</SectionLabel>
            <div className="space-y-3">
              {favoriteEvents.map((event) => (
                <EventCard key={event.id} event={event} showTemple={true}
                  myStatus={myParticipationMap[event.id]} />
              ))}
            </div>
          </section>
        )}

        {/* その他の集い */}
        {otherEvents.length > 0 && (
          <section>
            {favoriteEvents.length > 0 && (
              <SectionLabel>すべての集い</SectionLabel>
            )}
            <div className="space-y-3">
              {otherEvents.map((event) => (
                <EventCard key={event.id} event={event} showTemple={true}
                  myStatus={myParticipationMap[event.id]} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="h-px flex-1" style={{ background: "var(--color-border-thin)" }} />
      <span className="font-serif text-[10px] text-ink-tertiary tracking-section whitespace-nowrap">
        {children}
      </span>
      <div className="h-px flex-1" style={{ background: "var(--color-border-thin)" }} />
    </div>
  );
}
