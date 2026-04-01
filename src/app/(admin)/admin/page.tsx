import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import DashboardCharts, { ChartDataPoint } from "./DashboardCharts";

export default async function AdminDashboardPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");
  if (authUser.role === "MEMBER") redirect("/app");

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);
  const twoWeeksLater = new Date(todayStart.getTime() + 14 * 86400000);
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const currentFiscalYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;

  // KPI queries in parallel
  const [
    todayReservations,
    dankaCount,
    goenCount,
    monthlyEventSignups,
    conversionCandidates,
    recentReservations,
    recentMembers,
    recentEventSignups,
    upcomingEvents,
    upcomingFollowups,
    recentInteractions,
    unpaidGojikai,
    churnRisk,
    scoreUpMembers,
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
    // グラフ用: 過去6ヶ月の会員登録
    prisma.member.findMany({
      where: { templeId: authUser.templeId, createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true, type: true },
    }),
    // グラフ用: 過去6ヶ月のイベント申込
    prisma.eventParticipation.findMany({
      where: {
        event: { templeId: authUser.templeId },
        createdAt: { gte: sixMonthsAgo },
        status: { notIn: ["CANCELLED"] },
      },
      select: { createdAt: true },
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
    // 今後2週間のフォロー予定（未完了）
    prisma.memberNote.findMany({
      where: {
        templeId: authUser.templeId,
        noteType: "FOLLOWUP",
        isResolved: false,
        followupDate: { gte: todayStart, lte: twoWeeksLater },
      },
      include: {
        member: { include: { user: { select: { name: true } } } },
      },
      orderBy: { followupDate: "asc" },
      take: 10,
    }),
    // 最近の対応履歴（全スタッフ）
    prisma.memberNote.findMany({
      where: {
        templeId: authUser.templeId,
        noteType: "INTERACTION",
      },
      include: {
        member: { include: { user: { select: { name: true } } } },
        author: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    // 今年度の未納（檀家のみ）
    prisma.gojikaiPayment.findMany({
      where: {
        member: { templeId: authUser.templeId, type: "DANKA" },
        fiscalYear: currentFiscalYear,
        status: "UNPAID",
      },
      include: { member: { include: { user: { select: { name: true } } } } },
      orderBy: { member: { user: { name: "asc" } } },
      take: 8,
    }),
    // 離脱予兆（1年以上未接触）
    prisma.member.findMany({
      where: {
        templeId: authUser.templeId,
        type: "DANKA",
        OR: [
          { lastContactAt: { lte: oneYearAgo } },
          { lastContactAt: null, createdAt: { lte: oneYearAgo } },
        ],
      },
      include: { user: { select: { name: true } } },
      orderBy: [{ lastContactAt: "asc" }],
      take: 5,
    }),
    // スコアアップ通知（先月以降にスコアが上がったご縁さん）
    prisma.member.findMany({
      where: {
        templeId: authUser.templeId,
        type: "GOEN",
        engagementScore: { gte: 30 },
        updatedAt: { gte: oneMonthAgo },
      },
      include: { user: { select: { name: true } } },
      orderBy: { engagementScore: "desc" },
      take: 5,
    }),
  ]);

  // グラフデータを月別に集計（過去6ヶ月）
  const monthKeys = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const toMonthKey = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  const dankaByMonth: Record<string, number> = {};
  const goenByMonth: Record<string, number> = {};
  for (const m of recentMembers) {
    const key = toMonthKey(m.createdAt);
    if (m.type === "DANKA") dankaByMonth[key] = (dankaByMonth[key] ?? 0) + 1;
    else goenByMonth[key] = (goenByMonth[key] ?? 0) + 1;
  }

  const eventsByMonth: Record<string, number> = {};
  for (const s of recentEventSignups) {
    const key = toMonthKey(s.createdAt);
    eventsByMonth[key] = (eventsByMonth[key] ?? 0) + 1;
  }

  const chartData: ChartDataPoint[] = monthKeys.map((key) => ({
    month: key.slice(5).replace(/^0/, "") + "月",
    danka: dankaByMonth[key] ?? 0,
    goen: goenByMonth[key] ?? 0,
    events: eventsByMonth[key] ?? 0,
  }));

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

      {/* グラフ */}
      <DashboardCharts data={chartData} />

      {/* フォロー予定・対応履歴 */}
      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        {/* 今後2週間のフォロー予定 */}
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-stone-800">⏰ フォロー予定（2週間以内）</h2>
            <Link href="/admin/members" className="text-xs text-amber-700 hover:underline">
              会員一覧 →
            </Link>
          </div>
          {upcomingFollowups.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-4">予定はありません</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {upcomingFollowups.map((note) => (
                <li key={note.id} className="py-3">
                  <Link href={`/admin/members/${note.memberId}`} className="flex items-start gap-3 hover:opacity-70 transition-opacity">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-stone-800">
                        {note.member.user.name}
                      </p>
                      {note.title && (
                        <p className="text-xs text-stone-600 mt-0.5 truncate">{note.title}</p>
                      )}
                      <p className="text-xs text-stone-400 mt-0.5 line-clamp-1">{note.content}</p>
                    </div>
                    <span className="text-xs font-medium text-teal-700 shrink-0">
                      {note.followupDate
                        ? new Date(note.followupDate).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })
                        : ""}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 最近の対応履歴 */}
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-stone-800">📋 最近の対応履歴</h2>
            <Link href="/admin/members" className="text-xs text-amber-700 hover:underline">
              会員一覧 →
            </Link>
          </div>
          {recentInteractions.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-4">対応履歴がありません</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {recentInteractions.map((note) => (
                <li key={note.id} className="py-3">
                  <Link href={`/admin/members/${note.memberId}`} className="flex items-start gap-3 hover:opacity-70 transition-opacity">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-stone-800">
                        {note.member.user.name}
                        <span className="ml-2 text-xs font-normal text-stone-400">{note.author.name}</span>
                      </p>
                      {note.title && (
                        <p className="text-xs text-stone-600 mt-0.5 truncate">{note.title}</p>
                      )}
                      <p className="text-xs text-stone-400 mt-0.5 line-clamp-1">{note.content}</p>
                    </div>
                    <span className="text-xs text-stone-400 shrink-0">
                      {new Date(note.createdAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 未納アラート・離脱予兆・スコアアップ通知 */}
      <div className="grid lg:grid-cols-3 gap-6 mt-6">
        {/* 未納アラート */}
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-stone-800">
              💴 護持会費 未納
              {unpaidGojikai.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                  {unpaidGojikai.length}
                </span>
              )}
            </h2>
            <Link href="/admin/gojikai" className="text-xs text-amber-700 hover:underline">
              管理 →
            </Link>
          </div>
          {unpaidGojikai.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-4">未納なし ✅</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {unpaidGojikai.map((p) => (
                <li key={p.id} className="py-2.5">
                  <Link href={`/admin/members/${p.memberId}`} className="flex items-center justify-between hover:opacity-70">
                    <p className="text-sm text-stone-800">{p.member.user.name}</p>
                    <span className="text-xs font-medium text-red-600">¥{p.amount.toLocaleString()}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 離脱予兆 */}
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-stone-800">
              ⚠️ 離脱予兆
              {churnRisk.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">
                  {churnRisk.length}
                </span>
              )}
            </h2>
            <Link href="/admin/churn" className="text-xs text-amber-700 hover:underline">
              詳細 →
            </Link>
          </div>
          {churnRisk.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-4">問題なし ✅</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {churnRisk.map((m) => {
                const lastDate = m.lastContactAt ?? m.createdAt;
                const monthsAgo = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
                return (
                  <li key={m.id} className="py-2.5">
                    <Link href={`/admin/members/${m.id}`} className="flex items-center justify-between hover:opacity-70">
                      <p className="text-sm text-stone-800">{m.user.name}</p>
                      <span className="text-xs font-medium text-orange-600">{monthsAgo}ヶ月前</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* スコアアップ通知 */}
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-stone-800">⭐ スコアアップ</h2>
            <Link href="/admin/conversion" className="text-xs text-amber-700 hover:underline">
              転換管理 →
            </Link>
          </div>
          {scoreUpMembers.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-4">今月の変動なし</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {scoreUpMembers.map((m) => (
                <li key={m.id} className="py-2.5">
                  <Link href={`/admin/members/${m.id}`} className="flex items-center justify-between hover:opacity-70">
                    <p className="text-sm text-stone-800">{m.user.name}</p>
                    <span className="text-xs font-semibold text-teal-600">{m.engagementScore}pt</span>
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
          <Link href="/admin/analytics/features" className="px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-600 hover:bg-stone-50">
            機能利用ログ
          </Link>
          <Link href="/admin/churn" className="px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-600 hover:bg-stone-50">
            離脱予兆
          </Link>
        </div>
      </div>
    </div>
  );
}
