import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcNenki, getNenkiDeathYearsForYear } from "@/lib/nenki";
import DeceasedSearch from "./DeceasedSearch";

const PAGE_SIZE = 50;

const MONTH_LABELS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

interface SearchParams {
  tab?: string;
  search?: string;
  month?: string;
  page?: string;
}

export default async function AdminDeceasedPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role === "MEMBER") redirect("/app");

  const { tab = "all", search = "", month, page: pageStr = "1" } = await searchParams;
  const page = Math.max(1, parseInt(pageStr));
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const targetMonth = month ? parseInt(month) : currentMonth;

  const baseWhere = {
    member: { templeId: authUser.templeId },
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { kaimyo: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const include = {
    member: { include: { user: { select: { name: true } } } },
  };

  let deceased: Array<{
    id: string;
    name: string;
    kaimyo: string | null;
    deathDate: Date | null;
    age: number | null;
    relationship: string | null;
    member: { user: { name: string } };
    nenkiName?: string | null;
  }> = [];
  let total = 0;
  let totalPages = 1;

  if (tab === "monthly") {
    const all = await prisma.deceasedPerson.findMany({
      where: { ...baseWhere, deathDate: { not: null } },
      orderBy: [{ deathDate: "asc" }],
      include,
    });
    deceased = all.filter((d) => d.deathDate && d.deathDate.getMonth() + 1 === targetMonth);
    total = deceased.length;
  } else if (tab === "annual") {
    const deathYears = getNenkiDeathYearsForYear(currentYear);
    const all = await prisma.deceasedPerson.findMany({
      where: {
        ...baseWhere,
        deathDate: { not: null },
        OR: deathYears.map((dy) => ({
          deathDate: {
            gte: new Date(`${dy}-01-01`),
            lt: new Date(`${dy + 1}-01-01`),
          },
        })),
      },
      orderBy: [{ deathDate: "asc" }],
      include,
    });
    // 今年の年忌名を付加
    deceased = all.map((d) => {
      const nenki = calcNenki(d.deathDate!).find((e) => e.year === currentYear);
      return { ...d, nenkiName: nenki?.name ?? null };
    });
    total = deceased.length;
  } else {
    // "all" tab
    const [result, count] = await Promise.all([
      prisma.deceasedPerson.findMany({
        where: baseWhere,
        orderBy: [{ deathDate: "desc" }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include,
      }),
      prisma.deceasedPerson.count({ where: baseWhere }),
    ]);
    deceased = result;
    total = count;
    totalPages = Math.ceil(total / PAGE_SIZE);
  }

  const TABS = [
    { value: "all", label: "全件" },
    { value: "monthly", label: "今月の命日" },
    { value: "annual", label: "今年の年忌" },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">過去帳管理</h1>
          <p className="text-sm text-stone-500 mt-0.5">全 {total} 件</p>
        </div>
        <Link
          href="/admin/deceased/new"
          className="px-4 py-2 bg-amber-700 text-white text-sm rounded-lg hover:bg-amber-800"
        >
          ＋ 新規登録
        </Link>
      </div>

      {/* タブ */}
      <div className="flex gap-1 bg-white border border-stone-200 rounded-lg p-1 w-fit mb-4">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/admin/deceased?tab=${t.value}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              tab === t.value
                ? "bg-amber-700 text-white font-medium"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* 命日月フィルター（monthlyタブのみ） */}
      {tab === "monthly" && (
        <div className="flex gap-1 flex-wrap mb-4">
          {MONTH_LABELS.map((label, i) => (
            <Link
              key={i}
              href={`/admin/deceased?tab=monthly&month=${i + 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
              className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                targetMonth === i + 1
                  ? "bg-amber-700 text-white border-amber-700 font-medium"
                  : "border-stone-200 text-stone-600 hover:bg-stone-50"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      )}

      {/* 検索フォーム */}
      <DeceasedSearch currentSearch={search} currentTab={tab} />

      {/* テーブル */}
      {deceased.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center text-stone-400 text-sm mt-4">
          {tab === "monthly"
            ? `${targetMonth}月に命日のある故人はいません`
            : tab === "annual"
            ? `${currentYear}年に年忌のある故人はいません`
            : "故人の記録がありません"}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden mt-4">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="text-left px-4 py-3 text-stone-500 font-medium">故人名</th>
                  <th className="text-left px-4 py-3 text-stone-500 font-medium">戒名</th>
                  <th className="text-left px-4 py-3 text-stone-500 font-medium">没年月日</th>
                  <th className="text-left px-4 py-3 text-stone-500 font-medium">命日（月日）</th>
                  {tab === "annual" && (
                    <th className="text-left px-4 py-3 text-stone-500 font-medium">年忌</th>
                  )}
                  <th className="text-left px-4 py-3 text-stone-500 font-medium">所属会員</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {deceased.map((d) => (
                  <tr key={d.id} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-stone-800">{d.name}</td>
                    <td className="px-4 py-3 text-stone-600">{d.kaimyo ?? "—"}</td>
                    <td className="px-4 py-3 text-stone-600">
                      {d.deathDate
                        ? d.deathDate.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-stone-500">
                      {d.deathDate
                        ? d.deathDate.toLocaleDateString("ja-JP", { month: "long", day: "numeric" })
                        : "—"}
                    </td>
                    {tab === "annual" && (
                      <td className="px-4 py-3">
                        {d.nenkiName && (
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded-full text-xs font-medium">
                            {d.nenkiName}
                          </span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 text-stone-600">{d.member.user.name}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/deceased/${d.id}/edit`}
                        className="text-amber-700 hover:text-amber-900 text-xs font-medium"
                      >
                        編集 →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ページネーション（全件タブのみ） */}
      {tab === "all" && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-stone-500">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} / {total} 件
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/deceased?tab=all&search=${encodeURIComponent(search)}&page=${page - 1}`}
                className="px-3 py-1.5 text-sm border border-stone-200 rounded-lg hover:bg-stone-50"
              >
                前へ
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/deceased?tab=all&search=${encodeURIComponent(search)}&page=${page + 1}`}
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
