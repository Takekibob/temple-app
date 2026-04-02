import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-teal-100 text-teal-800",
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

  // Default to current month
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

  // Previous / next month
  const prevMonth = new Date(monthStart);
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  const nextMonth = new Date(monthStart);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const fmtMonth = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  const pendingCount = reservations.filter((r) => r.status === "PENDING").length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">法要予約管理</h1>
          {pendingCount > 0 && (
            <p className="text-sm text-amber-700 mt-0.5">確認待ち {pendingCount} 件</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/reservations/blocks"
            className="px-3 py-2 text-sm border border-stone-200 text-stone-600 rounded-lg hover:bg-stone-50"
          >
            予約不可日設定
          </Link>
          <Link
            href="/admin/reservations/new"
            className="px-3 py-2 text-sm bg-amber-700 text-white rounded-lg hover:bg-amber-800"
          >
            代理予約入力
          </Link>
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center gap-4 mb-4">
        <Link
          href={`/admin/reservations?month=${fmtMonth(prevMonth)}`}
          className="px-3 py-1.5 text-sm border border-stone-200 rounded-lg hover:bg-stone-50"
        >
          ← 前月
        </Link>
        <span className="font-medium text-stone-700">
          {monthStart.toLocaleDateString("ja-JP", { year: "numeric", month: "long" })}
        </span>
        <Link
          href={`/admin/reservations?month=${fmtMonth(nextMonth)}`}
          className="px-3 py-1.5 text-sm border border-stone-200 rounded-lg hover:bg-stone-50"
        >
          次月 →
        </Link>
      </div>

      {/* Status filter */}
      <div className="flex gap-1 bg-white border border-stone-200 rounded-lg p-1 w-fit mb-4">
        {[
          { value: "", label: "すべて" },
          { value: "PENDING", label: "確認待ち" },
          { value: "CONFIRMED", label: "確定" },
          { value: "PAST", label: "実施済み" },
        ].map((f) => (
          <Link
            key={f.value}
            href={`/admin/reservations?month=${currentMonth}${f.value ? `&status=${f.value}` : ""}`}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              (status ?? "") === f.value
                ? "bg-amber-700 text-white font-medium"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {/* Calendar-style list grouped by day */}
      {reservations.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center text-stone-400 text-sm">
          この月の予約はありません
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
  // Group by date
  const grouped = new Map<string, typeof reservations>();
  for (const r of reservations) {
    const key = r.scheduledAt.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short",
    });
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(r);
  }

  return (
    <div className="space-y-4">
      {Array.from(grouped.entries()).map(([day, items]) => (
        <div key={day} className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="px-4 py-2 bg-stone-50 border-b border-stone-100">
            <p className="text-sm font-medium text-stone-700">{day}</p>
          </div>
          <ul className="divide-y divide-stone-50">
            {items.map((r) => (
              <li key={r.id} className="px-4 py-3 hover:bg-stone-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-stone-700 w-12 flex-shrink-0">
                      {r.scheduledAt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-stone-800">
                          {TYPE_LABELS[r.type] ?? r.type}
                        </span>
                        <span className="text-xs text-stone-500">{r.member.user.name}</span>
                        {r.deceasedPerson && (
                          <span className="text-xs text-stone-400">/ {r.deceasedPerson.name}</span>
                        )}
                      </div>
                      <p className="text-xs text-stone-400 mt-0.5">{r.durationMin}分</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.isAdminCreated && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                        代理入力
                      </span>
                    )}
                    {r.memberEditedAt && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        内容変更あり
                      </span>
                    )}
                    {(() => {
                      const displayStatus =
                        r.status !== "CANCELLED" && r.scheduledAt < now
                          ? "PAST"
                          : r.status;
                      return (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[displayStatus]}`}>
                          {STATUS_LABELS[displayStatus]}
                        </span>
                      );
                    })()}
                    <Link
                      href={`/admin/reservations/${r.id}`}
                      className="text-amber-700 hover:text-amber-900 text-xs font-medium"
                    >
                      詳細 →
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
