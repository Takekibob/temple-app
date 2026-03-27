import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const CATEGORY_LABELS: Record<string, string> = {
  ZAZEN: "坐禅", SHAKYO: "写経", YOGA: "ヨガ",
  MINDFULNESS: "マインドフルネス", LECTURE: "仏事講座",
  SEASONAL: "季節行事", OTHER: "その他",
};

const STATUS_LABELS: Record<string, string> = {
  APPLIED: "確認待ち",
  CONFIRMED: "参加確定",
  WAITLISTED: "キャンセル待ち",
  ATTENDED: "参加済み",
  NO_SHOW: "不参加",
  CANCELLED: "キャンセル",
};

const STATUS_COLORS: Record<string, string> = {
  APPLIED: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-teal-100 text-teal-800",
  WAITLISTED: "bg-stone-100 text-stone-600",
  ATTENDED: "bg-green-100 text-green-800",
  NO_SHOW: "bg-stone-100 text-stone-400",
  CANCELLED: "bg-stone-100 text-stone-400",
};

export default async function MyEventsPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");
  if (!authUser.member) redirect("/app");

  const participations = await prisma.eventParticipation.findMany({
    where: { memberId: authUser.member.id },
    include: { event: true },
    orderBy: { event: { eventDate: "asc" } },
  });

  const now = new Date();
  const upcoming = participations.filter(
    (p) => p.event.eventDate >= now && p.status !== "CANCELLED"
  );
  const past = participations.filter(
    (p) => p.event.eventDate < now || p.status === "CANCELLED"
  );

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-stone-800">申込済みイベント</h1>
        <Link href="/app/events" className="text-xs text-amber-700 hover:underline">
          イベント一覧 →
        </Link>
      </div>

      {upcoming.length === 0 && past.length === 0 && (
        <div className="bg-white rounded-xl border border-stone-200 p-10 text-center text-stone-400 text-sm">
          申込中のイベントはありません
          <br />
          <Link href="/app/events" className="text-amber-700 text-sm hover:underline mt-2 inline-block">
            イベントを探す →
          </Link>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-stone-500 mb-2">今後のイベント</h2>
          <ul className="space-y-3">
            {upcoming.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/app/events/${p.event.id}`}
                  className="block bg-white rounded-xl border border-stone-200 p-4 hover:border-amber-200 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-amber-700 font-medium mb-0.5">
                        {CATEGORY_LABELS[p.event.category]}
                      </p>
                      <p className="font-semibold text-stone-800">{p.event.title}</p>
                      <p className="text-xs text-stone-500 mt-1">
                        {p.event.eventDate.toLocaleDateString("ja-JP", {
                          month: "long",
                          day: "numeric",
                          weekday: "short",
                        })}{" "}
                        {p.event.startTime}
                      </p>
                      <p className="text-xs text-stone-400 mt-0.5">{p.numGuests}名で申込</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]}`}>
                      {STATUS_LABELS[p.status]}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-stone-500 mb-2">過去のイベント</h2>
          <ul className="space-y-2">
            {past.map((p) => (
              <li key={p.id} className="bg-white rounded-xl border border-stone-100 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-stone-700">{p.event.title}</p>
                    <p className="text-xs text-stone-400 mt-0.5">
                      {p.event.eventDate.toLocaleDateString("ja-JP")}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[p.status]}`}>
                    {STATUS_LABELS[p.status]}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
