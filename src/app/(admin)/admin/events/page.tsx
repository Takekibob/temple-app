import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const STATUS_TABS = [
  { value: "", label: "すべて" },
  { value: "DRAFT", label: "下書き" },
  { value: "PUBLISHED", label: "公開中" },
  { value: "CLOSED", label: "募集終了" },
  { value: "COMPLETED", label: "完了" },
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  ZAZEN: "坐禅",
  SHAKYO: "写経",
  YOGA: "ヨガ",
  MINDFULNESS: "マインドフルネス",
  LECTURE: "仏事講座",
  SEASONAL: "季節行事",
  OTHER: "その他",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-stone-100 text-stone-600",
  PUBLISHED: "bg-teal-100 text-teal-800",
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
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">イベント管理</h1>
          <p className="text-sm text-stone-500 mt-0.5">全 {events.length} 件</p>
        </div>
        <Link
          href="/admin/events/new"
          className="px-4 py-2 bg-amber-700 text-white text-sm rounded-lg hover:bg-amber-800"
        >
          ＋ 新規作成
        </Link>
      </div>

      {/* Status tab filter */}
      <div className="flex gap-1 bg-white border border-stone-200 rounded-lg p-1 w-fit mb-4">
        {STATUS_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/events${tab.value ? `?status=${tab.value}` : ""}`}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              (status ?? "") === tab.value
                ? "bg-amber-700 text-white font-medium"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {events.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center text-stone-400 text-sm">
          イベントがありません
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="text-left px-4 py-3 text-stone-500 font-medium">タイトル</th>
                  <th className="text-left px-4 py-3 text-stone-500 font-medium">カテゴリ</th>
                  <th className="text-left px-4 py-3 text-stone-500 font-medium">開催日</th>
                  <th className="text-left px-4 py-3 text-stone-500 font-medium">参加者</th>
                  <th className="text-left px-4 py-3 text-stone-500 font-medium">ステータス</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-stone-800">{event.title}</td>
                    <td className="px-4 py-3 text-stone-600">
                      {CATEGORY_LABELS[event.category] ?? event.category}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {event.eventDate.toLocaleDateString("ja-JP")}
                      <span className="text-stone-400 ml-1 text-xs">
                        {event.startTime}〜{event.endTime}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {event._count.participations}
                      {event.capacity ? ` / ${event.capacity}` : ""}名
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[event.status]}`}>
                        {STATUS_LABELS[event.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Link
                          href={`/admin/events/${event.id}/participants`}
                          className="text-stone-500 hover:text-stone-800 text-xs"
                        >
                          参加者
                        </Link>
                        <Link
                          href={`/admin/events/${event.id}/edit`}
                          className="text-amber-700 hover:text-amber-900 text-xs font-medium"
                        >
                          編集 →
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
