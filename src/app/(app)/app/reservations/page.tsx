import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CalendarDays, Clock, ChevronRight, Plus, Scroll } from "lucide-react";

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
  COMPLETED: "完了",
  CANCELLED: "キャンセル",
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border border-amber-200",
  CONFIRMED: "bg-teal-50 text-teal-700 border border-teal-200",
  COMPLETED: "bg-stone-100 text-stone-500",
  CANCELLED: "bg-red-50 text-red-600 border border-red-100",
};

export default async function ReservationsPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");

  if (!authUser.member || authUser.member.type !== "DANKA") {
    redirect("/app");
  }

  const reservations = await prisma.reservation.findMany({
    where: { memberId: authUser.member.id },
    include: { deceasedPerson: { select: { name: true } } },
    orderBy: { scheduledAt: "asc" },
  });

  const now = new Date();
  const oneYearAgo = new Date(now);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  // upcoming: 早い順（asc のまま）、past: 新しい順（reverse）
  const upcoming = reservations.filter(
    (r) => r.status !== "CANCELLED" && r.status !== "COMPLETED" && r.scheduledAt > now
  );
  const allPast = reservations
    .filter((r) => r.status === "COMPLETED" || r.status === "CANCELLED" || r.scheduledAt <= now)
    .reverse();
  const recentPast = allPast.filter((r) => r.scheduledAt >= oneYearAgo);
  const olderCount = allPast.filter((r) => r.scheduledAt < oneYearAgo).length;

  const next = upcoming[0] ?? null;

  return (
    <div className="max-w-lg mx-auto pb-28">
      {/* ヘッダー */}
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-800 tracking-tight">法要予約</h1>
        <Link
          href="/app/reservations/new"
          className="flex items-center gap-1.5 text-xs text-white font-semibold bg-amber-700 px-3 py-1.5 rounded-full shadow-sm hover:bg-amber-800 transition-colors"
        >
          <Plus size={13} />
          新規予約
        </Link>
      </div>

      <div className="px-4 space-y-5">
        {/* 直近の予約ハイライト */}
        {next ? (
          <Link
            href={`/app/reservations/${next.id}`}
            className="block bg-gradient-to-br from-amber-700 to-amber-800 rounded-2xl p-5 shadow-md text-white hover:from-amber-800 hover:to-amber-900 transition-colors"
          >
            <p className="text-xs font-semibold text-amber-200 uppercase tracking-widest mb-2">次の法要</p>
            <p className="text-xl font-bold mb-1">{TYPE_LABELS[next.type] ?? next.type}</p>
            {next.deceasedPerson && (
              <p className="text-sm text-amber-100 mb-3">{next.deceasedPerson.name}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-amber-100">
              <span className="flex items-center gap-1.5">
                <CalendarDays size={14} />
                {next.scheduledAt.toLocaleDateString("ja-JP", {
                  month: "long", day: "numeric", weekday: "short",
                })}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={14} />
                {next.scheduledAt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                next.status === "CONFIRMED"
                  ? "bg-white/20 text-white"
                  : "bg-amber-500/50 text-amber-100"
              }`}>
                {STATUS_LABELS[next.status]}
              </span>
              <ChevronRight size={18} className="text-amber-300" />
            </div>
          </Link>
        ) : (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-8 text-center">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Scroll size={22} className="text-amber-600" />
            </div>
            <p className="text-stone-500 text-sm font-medium mb-1">予定している法要はありません</p>
            <Link
              href="/app/reservations/new"
              className="text-amber-700 text-sm font-semibold hover:underline"
            >
              法要を予約する →
            </Link>
          </div>
        )}

        {/* その他の予定（2件目以降） */}
        {upcoming.length > 1 && (
          <section>
            <SectionLabel>その他の予定</SectionLabel>
            <div className="space-y-2.5">
              {upcoming.slice(1).map((r) => (
                <ReservationRow key={r.id} r={r} />
              ))}
            </div>
          </section>
        )}

        {/* 過去の予約 */}
        {recentPast.length > 0 && (
          <section>
            <SectionLabel>過去の予約（直近1年）</SectionLabel>
            <div className="space-y-2.5">
              {recentPast.map((r) => (
                <ReservationRow key={r.id} r={r} past />
              ))}
            </div>
            {olderCount > 0 && (
              <p className="text-xs text-stone-400 text-center mt-3">
                他に{olderCount}件の過去の予約があります（1年以上前）
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function ReservationRow({
  r,
  past,
}: {
  r: {
    id: string;
    type: string;
    status: string;
    scheduledAt: Date;
    durationMin: number;
    deceasedPerson: { name: string } | null;
  };
  past?: boolean;
}) {
  return (
    <Link
      href={`/app/reservations/${r.id}`}
      className={`flex items-center justify-between bg-white rounded-2xl border p-4 transition-all hover:shadow-sm ${
        past
          ? "border-stone-100 hover:border-stone-200"
          : "border-stone-100 hover:border-amber-200"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
          past ? "bg-stone-100" : "bg-amber-50"
        }`}>
          <CalendarDays size={16} className={past ? "text-stone-400" : "text-amber-700"} />
        </div>
        <div>
          <p className={`text-sm font-semibold ${past ? "text-stone-500" : "text-stone-800"}`}>
            {TYPE_LABELS[r.type] ?? r.type}
          </p>
          {r.deceasedPerson && (
            <p className="text-xs text-stone-400">{r.deceasedPerson.name}</p>
          )}
          <p className="text-xs text-stone-400 mt-0.5">
            {r.scheduledAt.toLocaleDateString("ja-JP", {
              year: "numeric", month: "long", day: "numeric", weekday: "short",
            })}
            {" "}
            {r.scheduledAt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-2">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[r.status]}`}>
          {STATUS_LABELS[r.status]}
        </span>
        <ChevronRight size={15} className="text-stone-300" />
      </div>
    </Link>
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
