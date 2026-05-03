import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import MemberFilters from "./MemberFilters";
import ExportButton from "@/components/admin/ExportButton";
import { logFeature } from "@/lib/featureLog";
import { ChevronRight, UserPlus } from "lucide-react";

const PAGE_SIZE = 50;

const TAG_COLORS: Record<string, string> = {
  要フォロー: "bg-amber-100 text-amber-800",
  要注意: "bg-red-100 text-red-700",
  VIP: "bg-green-100 text-green-800",
  体調注意: "bg-orange-100 text-orange-700",
  遠方: "bg-blue-100 text-blue-700",
  一人暮らし: "bg-purple-100 text-purple-700",
  跡継ぎ不在: "bg-stone-100 text-stone-600",
};

interface SearchParams {
  search?: string;
  page?: string;
  tag?: string;
}

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role === "MEMBER") redirect("/app");

  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(authUser.role);
  const { search = "", page: pageStr = "1", tag } = await searchParams;
  const page = Math.max(1, parseInt(pageStr));

  if (tag) void logFeature(authUser.templeId, authUser.id, "tag_filter", tag);

  const searchFilter = search
    ? {
        OR: [
          { user: { name: { contains: search, mode: "insensitive" as const } } },
          { familyName: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const where = {
    templeId: authUser.templeId,
    ...(tag ? { priorityTags: { has: tag } } : {}),
    ...searchFilter,
  };

  const [members, total] = await Promise.all([
    prisma.member.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.member.count({ where }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-4 sm:p-6 max-w-5xl">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 tracking-tight">フォロワー管理</h1>
          <p className="text-sm text-stone-400 mt-0.5">{total.toLocaleString()} 名</p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <ExportButton href="/api/export/members" label="CSV出力" filename="members.csv" />
            <Link
              href="/admin/members/import"
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-stone-200 rounded-xl text-stone-600 hover:bg-stone-50 transition-colors"
            >
              <UserPlus size={14} />
              一括登録
            </Link>
          </div>
        )}
      </div>

      {/* フィルター */}
      <Suspense fallback={<div className="h-12" />}>
        <MemberFilters
          currentSearch={search}
          currentTag={tag}
        />
      </Suspense>

      {/* リスト */}
      <div className="mt-4 space-y-2">
        {members.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-14 text-center">
            <p className="text-stone-400 text-sm">該当するフォロワーが見つかりません</p>
          </div>
        ) : (
          members.map((member) => (
            <Link
              key={member.id}
              href={`/admin/members/${member.id}`}
              className="flex items-center gap-4 bg-white rounded-2xl border border-stone-100 shadow-sm px-5 py-4 hover:border-amber-200 hover:shadow-md transition-all"
            >
              {/* アバター */}
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-stone-500 to-stone-700 flex items-center justify-center text-white font-bold text-base shrink-0">
                {member.user.name.charAt(0)}
              </div>

              {/* 名前・家名 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-stone-800 text-sm">{member.user.name}</span>
                  {member.familyName && (
                    <span className="text-xs text-stone-400">{member.familyName}家</span>
                  )}
                </div>
                {member.summaryNote && (
                  <p className="text-xs text-stone-400 mt-1 truncate">{member.summaryNote}</p>
                )}
                {member.priorityTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {member.priorityTags.map((t) => (
                      <span key={t} className={`px-2 py-0.5 rounded-md text-xs font-medium ${TAG_COLORS[t] ?? "bg-stone-100 text-stone-600"}`}>
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 登録日 */}
              <div className="text-right shrink-0 hidden sm:block">
                <p className="text-xs text-stone-400">登録</p>
                <p className="text-xs text-stone-600 font-medium mt-0.5">
                  {member.joinedDate.toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" })}
                </p>
              </div>

              <ChevronRight size={16} className="text-stone-300 shrink-0" />
            </Link>
          ))
        )}
      </div>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-5">
          <p className="text-sm text-stone-400">
            {(page - 1) * PAGE_SIZE + 1}〜{Math.min(page * PAGE_SIZE, total)} 件 / 全 {total} 件
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/members?search=${search}&page=${page - 1}`}
                className="px-4 py-2 text-sm border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors"
              >
                ← 前へ
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/members?search=${search}&page=${page + 1}`}
                className="px-4 py-2 text-sm bg-amber-700 text-white rounded-xl hover:bg-amber-800 transition-colors"
              >
                次へ →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
