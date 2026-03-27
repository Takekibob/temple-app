import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { AnnouncementTarget } from "@/generated/prisma/enums";

const CATEGORY_LABELS: Record<string, string> = {
  ZAZEN: "坐禅", SHAKYO: "写経", YOGA: "ヨガ",
  MINDFULNESS: "マインドフルネス", LECTURE: "仏事講座",
  SEASONAL: "季節行事", OTHER: "その他",
};

const RESERVATION_TYPE_LABELS: Record<string, string> = {
  ANNUAL_MEMORIAL: "年忌法要",
  MONTHLY_MEMORIAL: "月命日",
  NIBON: "初盆・お盆",
  KUYO: "供養",
  FUNERAL: "葬儀",
  OTHER: "その他",
};

export default async function AppHomePage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");

  const isDanka = authUser.member?.type === "DANKA";
  const isGoen = authUser.member?.type === "GOEN";
  const now = new Date();

  // 次回予約（檀家のみ）
  const nextReservation = isDanka && authUser.member
    ? await prisma.reservation.findFirst({
        where: {
          memberId: authUser.member.id,
          scheduledAt: { gte: now },
          status: { in: ["PENDING", "CONFIRMED"] },
        },
        orderBy: { scheduledAt: "asc" },
      })
    : null;

  // 今後のイベント（自分が申込済み）
  const upcomingParticipations = authUser.member
    ? await prisma.eventParticipation.findMany({
        where: {
          memberId: authUser.member.id,
          status: { in: ["APPLIED", "CONFIRMED"] },
          event: { eventDate: { gte: now } },
        },
        include: { event: { select: { id: true, title: true, eventDate: true, startTime: true, category: true } } },
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
      visibility: memberType === "DANKA"
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
  const allowedSegments: AnnouncementTarget[] = memberType === "DANKA"
    ? ["ALL", "DANKA"]
    : memberType === "GOEN"
    ? ["ALL", "GOEN"]
    : ["ALL"];

  const latestNews = await prisma.announcement.findMany({
    where: {
      templeId: authUser.templeId,
      publishedAt: { not: null, lte: now },
      targetSegment: { in: allowedSegments },
    },
    orderBy: { publishedAt: "desc" },
    take: 3,
    select: { id: true, title: true, publishedAt: true },
  });

  const displayName = authUser.member?.familyName ?? authUser.name;

  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* ヘッダー挨拶 */}
      <div className="mb-5 pt-2">
        <p className="text-xs text-stone-400">
          {isDanka ? "檀家" : isGoen ? "ご縁さん" : ""}
        </p>
        <h1 className="text-xl font-bold text-stone-800">
          こんにちは、{displayName}さん
        </h1>
      </div>

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
              href={`/app/reservations`}
              className="block bg-amber-50 border border-amber-200 rounded-xl p-4"
            >
              <p className="text-xs text-amber-700 font-medium mb-0.5">
                {nextReservation.scheduledAt.toLocaleDateString("ja-JP", {
                  year: "numeric", month: "long", day: "numeric", weekday: "short",
                })}
                {" "}
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
            <h2 className="text-sm font-semibold text-stone-600">申込済みイベント</h2>
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
                  <p className="text-xs text-amber-700 font-medium">{CATEGORY_LABELS[p.event.category]}</p>
                  <p className="font-medium text-stone-800 text-sm">{p.event.title}</p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {p.event.eventDate.toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}
                    {" "}{p.event.startTime}
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
                  <p className="text-xs text-amber-700 font-medium">{CATEGORY_LABELS[e.category]}</p>
                  <p className="font-medium text-stone-800 text-sm">{e.title}</p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {e.eventDate.toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}
                    {" "}{e.startTime}
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

      {/* ご縁さん向け: お寺情報 */}
      {isGoen && (
        <div className="bg-gradient-to-br from-amber-50 to-stone-50 rounded-xl border border-amber-100 p-4 text-center">
          <p className="text-sm text-stone-600 mb-1">お寺との縁を深めませんか？</p>
          <p className="text-xs text-stone-500 mb-3">坐禅・写経・ヨガなど様々なイベントを開催しています</p>
          <Link
            href="/app/events"
            className="inline-block px-4 py-2 bg-amber-700 text-white text-sm rounded-lg hover:bg-amber-800"
          >
            イベントを見る
          </Link>
        </div>
      )}
    </div>
  );
}
