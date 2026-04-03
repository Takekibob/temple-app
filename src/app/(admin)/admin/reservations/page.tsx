import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, AlertCircle, Plus, Settings } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  ANNUAL_MEMORIAL: "年忌法要",
  MONTHLY_MEMORIAL: "月命日",
  NIBON: "初盆・お盆",
  KUYO: "供養",
  FUNERAL: "葬儀",
  OTHER: "その他",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "確認待ち",
  CONFIRMED: "確定",
  COMPLETED: "実施済み",
  CANCELLED: "キャンセル",
  PAST: "実施済み",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 border border-amber-200",
  CONFIRMED: "bg-teal-100 text-teal-800 border border-teal-200",
  COMPLETED: "bg-stone-100 text-stone-600",
  CANCELLED: "bg-red-100 text-red-700",
  PAST: "bg-stone-100 text-stone-600",
};

interface SearchParams {
  month?: string;
  status?: string;
}

export default async function AdminReservationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role === "MEMBER") redirect("/app");

  const { month, status } = await searchParams;

  const now = new Date();
  const currentMonth = month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthStart = new Date(`${currentMonth}-01T00:00:00`);
  const monthEnd = new Date(monthStart);
  monthEnd.setMonth(monthEnd.getMonth() + 1);

  const where: Record<string, unknown> = {
    templeId: authUser.templeId,
    scheduledAt: { gte: monthStart, lt: monthEnd },
  };
  if (status === "PAST") {
    where.scheduledAt = { gte: monthStart, lt: now < monthEnd ? now : monthEnd };
    where.status = { not: "CANCELLED" };
  } else if (status === "PENDING" || status === "CONFIRMED") {
    where.status = status;
    where.scheduledAt = { gte: now < monthStart ? monthStart : now, lt: monthEnd };
  } else if (status) {
    where.status = status;
  }

  const reservations = await prisma.reservation.findMany({
    where,
    include: {
      member: { include: { user: { select: { name: true } } } },
      deceasedPerson: { select: { name: true } },
    },
    orderBy: { scheduledAt: "asc" },
  });

  const prevMonth = new Date(monthStart);
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  const nextMonth = new Date(monthStart);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const fmtMonth = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  const pendingCount = reservations.filter((r) => r.status === "PENDING").length;

  const STATUS_FILTERS = [
    { value: "", label: "すべて" },
    { value: "PENDING", label: "確認待ち" },
    { value: "CONFIRMED", label: "確定" },
    { value: "PAST", label: "実施済み" },
  ];

  return (
    <div className="p-6 max-w-4xl">
      {/* ヘッダー */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 tracking-tight">法要予約管理</h1>
          <p className="text-sm text-stone-400 mt-0.5">
            {monthStart.toLocaleDateString("ja-JP", { year: "numeric", month: "long" })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/reservations/blocks"
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-stone-200 rounded-xl text-stone-600 hover:bg-stone-50 transition-colors"
          >
            <Settings size={14} />
            予約不可日
          </Link>
          <Link
            href="/admin/reservations/new"
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-amber-700 text-white rounded-xl hover:bg-amber-800 transition-colors font-medium"
          >
            <Plus size={14} />
            代理予約入力
          </Link>
        </div>
      </div>

      {/* 確認待ちアラート */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-4">
          <AlertCircle size={18} className="text-amber-600 shrink-0" />
          <p className="text-sm font-semibold text-amber-800">
            確認待ちの予約が <span className="text-lg font-bold">{pendingCount}</span> 件あります
          </p>
          <Link
            href={`/admin/reservations?month=${currentMonth}&status=PENDING`}
            className="ml-auto text-xs font-semibold text-amber-700 hover:text-amber-900 underline shrink-0"
          >
            確認する
          </Link>
        </div>
      )}

      {/* 月ナビゲーション */}
      <div className="flex items-center gap-3 mb-4">
        <Link
          href={`/admin/reservations?month=${fmtMonth(prevMonth)}`}
          className="flex items-center gap-1 px-3 py-2 text-sm border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors text-stone-600"
        >
          <ChevronLeft size={14} />
          前月
        </Link>
        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-amber-600" />
          <span className="font-bold text-stone-800">
            {monthStart.toLocaleDateString("ja-JP", { year: "numeric", month: "long" })}
          </span>
        </div>
        <Link
          href={`/admin/reservations?month=${fmtMonth(nextMonth)}`}
          className="flex items-center gap-1 px-3 py-2 text-sm border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors text-stone-600"
        >
          次月
          <ChevronRight size={14} />
        </Link>
      </div>

      {/* ステータスフィルター */}
      <div className="flex gap-1 bg-stone-100 rounded-xl p-1 w-fit mb-5">
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/admin/reservations?month=${currentMonth}${f.value ? `&status=${f.value}` : ""}`}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              (status ?? "") === f.value
                ? "bg-white text-amber-800 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* 予約リスト */}
      {reservations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-14 text-center">
          <CalendarDays size={32} className="text-stone-200 mx-auto mb-3" />
          <p className="text-stone-400 text-sm">この月の予約はありません</p>
        </div>
      ) : (
        <ReservationCalendar reservations={reservations} />
      )}
    </div>
  );
}

function ReservationCalendar({
  reservations,
}: {
  reservations: Array<{
    id: string;
    type: string;
    scheduledAt: Date;
    durationMin: number;
    status: string;
    notes: string | null;
    memberEditedAt: Date | null;
    isAdminCreated: boolean;
    member: { user: { name: string } };
    deceasedPerson: { name: string } | null;
  }>;
}) {
  const now = new Date();
  const grouped = new Map<string, typeof reservations>();
  for (const r of reservations) {
    const key = r.scheduledAt.toLocaleDateString("ja-JP", {
      year: "numeric", month: "long", day: "numeric", weekday: "short",
    });
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(r);
  }

  return (
    <div className="space-y-3">
      {Array.from(grouped.entries()).map(([day, items]) => (
        <div key={day} className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          {/* 日付ヘッダー */}
          <div className="px-5 py-3 bg-stone-50 border-b border-stone-100 flex items-center gap-2">
            <CalendarDays size={14} className="text-amber-600" />
            <p className="text-sm font-bold text-stone-700">{day}</p>
            <span className="ml-auto text-xs text-stone-400">{items.length}件</span>
          </div>
          {/* 予約アイテム */}
          <ul className="divide-y divide-stone-50">
            {items.map((r) => {
              const displayStatus =
                r.status !== "CANCELLED" && r.scheduledAt < now ? "PAST" : r.status;
              return (
                <li key={r.id}>
                  <Link
                    href={`/admin/reservations/${r.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-stone-50 transition-colors"
                  >
                    {/* 時刻 */}
                    <div className="flex items-center gap-1.5 shrink-0 w-16">
                      <Clock size={13} className="text-stone-400" />
                      <span className="text-sm font-bold text-stone-700">
                        {r.scheduledAt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    {/* 内容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-stone-800">
                          {TYPE_LABELS[r.type] ?? r.type}
                        </span>
                        <span className="text-sm text-stone-600">{r.member.user.name}</span>
                        {r.deceasedPerson && (
                          <span className="text-xs text-stone-400">/ {r.deceasedPerson.name}</span>
                        )}
                      </div>
                      <p className="text-xs text-stone-400 mt-0.5">{r.durationMin}分</p>
                    </div>

                    {/* バッジ */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {r.isAdminCreated && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                          代理
                        </span>
                      )}
                      {r.memberEditedAt && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                          変更あり
                        </span>
                      )}
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[displayStatus]}`}>
                        {STATUS_LABELS[displayStatus]}
                      </span>
                      <ChevronRight size={14} className="text-stone-300" />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
