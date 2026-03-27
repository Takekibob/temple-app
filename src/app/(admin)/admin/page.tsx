import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboardPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");
  if (authUser.role === "MEMBER") redirect("/app");

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);

  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // KPI queries in parallel
  const [
    todayReservations,
    dankaCount,
    goenCount,
    monthlyEventSignups,
    conversionCandidates,
    recentReservations,
    upcomingEvents,
  ] = await Promise.all([
    // 本日の予約数
    prisma.reservation.count({
      where: {
        templeId: authUser.templeId,
        scheduledAt: { gte: todayStart, lt: todayEnd },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
    }),
    // 檀家数
    prisma.member.count({
      where: { templeId: authUser.templeId, type: "DANKA" },
    }),
    // ご縁さん数
    prisma.member.count({
      where: { templeId: authUser.templeId, type: "GOEN" },
    }),
    // 今月のイベント申込数（APPLIED + CONFIRMED）
    prisma.eventParticipation.count({
      where: {
        event: { templeId: authUser.templeId },
        status: { in: ["APPLIED", "CONFIRMED", "ATTENDED"] },
        createdAt: { gte: firstOfMonth },
      },
    }),
    // 転換候補数（ご縁さんでスコア70以上）
    prisma.member.count({
      where: { templeId: authUser.templeId, type: "GOEN", engagementScore: { gte: 70 } },
    }),
    // 本日の予約一覧
    prisma.reservation.findMany({
      where: {
        templeId: authUser.templeId,
        scheduledAt: { gte: todayStart, lt: todayEnd },
        status: { in: ["PENDING", "CONFIRMED"] },
      },
      include: { member: { include: { user: { select: { name: true } } } } },
      orderBy: { scheduledAt: "asc" },
    }),
    // 今後のイベント
    prisma.event.findMany({
      where: {
        templeId: authUser.templeId,
        status: "PUBLISHED",
        eventDate: { gte: now },
      },
      include: {
        _count: {
          select: {
            participations: { where: { status: { notIn: ["CANCELLED", "WAITLISTED"] } } },
          },
        },
      },
      orderBy: { eventDate: "asc" },
      take: 5,
    }),
  ]);

  const RESERVATION_TYPE_LABELS: Record<string, string> = {
    ANNUAL_MEMORIAL: "年忌法要",
    MONTHLY_MEMORIAL: "月命日",
    NIBON: "お盆",
    KUYO: "供養",
    FUNERAL: "葬儀",
    OTHER: "その他",
  };

  const RESERVATION_STATUS_LABELS: Record<string, string> = {
    PENDING: "確認待ち",
    CONFIRMED: "確定",
  };

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-stone-800 mb-6">ダッシュボード</h1>

      {/* KPI カード */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500 mb-1">本日の予約</p>
          <p className="text-3xl font-bold text-stone-800">{todayReservations}</p>
          <p className="text-xs text-stone-400 mt-1">件</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500 mb-1">檀家</p>
          <p className="text-3xl font-bold text-amber-700">{dankaCount}</p>
          <p className="text-xs text-stone-400 mt-1">名（アクティブ）</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500 mb-1">ご縁さん</p>
          <p className="text-3xl font-bold text-teal-700">{goenCount}</p>
          <p className="text-xs text-stone-400 mt-1">名（アクティブ）</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500 mb-1">今月の申込</p>
          <p className="text-3xl font-bold text-stone-800">{monthlyEventSignups}</p>
          <p className="text-xs text-stone-400 mt-1">件（イベント）</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500 mb-1">転換候補</p>
          <p className="text-3xl font-bold text-rose-600">{conversionCandidates}</p>
          <p className="text-xs text-stone-400 mt-1">名（スコア70+）</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 本日の予約 */}
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-stone-800">本日の予約</h2>
            <Link href="/admin/reservations" className="text-xs text-amber-700 hover:underline">
              すべて見る →
            </Link>
          </div>
          {recentReservations.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-4">本日の予約はありません</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {recentReservations.map((r) => (
                <li key={r.id} className="py-3">
                  <Link href={`/admin/reservations/${r.id}`} className="flex items-center justify-between hover:opacity-70 transition-opacity">
                    <div>
                      <p className="text-sm font-medium text-stone-800">
                        {r.scheduledAt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })} — {r.member.user.name}
                      </p>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {RESERVATION_TYPE_LABELS[r.type] ?? r.type}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      r.status === "CONFIRMED"
                        ? "bg-teal-100 text-teal-700"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {RESERVATION_STATUS_LABELS[r.status] ?? r.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 公開中のイベント */}
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-stone-800">公開中のイベント</h2>
            <Link href="/admin/events" className="text-xs text-amber-700 hover:underline">
              すべて見る →
            </Link>
          </div>
          {upcomingEvents.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-4">公開中のイベントはありません</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {upcomingEvents.map((e) => (
                <li key={e.id} className="py-3">
                  <Link href={`/admin/events/${e.id}/participants`} className="flex items-center justify-between hover:opacity-70 transition-opacity">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-stone-800 truncate">{e.title}</p>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {e.eventDate.toLocaleDateString("ja-JP", { month: "long", day: "numeric", weekday: "short" })}
                        {" "}{e.startTime}
                      </p>
                    </div>
                    <div className="text-right ml-3 shrink-0">
                      <p className="text-sm font-semibold text-stone-800">
                        {e._count.participations}
                        {e.capacity ? `/${e.capacity}` : ""}
                        <span className="text-xs font-normal text-stone-400">名</span>
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* クイックアクション */}
      <div className="mt-6 bg-stone-100 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-stone-600 mb-3">クイックアクション</h2>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/members" className="px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-600 hover:bg-stone-50">
            会員一覧
          </Link>
          <Link href="/admin/reservations" className="px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-600 hover:bg-stone-50">
            予約管理
          </Link>
          <Link href="/admin/events/new" className="px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-600 hover:bg-stone-50">
            イベント作成
          </Link>
          <Link href="/admin/announcements/new" className="px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-600 hover:bg-stone-50">
            お知らせ作成
          </Link>
          <Link href="/admin/conversion" className="px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-600 hover:bg-stone-50">
            転換管理
          </Link>
          <Link href="/admin/events/analytics" className="px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-600 hover:bg-stone-50">
            イベント分析
          </Link>
        </div>
      </div>
    </div>
  );
}
