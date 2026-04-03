import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calcNenki, getNenkiDeathYearsForYear } from "@/lib/nenki";
import DeceasedSearch from "./DeceasedSearch";
import { BookOpen, Plus, ChevronRight, CalendarDays } from "lucide-react";

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

  const include = { member: { include: { user: { select: { name: true } } } } };

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
          deathDate: { gte: new Date(`${dy}-01-01`), lt: new Date(`${dy + 1}-01-01`) },
        })),
      },
      orderBy: [{ deathDate: "asc" }],
      include,
    });
    deceased = all.map((d) => {
      const nenki = calcNenki(d.deathDate!).find((e) => e.year === currentYear);
      return { ...d, nenkiName: nenki?.name ?? null };
    });
    total = deceased.length;
  } else {
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
    <div className="p-6 max-w-4xl">
      {/* ヘッダー */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 tracking-tight">過去帳管理</h1>
          <p className="text-sm text-stone-400 mt-0.5">{total} 件</p>
        </div>
        <Link
          href="/admin/deceased/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-700 text-white text-sm rounded-xl hover:bg-amber-800 transition-colors font-medium"
        >
          <Plus size={14} />
          新規登録
        </Link>
      </div>

      {/* タブ */}
      <div className="flex gap-1 bg-stone-100 rounded-xl p-1 w-fit mb-4">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/admin/deceased?tab=${t.value}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              tab === t.value
                ? "bg-white text-amber-800 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* 命日月フィルター */}
      {tab === "monthly" && (
        <div className="flex gap-1 flex-wrap mb-4">
          {MONTH_LABELS.map((label, i) => (
            <Link
              key={i}
              href={`/admin/deceased?tab=monthly&month=${i + 1}${search ? `&search=${encodeURIComponent(search)}` : ""}`}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                targetMonth === i + 1
                  ? "bg-amber-700 text-white border-amber-700"
                  : "border-stone-200 text-stone-600 bg-white hover:border-amber-300 hover:text-amber-700"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      )}

      {/* 検索フォーム */}
      <div className="mb-4">
        <DeceasedSearch currentSearch={search} currentTab={tab} />
      </div>

      {/* リスト */}
      {deceased.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-14 text-center">
          <div className="w-14 h-14 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <BookOpen size={24} className="text-stone-300" />
          </div>
          <p className="text-stone-400 text-sm">
            {tab === "monthly"
              ? `${targetMonth}月に命日のある方はいません`
              : tab === "annual"
              ? `${currentYear}年に年忌のある方はいません`
              : "記録がありません"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {deceased.map((d) => (
            <Link
              key={d.id}
              href={`/admin/deceased/${d.id}/edit`}
              className="flex items-center gap-4 bg-white rounded-2xl border border-stone-100 shadow-sm px-5 py-4 hover:border-amber-200 hover:shadow-md transition-all"
            >
              {/* 命日アイコン */}
              <div className="w-12 h-12 rounded-2xl bg-stone-50 border border-stone-100 flex flex-col items-center justify-center shrink-0">
                {d.deathDate ? (
                  <>
                    <p className="text-[10px] text-stone-400 leading-none">
                      {d.deathDate.toLocaleDateString("ja-JP", { month: "short" })}
                    </p>
                    <p className="text-xl font-bold text-stone-700 leading-tight">{d.deathDate.getDate()}</p>
                  </>
                ) : (
                  <CalendarDays size={18} className="text-stone-300" />
                )}
              </div>

              {/* 内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <span className="text-sm font-semibold text-stone-800">{d.name}</span>
                  {tab === "annual" && d.nenkiName && (
                    <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      {d.nenkiName}
                    </span>
                  )}
                </div>
                {d.kaimyo && (
                  <p className="text-xs text-stone-500">{d.kaimyo}</p>
                )}
                <div className="flex items-center gap-3 mt-0.5">
                  {d.deathDate && (
                    <p className="text-xs text-stone-400">
                      {d.deathDate.toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" })}没
                    </p>
                  )}
                  <p className="text-xs text-stone-400">
                    {d.member.user.name}家
                  </p>
                </div>
              </div>

              <ChevronRight size={16} className="text-stone-300 shrink-0" />
            </Link>
          ))}
        </div>
      )}

      {/* ページネーション */}
      {tab === "all" && totalPages > 1 && (
        <div className="flex items-center justify-between mt-5">
          <p className="text-sm text-stone-400">
            {(page - 1) * PAGE_SIZE + 1}〜{Math.min(page * PAGE_SIZE, total)} 件 / 全 {total} 件
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/deceased?tab=all&search=${encodeURIComponent(search)}&page=${page - 1}`}
                className="px-4 py-2 text-sm border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors"
              >
                ← 前へ
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/deceased?tab=all&search=${encodeURIComponent(search)}&page=${page + 1}`}
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
