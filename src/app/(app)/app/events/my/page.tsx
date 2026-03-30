import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import { getCategoryLabel } from "@/lib/eventCategories";

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
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const upcoming = participations.filter(
    (p) => p.event.eventDate >= now && p.status !== "CANCELLED"
  );
  const allPast = participations.filter(
    (p) => p.event.eventDate < now || p.status === "CANCELLED"
  );
  const recentPast = allPast.filter((p) => p.event.eventDate >= oneYearAgo);
  const olderCount = allPast.filter((p) => p.event.eventDate < oneYearAgo).length;

  return (
    <div className="p-4 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-stone-800">申込済みイベント</h1>
        <Link href="/app/events" className="text-xs text-amber-700 hover:underline">
          イベント一覧 →
        </Link>
      </div>

      {upcoming.length === 0 && allPast.length === 0 && (
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
                        {getCategoryLabel(p.event.category)}
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

      {(recentPast.length > 0 || olderCount > 0) && (
        <div>
          <h2 className="text-sm font-medium text-stone-500 mb-2">過去のイベント（直近1年）</h2>
          <ul className="space-y-2">
            {recentPast.map((p) => (
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
          {olderCount > 0 && (
            <p className="text-xs text-stone-400 text-center mt-3">
              他に{olderCount}件の参加履歴があります（1年以上前）
            </p>
          )}
        </div>
      )}
    </div>
  );
}
