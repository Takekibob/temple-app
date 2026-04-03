import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { EventVisibility } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { getCategoryLabel, getCategoryIcon, STANDARD_CATEGORY_KEYS } from "@/lib/eventCategories";
import { MapPin, Clock, Users, CheckCircle, Heart } from "lucide-react";

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

  return (
    <Link
      href={`/app/events/${event.id}`}
      className="block bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden hover:shadow-md hover:border-amber-200 hover:-translate-y-0.5 transition-all"
    >
      {event.imageUrl && (
        <div className="relative h-40 overflow-hidden bg-stone-100">
          <Image src={event.imageUrl} alt={event.title} fill className="object-cover" />
          {/* オーバーレイバッジ */}
          <div className="absolute top-3 left-3 flex gap-1.5">
            <span className="bg-white/90 backdrop-blur-sm text-amber-800 text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
              {getCategoryIcon(event.category)} {getCategoryLabel(event.category)}
            </span>
            {event.visibility === "DANKA_ONLY" && (
              <span className="bg-amber-700/90 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm">
                檀家限定
              </span>
            )}
          </div>
        </div>
      )}

      <div className="p-4">
        {!event.imageUrl && (
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            <span className="text-xs text-amber-700 font-semibold bg-amber-50 px-2.5 py-0.5 rounded-full">
              {getCategoryIcon(event.category)} {getCategoryLabel(event.category)}
            </span>
            {event.visibility === "DANKA_ONLY" && (
              <span className="text-xs text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full font-medium">
                檀家限定
              </span>
            )}
          </div>
        )}

        <h3 className="font-bold text-stone-800 text-base leading-snug mb-2">{event.title}</h3>

        {showTemple && (
          <p className="text-xs text-amber-700 font-medium mb-2 flex items-center gap-1">
            <MapPin size={11} />
            {event.temple.name}
            {event.temple.denomination && `（${event.temple.denomination}）`}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-stone-500 flex items-center gap-1">
              <Clock size={11} className="text-stone-400" />
              {event.eventDate.toLocaleDateString("ja-JP", {
                month: "long", day: "numeric", weekday: "short",
              })}{" "}
              {event.startTime}〜{event.endTime}
            </p>
            {event.location && (
              <p className="text-xs text-stone-400 flex items-center gap-1">
                <MapPin size={11} />
                {event.location}
              </p>
            )}
          </div>

          <div className="text-right shrink-0 ml-3">
            <p className="text-base font-bold text-amber-700">
              {event.fee === 0 ? "無料" : `¥${event.fee.toLocaleString()}`}
            </p>
            {myStatus ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                <CheckCircle size={10} />申込済
              </span>
            ) : isFull ? (
              <span className="inline-flex items-center gap-1 text-[10px] text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
                <Users size={10} />満席
              </span>
            ) : remaining !== null ? (
              <span className="text-[10px] text-stone-500">残{remaining}席</span>
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
  searchParams: Promise<{ category?: string; denomination?: string }>;
}) {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");

  const { category, denomination } = await searchParams;
  const isDanka = authUser.member?.type === "DANKA";
  const myTempleId = authUser.member?.templeId ?? null;
  const today = new Date(new Date().toDateString());

  const STANDARD_NON_OTHER = STANDARD_CATEGORY_KEYS.filter((k) => k !== "OTHER");
  const categoryFilter: Prisma.EventWhereInput =
    category === "OTHER"
      ? { category: { notIn: STANDARD_NON_OTHER } }
      : category
      ? { category }
      : {};

  const baseWhere: Prisma.EventWhereInput = {
    status: "PUBLISHED",
    eventDate: { gte: today },
    ...categoryFilter,
    ...(denomination ? { temple: { denomination } } : {}),
  };

  const PUBLIC_VISIBILITY: EventVisibility[] = ["PUBLIC", "MEMBERS_ONLY"];

  let favoriteTempleIds: string[] = [];
  if (authUser.member && !isDanka) {
    const favs = await prisma.memberFavoriteTemple.findMany({
      where: { memberId: authUser.member.id },
      select: { templeId: true },
    });
    favoriteTempleIds = favs.map((f) => f.templeId);
  }

  let myTempleEvents: EventRow[] = [];
  let otherEvents: EventRow[] = [];
  let favoriteEvents: EventRow[] = [];

  if (isDanka && myTempleId) {
    [myTempleEvents, otherEvents] = await Promise.all([
      prisma.event.findMany({
        where: {
          ...baseWhere,
          templeId: myTempleId,
          visibility: { in: ["PUBLIC", "MEMBERS_ONLY", "DANKA_ONLY"] as EventVisibility[] },
        },
        include: INCLUDE,
        orderBy: { eventDate: "asc" },
        take: 20,
      }),
      prisma.event.findMany({
        where: {
          ...baseWhere,
          templeId: { not: myTempleId },
          visibility: { in: PUBLIC_VISIBILITY },
        },
        include: INCLUDE,
        orderBy: { eventDate: "asc" },
        take: 20,
      }),
    ]);
  } else {
    const publicWhere: Prisma.EventWhereInput = { ...baseWhere, visibility: { in: PUBLIC_VISIBILITY } };

    if (favoriteTempleIds.length > 0) {
      [favoriteEvents, otherEvents] = await Promise.all([
        prisma.event.findMany({
          where: { ...publicWhere, templeId: { in: favoriteTempleIds } },
          include: INCLUDE,
          orderBy: { eventDate: "asc" },
          take: 20,
        }),
        prisma.event.findMany({
          where: { ...publicWhere, templeId: { notIn: favoriteTempleIds } },
          include: INCLUDE,
          orderBy: { eventDate: "asc" },
          take: 20,
        }),
      ]);
    } else {
      otherEvents = await prisma.event.findMany({
        where: publicWhere,
        include: INCLUDE,
        orderBy: { eventDate: "asc" },
        take: 40,
      });
    }
  }

  const allEventIds = [...myTempleEvents, ...favoriteEvents, ...otherEvents].map((e) => e.id);
  const myParticipationMap: Record<string, string> = {};
  if (authUser.member && allEventIds.length > 0) {
    const myParts = await prisma.eventParticipation.findMany({
      where: {
        memberId: authUser.member.id,
        eventId: { in: allEventIds },
        status: { not: "CANCELLED" },
      },
      select: { eventId: true, status: true },
    });
    myParts.forEach((p) => { myParticipationMap[p.eventId] = p.status; });
  }

  const categories = ["ZAZEN", "SHAKYO", "YOGA", "MINDFULNESS", "LECTURE", "SEASONAL", "OTHER"];
  const hasAnyEvents =
    myTempleEvents.length > 0 || favoriteEvents.length > 0 || otherEvents.length > 0;

  return (
    <div className="max-w-lg mx-auto pb-28">
      {/* ヘッダー */}
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800 tracking-tight">イベント</h1>
        <Link
          href="/app/events/my"
          className="flex items-center gap-1 text-xs text-amber-700 font-semibold bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200 hover:bg-amber-100 transition-colors"
        >
          <CheckCircle size={12} />
          申込済み
        </Link>
      </div>

      {/* カテゴリフィルタ */}
      <div className="flex gap-2 overflow-x-auto px-5 pb-4 scrollbar-hide">
        <Link
          href="/app/events"
          className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
            !category
              ? "bg-amber-700 text-white shadow-sm"
              : "bg-white text-stone-500 border border-stone-200 hover:border-amber-300"
          }`}
        >
          すべて
        </Link>
        {categories.map((c) => (
          <Link
            key={c}
            href={`/app/events?category=${c}`}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              category === c
                ? "bg-amber-700 text-white shadow-sm"
                : "bg-white text-stone-500 border border-stone-200 hover:border-amber-300"
            }`}
          >
            {getCategoryIcon(c)} {getCategoryLabel(c)}
          </Link>
        ))}
      </div>

      <div className="px-4 space-y-6">
        {!hasAnyEvents && (
          <div className="bg-white rounded-2xl border border-stone-100 p-12 text-center shadow-sm">
            <p className="text-stone-400 text-sm">開催予定のイベントはありません</p>
          </div>
        )}

        {/* 檀家: 自寺院イベント */}
        {isDanka && myTempleEvents.length > 0 && (
          <section>
            <SectionLabel>
              {myTempleEvents[0].temple.name}のイベント
            </SectionLabel>
            <div className="space-y-3">
              {myTempleEvents.map((event) => (
                <EventCard key={event.id} event={event} showTemple={false}
                  myStatus={myParticipationMap[event.id]} />
              ))}
            </div>
          </section>
        )}

        {/* ご縁さん: フォロー0件の誘導バナー */}
        {!isDanka && favoriteTempleIds.length === 0 && (
          <Link
            href="/app/temples"
            className="flex items-center gap-4 bg-gradient-to-r from-rose-50 to-amber-50 rounded-2xl border border-rose-100 px-4 py-4 hover:shadow-md transition-all"
          >
            <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0">
              <Heart size={20} className="text-rose-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-stone-800">お気に入りのお寺をフォローしよう</p>
              <p className="text-xs text-stone-500 mt-0.5">
                フォローするとそのお寺のイベントがここに表示されます
              </p>
            </div>
            <span className="shrink-0 text-xs font-semibold text-amber-700 bg-white px-3 py-1.5 rounded-full border border-amber-200 shadow-sm whitespace-nowrap">
              お寺を探す
            </span>
          </Link>
        )}

        {/* ご縁さん: お気に入り寺院 */}
        {!isDanka && favoriteEvents.length > 0 && (
          <section>
            <SectionLabel>お気に入りのお寺</SectionLabel>
            <div className="space-y-3">
              {favoriteEvents.map((event) => (
                <EventCard key={event.id} event={event} showTemple={true}
                  myStatus={myParticipationMap[event.id]} />
              ))}
            </div>
          </section>
        )}

        {/* その他 */}
        {otherEvents.length > 0 && (
          <section>
            {isDanka && myTempleId && (
              <SectionLabel>他のお寺のイベント</SectionLabel>
            )}
            {!isDanka && favoriteEvents.length > 0 && (
              <SectionLabel>すべてのお寺のイベント</SectionLabel>
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
    <div className="flex items-center gap-2 mb-3">
      <div className="h-px flex-1 bg-stone-100" />
      <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest whitespace-nowrap">
        {children}
      </span>
      <div className="h-px flex-1 bg-stone-100" />
    </div>
  );
}
