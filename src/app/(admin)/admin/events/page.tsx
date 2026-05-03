import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExportButton from "@/components/admin/ExportButton";
import { getCategoryLabel } from "@/lib/eventCategories";
import { CalendarDays, Users, Plus, ChevronRight, ExternalLink } from "lucide-react";

const STATUS_TABS = [
  { value: "", label: "すべて" },
  { value: "DRAFT", label: "下書き" },
  { value: "PUBLISHED", label: "公開中" },
  { value: "CLOSED", label: "募集終了" },
  { value: "COMPLETED", label: "完了" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-stone-100 text-stone-600",
  PUBLISHED: "bg-teal-100 text-teal-800 border border-teal-200",
  CLOSED: "bg-amber-100 text-amber-800",
  COMPLETED: "bg-stone-100 text-stone-400",
  CANCELLED: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "下書き",
  PUBLISHED: "公開中",
  CLOSED: "募集終了",
  COMPLETED: "完了",
  CANCELLED: "キャンセル",
};

interface SearchParams {
  status?: string;
}

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role === "MEMBER") redirect("/app");

  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(authUser.role);
  const { status } = await searchParams;

  const where: Record<string, unknown> = { templeId: authUser.templeId };
  if (status) where.status = status;

  const events = await prisma.event.findMany({
    where,
    orderBy: { eventDate: "desc" },
    include: {
      _count: {
        select: { participations: { where: { status: { notIn: ["CANCELLED"] } } } },
      },
    },
  });

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 tracking-tight">イベント管理</h1>
          <p className="text-sm text-stone-400 mt-0.5">{events.length} 件</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <ExportButton href="/api/export/events" label="CSV出力" filename="events.csv" />
          )}
          <Link
            href="/admin/events/new"
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-700 text-white text-sm rounded-xl hover:bg-amber-800 transition-colors font-medium"
          >
            <Plus size={14} />
            新規作成
          </Link>
        </div>
      </div>

      {/* ステータスタブ */}
      <div className="flex gap-1 bg-stone-100 rounded-xl p-1 w-fit mb-5 flex-wrap">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/events${tab.value ? `?status=${tab.value}` : ""}`}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              (status ?? "") === tab.value
                ? "bg-white text-amber-800 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* リスト */}
      {events.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-14 text-center">
          <CalendarDays size={32} className="text-stone-200 mx-auto mb-3" />
          <p className="text-stone-400 text-sm mb-4">イベントがありません</p>
          <Link
            href="/admin/events/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-700 text-white text-sm rounded-xl hover:bg-amber-800 transition-colors font-medium"
          >
            <Plus size={14} />
            最初のイベントを作成する
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event) => {
            const isFull = event.capacity != null && event._count.participations >= event.capacity;
            return (
              <div
                key={event.id}
                className="bg-white rounded-2xl border border-stone-100 shadow-sm px-5 py-4 flex items-center gap-4 hover:border-amber-200 hover:shadow-md transition-all"
              >
                {/* 日付アイコン */}
                <div className="w-12 h-12 rounded-2xl bg-amber-50 flex flex-col items-center justify-center shrink-0 border border-amber-100">
                  <p className="text-[10px] text-amber-600 font-bold leading-none">
                    {event.eventDate.toLocaleDateString("ja-JP", { month: "short" })}
                  </p>
                  <p className="text-xl font-bold text-amber-800 leading-tight">
                    {event.eventDate.getDate()}
                  </p>
                </div>

                {/* 内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COLORS[event.status]}`}>
                      {STATUS_LABELS[event.status]}
                    </span>
                    <span className="text-xs text-stone-400">{getCategoryLabel(event.category)}</span>
                  </div>
                  <p className="text-sm font-semibold text-stone-800 truncate">{event.title}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1 text-xs text-stone-400">
                      <CalendarDays size={11} />
                      {event.eventDate.toLocaleDateString("ja-JP", { month: "short", day: "numeric" })}
                      {event.startTime && ` ${event.startTime}`}
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <Users size={11} className={isFull ? "text-red-500" : "text-stone-400"} />
                      <span className={isFull ? "text-red-600 font-semibold" : "text-stone-400"}>
                        {event._count.participations}
                        {event.capacity ? `/${event.capacity}` : ""}名
                      </span>
                    </div>
                  </div>
                </div>

                {/* アクション */}
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/admin/events/${event.id}/participants`}
                    className="text-xs text-stone-500 hover:text-teal-700 hover:bg-teal-50 px-2.5 py-1.5 rounded-lg transition-colors font-medium"
                  >
                    参加者
                  </Link>
                  {event.status === "PUBLISHED" && (
                    <Link
                      href={`/events/${event.id}`}
                      target="_blank"
                      className="text-xs text-stone-500 hover:text-sky-700 hover:bg-sky-50 p-1.5 rounded-lg transition-colors"
                    >
                      <ExternalLink size={13} />
                    </Link>
                  )}
                  <Link
                    href={`/admin/events/${event.id}/edit`}
                    className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 hover:bg-amber-50 px-2.5 py-1.5 rounded-lg transition-colors font-semibold"
                  >
                    編集
                    <ChevronRight size={12} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
