import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Bell, Plus, ChevronRight } from "lucide-react";

const SEGMENT_LABELS: Record<string, string> = {
  ALL: "全員",
  DANKA: "檀家のみ",
  GOEN: "ご縁さんのみ",
};

const SEGMENT_COLORS: Record<string, string> = {
  ALL: "bg-stone-100 text-stone-600",
  DANKA: "bg-amber-100 text-amber-800",
  GOEN: "bg-teal-100 text-teal-800",
};

export default async function AdminAnnouncementsPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/");
  if (authUser.role === "MEMBER") redirect("/app");

  const announcements = await prisma.announcement.findMany({
    where: { templeId: authUser.templeId, memberId: null },
    orderBy: { createdAt: "desc" },
  });

  const publishedCount = announcements.filter((a) => a.publishedAt).length;
  const draftCount = announcements.filter((a) => !a.publishedAt).length;

  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 tracking-tight">お知らせ管理</h1>
          <p className="text-sm text-stone-400 mt-0.5">
            公開中 {publishedCount} 件　下書き {draftCount} 件
          </p>
        </div>
        <Link
          href="/admin/announcements/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-700 text-white text-sm rounded-xl hover:bg-amber-800 transition-colors font-medium"
        >
          <Plus size={14} />
          新規作成
        </Link>
      </div>

      {/* リスト */}
      {announcements.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-14 text-center">
          <div className="w-14 h-14 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Bell size={24} className="text-stone-300" />
          </div>
          <p className="text-stone-400 text-sm mb-4">お知らせがありません</p>
          <Link
            href="/admin/announcements/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-700 text-white text-sm rounded-xl hover:bg-amber-800 transition-colors font-medium"
          >
            <Plus size={14} />
            最初のお知らせを作成する
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {announcements.map((a) => (
            <Link
              key={a.id}
              href={`/admin/announcements/${a.id}/edit`}
              className="flex items-center gap-4 bg-white rounded-2xl border border-stone-100 shadow-sm px-5 py-4 hover:border-amber-200 hover:shadow-md transition-all"
            >
              {/* アイコン */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                a.publishedAt ? "bg-teal-50" : "bg-stone-100"
              }`}>
                <Bell size={16} className={a.publishedAt ? "text-teal-600" : "text-stone-400"} />
              </div>

              {/* 内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  {a.publishedAt ? (
                    <span className="text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                      公開中
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
                      下書き
                    </span>
                  )}
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SEGMENT_COLORS[a.targetSegment]}`}>
                    {SEGMENT_LABELS[a.targetSegment]}向け
                  </span>
                </div>
                <p className="text-sm font-semibold text-stone-800 truncate">{a.title}</p>
                <p className="text-xs text-stone-400 mt-0.5">
                  {a.publishedAt
                    ? `公開: ${a.publishedAt.toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" })}`
                    : `作成: ${a.createdAt.toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" })}`}
                </p>
              </div>

              <ChevronRight size={16} className="text-stone-300 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
