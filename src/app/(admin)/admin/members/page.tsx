import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import MemberFilters from "./MemberFilters";
import ExportButton from "@/components/admin/ExportButton";
import { STAGE_LABELS, STAGE_COLORS } from "@/lib/scoring";
import { MemberStage } from "@/generated/prisma/client";
import { logFeature } from "@/lib/featureLog";

const PAGE_SIZE = 50;
const VALID_STAGES: MemberStage[] = ["GOEN", "PROSPECT", "DANKA_CANDIDATE", "DANKA"];

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
  type?: string;
  stage?: string;
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
  const { type, stage, search = "", page: pageStr = "1", tag } = await searchParams;
  const page = Math.max(1, parseInt(pageStr));

  if (tag) void logFeature(authUser.templeId, authUser.id, "tag_filter", tag);
  const stageFilter = VALID_STAGES.includes(stage as MemberStage) ? (stage as MemberStage) : undefined;

  const where = {
    templeId: authUser.templeId,
    ...(type === "DANKA" || type === "GOEN" ? { type: type as "DANKA" | "GOEN" } : {}),
    ...(stageFilter ? { stage: stageFilter } : {}),
    ...(tag ? { priorityTags: { has: tag } } : {}),
    ...(search
      ? {
          OR: [
            { user: { name: { contains: search, mode: "insensitive" as const } } },
            { familyName: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
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
    <div className="p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">会員管理</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            全 {total} 件
            {stageFilter && (
              <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[stageFilter]}`}>
                {STAGE_LABELS[stageFilter]}
              </span>
            )}
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <ExportButton
              href="/api/export/members"
              label="CSVエクスポート"
              filename="members.csv"
            />
            <Link
              href="/admin/members/import"
              className="px-3 py-2 text-sm border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50"
            >
              CSVインポート
            </Link>
          </div>
        )}
      </div>

      {/* フィルター */}
      <Suspense fallback={<div className="h-10" />}>
        <MemberFilters currentType={type} currentSearch={search} currentTag={tag} />
      </Suspense>

      {/* テーブル */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden mt-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="text-left px-4 py-3 text-stone-500 font-medium">氏名</th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium">家名</th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium">種別</th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium">ステージ</th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium">登録日</th>
                <th className="text-right px-4 py-3 text-stone-500 font-medium">スコア</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-stone-400">
                    会員が見つかりません
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.id} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-stone-800">{member.user.name}</p>
                      {member.summaryNote && (
                        <p className="text-xs text-stone-400 mt-0.5 truncate max-w-[180px]">{member.summaryNote}</p>
                      )}
                      {member.priorityTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {member.priorityTags.map((t) => (
                            <span key={t} className={`px-1.5 py-0.5 rounded text-xs font-medium ${TAG_COLORS[t] ?? "bg-stone-100 text-stone-600"}`}>
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-600">{member.familyName}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          member.type === "DANKA"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-teal-100 text-teal-800"
                        }`}
                      >
                        {member.type === "DANKA" ? "檀家" : "ご縁さん"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STAGE_COLORS[member.stage]}`}>
                        {STAGE_LABELS[member.stage]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-500">
                      {member.joinedDate.toLocaleDateString("ja-JP")}
                    </td>
                    <td className="px-4 py-3 text-right text-stone-600">
                      {member.engagementScore}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/members/${member.id}`}
                        className="text-amber-700 hover:text-amber-900 text-xs font-medium"
                      >
                        詳細 →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-stone-500">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} / {total} 件
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/members?type=${type ?? ""}&stage=${stage ?? ""}&search=${search}&page=${page - 1}`}
                className="px-3 py-1.5 text-sm border border-stone-200 rounded-lg hover:bg-stone-50"
              >
                前へ
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/members?type=${type ?? ""}&stage=${stage ?? ""}&search=${search}&page=${page + 1}`}
                className="px-3 py-1.5 text-sm border border-stone-200 rounded-lg hover:bg-stone-50"
              >
                次へ
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
