import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExportButton from "@/components/admin/ExportButton";
import { Coins, Plus, ChevronRight } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  HOUYO: "法要",
  GOJIKAI: "護持会費",
  KIFU: "寄付",
  EVENT_FEE: "イベント参加費",
  OTHER: "その他",
};

const TYPE_COLORS: Record<string, string> = {
  HOUYO: "bg-amber-100 text-amber-800",
  GOJIKAI: "bg-yellow-100 text-yellow-800",
  KIFU: "bg-purple-100 text-purple-800",
  EVENT_FEE: "bg-sky-100 text-sky-800",
  OTHER: "bg-stone-100 text-stone-600",
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "現金",
  TRANSFER: "振込",
  ONLINE: "オンライン",
};

const TYPE_TABS = [
  { value: "", label: "すべて" },
  { value: "HOUYO", label: "法要" },
  { value: "GOJIKAI", label: "護持会費" },
  { value: "KIFU", label: "寄付" },
  { value: "EVENT_FEE", label: "イベント" },
  { value: "OTHER", label: "その他" },
] as const;

const PAGE_SIZE = 50;

interface SearchParams {
  type?: string;
  year?: string;
  page?: string;
}

export default async function AdminOfusePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const authUser = await getAuthUser();
  if (!authUser || authUser.role === "MEMBER") redirect("/app");

  const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(authUser.role);
  const { type, year, page: pageStr = "1" } = await searchParams;
  const page = Math.max(1, parseInt(pageStr));
  const currentYear = new Date().getFullYear();
  const selectedYear = parseInt(year ?? String(currentYear));

  const where: Record<string, unknown> = {
    templeId: authUser.templeId,
    paidAt: {
      gte: new Date(`${selectedYear}-01-01`),
      lt: new Date(`${selectedYear + 1}-01-01`),
    },
  };
  if (type) where.type = type;

  const [ofuseList, total, totalAmount] = await Promise.all([
    prisma.ofuse.findMany({
      where,
      orderBy: { paidAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { member: { include: { user: { select: { name: true } } } } },
    }),
    prisma.ofuse.count({ where }),
    prisma.ofuse.aggregate({ where, _sum: { amount: true } }),
  ]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 tracking-tight">お布施管理</h1>
          <p className="text-sm text-stone-400 mt-0.5">{selectedYear}年</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <ExportButton href="/api/export/ofuse" label="CSV出力" filename="ofuse.csv" />
          )}
          <Link
            href="/admin/ofuse/new"
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-700 text-white text-sm rounded-xl hover:bg-amber-800 transition-colors font-medium"
          >
            <Plus size={14} />
            新規記録
          </Link>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <Coins size={14} className="text-amber-600" />
            <p className="text-xs text-stone-500 font-medium">{selectedYear}年 合計金額</p>
          </div>
          <p className="text-2xl font-bold text-amber-700">
            ¥{(totalAmount._sum.amount ?? 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <Coins size={14} className="text-stone-400" />
            <p className="text-xs text-stone-500 font-medium">{selectedYear}年 件数</p>
          </div>
          <p className="text-2xl font-bold text-stone-800">{total.toLocaleString()}<span className="text-sm font-normal text-stone-400 ml-1">件</span></p>
        </div>
      </div>

      {/* 年度フィルター */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs text-stone-400 font-medium">年度:</span>
        <div className="flex gap-1 bg-stone-100 rounded-xl p-1">
          {years.map((y) => (
            <Link
              key={y}
              href={`/admin/ofuse?year=${y}${type ? `&type=${type}` : ""}`}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                selectedYear === y
                  ? "bg-white text-amber-800 shadow-sm"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              {y}年
            </Link>
          ))}
        </div>
      </div>

      {/* 種別タブ */}
      <div className="flex gap-1 bg-stone-100 rounded-xl p-1 w-fit mb-5 flex-wrap">
        {TYPE_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/ofuse?year=${selectedYear}${tab.value ? `&type=${tab.value}` : ""}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              (type ?? "") === tab.value
                ? "bg-white text-amber-800 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* リスト */}
      {ofuseList.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-14 text-center">
          <p className="text-stone-400 text-sm">記録がありません</p>
        </div>
      ) : (
        <div className="space-y-2">
          {ofuseList.map((o) => (
            <div key={o.id} className="bg-white rounded-2xl border border-stone-100 shadow-sm px-5 py-4 flex items-center gap-4">
              {/* 日付 */}
              <div className="w-14 text-center shrink-0">
                <p className="text-[10px] text-stone-400">
                  {o.paidAt.toLocaleDateString("ja-JP", { month: "short" })}
                </p>
                <p className="text-xl font-bold text-stone-700 leading-tight">{o.paidAt.getDate()}</p>
              </div>

              {/* 内容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${TYPE_COLORS[o.type] ?? "bg-stone-100 text-stone-600"}`}>
                    {TYPE_LABELS[o.type] ?? o.type}
                  </span>
                  <span className="text-xs text-stone-400">{PAYMENT_LABELS[o.paymentMethod] ?? o.paymentMethod}</span>
                </div>
                <p className="text-sm font-semibold text-stone-800">{o.member.user.name}</p>
                {o.notes && <p className="text-xs text-stone-400 mt-0.5 truncate">{o.notes}</p>}
              </div>

              {/* 金額 */}
              <div className="text-right shrink-0">
                <p className="text-base font-bold text-stone-800">¥{o.amount.toLocaleString()}</p>
              </div>

              {/* アクション */}
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={`/api/ofuse/${o.id}/receipt`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-stone-500 hover:text-stone-700 bg-stone-100 hover:bg-stone-200 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  {o.receiptIssued ? "領収書再発行" : "領収書発行"}
                </a>
                <Link
                  href={`/admin/ofuse/${o.id}/edit`}
                  className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 hover:bg-amber-50 px-2.5 py-1.5 rounded-lg transition-colors font-semibold"
                >
                  編集<ChevronRight size={12} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-5">
          <p className="text-sm text-stone-400">
            {(page - 1) * PAGE_SIZE + 1}〜{Math.min(page * PAGE_SIZE, total)} 件 / 全 {total} 件
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/ofuse?year=${selectedYear}&type=${type ?? ""}&page=${page - 1}`}
                className="px-4 py-2 text-sm border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors"
              >
                ← 前へ
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/ofuse?year=${selectedYear}&type=${type ?? ""}&page=${page + 1}`}
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
