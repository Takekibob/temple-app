import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { EventCategory, EventVisibility } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";

const CATEGORY_LABELS: Record<string, string> = {
  ZAZEN: "坐禅", SHAKYO: "写経", YOGA: "ヨガ",
  MINDFULNESS: "マインドフルネス", LECTURE: "仏事講座",
  SEASONAL: "季節行事", OTHER: "その他",
};

const CATEGORY_ICONS: Record<string, string> = {
  ZAZEN: "🧘", SHAKYO: "✍️", YOGA: "🌿",
  MINDFULNESS: "🕯️", LECTURE: "📖", SEASONAL: "🌸", OTHER: "🎋",
};

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
      className="block bg-white rounded-xl border border-stone-200 overflow-hidden hover:border-amber-200 hover:shadow-sm transition-all"
    >
      {event.imageUrl && (
        <div className="relative h-36 overflow-hidden bg-stone-100">
          <Image src={event.imageUrl} alt={event.title} fill className="object-cover" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <span className="text-xs text-amber-700 font-medium">
                {CATEGORY_ICONS[event.category]} {CATEGORY_LABELS[event.category]}
              </span>
              {event.visibility === "DANKA_ONLY" && (
                <span className="text-xs text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded-full">
                  檀家限定
                </span>
              )}
            </div>
            <h3 className="font-semibold text-stone-800">{event.title}</h3>
            {showTemple && (
              <p className="text-xs text-amber-700 mt-0.5">
                🏯 {event.temple.name}
                {event.temple.denomination && `（${event.temple.denomination}）`}
              </p>
            )}
            <p className="text-xs text-stone-500 mt-1">
              {event.eventDate.toLocaleDateString("ja-JP", {
                month: "long", day: "numeric", weekday: "short",
              })}{" "}
              {event.startTime}〜{event.endTime}
            </p>
            {event.location && (
              <p className="text-xs text-stone-400 mt-0.5">📍 {event.location}</p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-bold text-amber-700">
              {event.fee === 0 ? "無料" : `¥${event.fee.toLocaleString()}`}
            </p>
            {myStatus ? (
              <span className="text-xs text-teal-600 font-medium">申込済</span>
            ) : isFull ? (
              <span className="text-xs text-stone-400">満席</span>
            ) : remaining !== null ? (
              <span className="text-xs text-stone-500">残{remaining}席</span>
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

  const baseWhere: Prisma.EventWhereInput = {
    status: "PUBLISHED",
    eventDate: { gte: today },
    ...(category ? { category: category as EventCategory } : {}),
    ...(denomination ? { temple: { denomination } } : {}),
  };

  const PUBLIC_VISIBILITY: EventVisibility[] = ["PUBLIC", "MEMBERS_ONLY"];

  // お気に入り寺院IDを取得（ご縁さん用）
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

  // 自分の申込状況
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
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-stone-800">🎋 イベント</h1>
        <Link href="/app/events/my" className="text-xs text-amber-700 hover:underline">
          申込済み →
        </Link>
      </div>

      {/* カテゴリフィルタ */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        <Link href="/app/events"
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            !category ? "bg-amber-700 text-white border-amber-700" : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
          }`}
        >
          すべて
        </Link>
        {categories.map((c) => (
          <Link key={c} href={`/app/events?category=${c}`}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              category === c ? "bg-amber-700 text-white border-amber-700" : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
            }`}
          >
            {CATEGORY_ICONS[c]} {CATEGORY_LABELS[c]}
          </Link>
        ))}
      </div>

      {!hasAnyEvents && (
        <div className="bg-white rounded-xl border border-stone-200 p-10 text-center text-stone-400 text-sm">
          開催予定のイベントはありません
        </div>
      )}

      {/* 檀家: 自寺院イベント */}
      {isDanka && myTempleEvents.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
            🏯 {myTempleEvents[0].temple.name}のイベント
          </h2>
          <div className="space-y-3">
            {myTempleEvents.map((event) => (
              <EventCard key={event.id} event={event} showTemple={false}
                myStatus={myParticipationMap[event.id]} />
            ))}
          </div>
        </section>
      )}

      {/* ご縁さん: お気に入り寺院イベント */}
      {!isDanka && favoriteEvents.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
            ♡ お気に入りのお寺
          </h2>
          <div className="space-y-3">
            {favoriteEvents.map((event) => (
              <EventCard key={event.id} event={event} showTemple={true}
                myStatus={myParticipationMap[event.id]} />
            ))}
          </div>
        </section>
      )}

      {/* その他寺院 */}
      {otherEvents.length > 0 && (
        <section>
          {(isDanka && myTempleId) && (
            <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
              他のお寺のイベント
            </h2>
          )}
          {(!isDanka && favoriteEvents.length > 0) && (
            <h2 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
              すべてのお寺のイベント
            </h2>
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
  );
}
