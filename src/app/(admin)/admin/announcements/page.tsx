import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const SEGMENT_LABELS: Record<string, string> = {
  ALL: "全員",
  DANKA: "檀家",
  GOEN: "ご縁さん",
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

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-800">お知らせ管理</h1>
        <Link
          href="/admin/announcements/new"
          className="px-4 py-2 bg-amber-700 text-white text-sm rounded-lg hover:bg-amber-800 font-medium"
        >
          + 新規作成
        </Link>
      </div>

      {announcements.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-10 text-center text-stone-400 text-sm">
          お知らせがありません
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100">
          {announcements.map((a) => (
            <Link
              key={a.id}
              href={`/admin/announcements/${a.id}/edit`}
              className="flex items-center gap-4 px-5 py-4 hover:bg-stone-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SEGMENT_COLORS[a.targetSegment]}`}>
                    {SEGMENT_LABELS[a.targetSegment]}
                  </span>
                  {a.publishedAt ? (
                    <span className="text-xs text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">公開中</span>
                  ) : (
                    <span className="text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">下書き</span>
                  )}
                </div>
                <p className="font-medium text-stone-800 truncate">{a.title}</p>
                <p className="text-xs text-stone-400 mt-0.5">
                  {a.publishedAt
                    ? `公開: ${a.publishedAt.toLocaleDateString("ja-JP")}`
                    : `作成: ${a.createdAt.toLocaleDateString("ja-JP")}`}
                </p>
              </div>
              <span className="text-stone-300 text-sm shrink-0">›</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
