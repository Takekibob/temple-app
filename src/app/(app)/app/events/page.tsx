import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CATEGORY_LABELS: Record<string, string> = {
  ZAZEN: "坐禅",
  SHAKYO: "写経",
  YOGA: "ヨガ",
  MINDFULNESS: "マインドフルネス",
  LECTURE: "仏事講座",
  SEASONAL: "季節行事",
  OTHER: "その他",
};

const CATEGORY_ICONS: Record<string, string> = {
  ZAZEN: "🧘",
  SHAKYO: "✍️",
  YOGA: "🌿",
  MINDFULNESS: "🕯️",
  LECTURE: "📖",
  SEASONAL: "🌸",
  OTHER: "🎋",
};

interface SearchParams {
  category?: string;
}

export default async function AppEventsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/auth/login");

  const { category } = await searchParams;
  const isDanka = authUser.member?.type === "DANKA";

  // Visibility filter
  const visibilityFilter = isDanka
    ? { in: ["PUBLIC", "MEMBERS_ONLY", "DANKA_ONLY"] as const }
    : { in: ["PUBLIC", "MEMBERS_ONLY"] as const };

  const where: Record<string, unknown> = {
    templeId: authUser.templeId,
    status: "PUBLISHED",
    visibility: visibilityFilter,
    eventDate: { gte: new Date(new Date().toDateString()) },
    ...(category ? { category } : {}),
  };

  const events = await prisma.event.findMany({
    where,
    orderBy: { eventDate: "asc" },
    take: 30,
    include: {
      _count: {
        select: { participations: { where: { status: { notIn: ["CANCELLED", "WAITLISTED"] } } } },
      },
    },
  });

  // My participations
  const myParticipationMap: Record<string, string> = {};
  if (authUser.member) {
    const myParts = await prisma.eventParticipation.findMany({
      where: {
        memberId: authUser.member.id,
        eventId: { in: events.map((e) => e.id) },
        status: { not: "CANCELLED" },
      },
      select: { eventId: true, status: true },
    });
    myParts.forEach((p) => {
      myParticipationMap[p.eventId] = p.status;
    });
  }

  const categories = ["ZAZEN", "SHAKYO", "YOGA", "MINDFULNESS", "LECTURE", "SEASONAL", "OTHER"];

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-stone-800">イベント</h1>
        <Link
          href="/app/events/my"
          className="text-xs text-amber-700 hover:underline"
        >
          申込済み →
        </Link>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        <Link
          href="/app/events"
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            !category
              ? "bg-amber-700 text-white border-amber-700"
              : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
          }`}
        >
          すべて
        </Link>
        {categories.map((c) => (
          <Link
            key={c}
            href={`/app/events?category=${c}`}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              category === c
                ? "bg-amber-700 text-white border-amber-700"
                : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
            }`}
          >
            {CATEGORY_ICONS[c]} {CATEGORY_LABELS[c]}
          </Link>
        ))}
      </div>

      {events.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-10 text-center text-stone-400 text-sm">
          開催予定のイベントはありません
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const isFull =
              event.capacity != null && event._count.participations >= event.capacity;
            const myStatus = myParticipationMap[event.id];
            const remaining =
              event.capacity != null ? event.capacity - event._count.participations : null;

            return (
              <Link
                key={event.id}
                href={`/app/events/${event.id}`}
                className="block bg-white rounded-xl border border-stone-200 overflow-hidden hover:border-amber-200 hover:shadow-sm transition-all"
              >
                {event.imageUrl && (
                  <div className="relative h-36 overflow-hidden bg-stone-100">
                    <Image
                      src={event.imageUrl}
                      alt={event.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 mb-1">
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
                      <p className="text-xs text-stone-500 mt-1">
                        {event.eventDate.toLocaleDateString("ja-JP", {
                          month: "long",
                          day: "numeric",
                          weekday: "short",
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
          })}
        </div>
      )}
    </div>
  );
}
