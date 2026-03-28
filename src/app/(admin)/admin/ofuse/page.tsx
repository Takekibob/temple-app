import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ExportButton from "@/components/admin/ExportButton";

const TYPE_LABELS: Record<string, string> = {
  HOUYO: "法要",
  GOJIKAI: "護持会費",
  KIFU: "寄付",
  EVENT_FEE: "イベント参加費",
  OTHER: "その他",
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
  { value: "EVENT_FEE", label: "イベント参加費" },
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

  const [ofuseList, total] = await Promise.all([
    prisma.ofuse.findMany({
      where,
      orderBy: { paidAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        member: { include: { user: { select: { name: true } } } },
      },
    }),
    prisma.ofuse.count({ where }),
  ]);

  const totalAmount = await prisma.ofuse.aggregate({
    where,
    _sum: { amount: true },
  });

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // 年度セレクト用: 直近5年
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">お布施管理</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            {selectedYear}年 全 {total} 件 / 合計 {(totalAmount._sum.amount ?? 0).toLocaleString()} 円
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton
            href="/api/export/ofuse"
            label="CSVエクスポート"
            filename="ofuse.csv"
          />
          <Link
            href="/admin/ofuse/new"
            className="px-4 py-2 bg-amber-700 text-white text-sm rounded-lg hover:bg-amber-800"
          >
            ＋ 新規記録
          </Link>
        </div>
      </div>

      {/* 年度フィルター */}
      <div className="flex gap-2 mb-4 items-center">
        <span className="text-sm text-stone-500">年度:</span>
        <div className="flex gap-1 bg-white border border-stone-200 rounded-lg p-1">
          {years.map((y) => (
            <Link
              key={y}
              href={`/admin/ofuse?year=${y}${type ? `&type=${type}` : ""}`}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                selectedYear === y
                  ? "bg-amber-700 text-white font-medium"
                  : "text-stone-600 hover:bg-stone-100"
              }`}
            >
              {y}年
            </Link>
          ))}
        </div>
      </div>

      {/* 種別タブ */}
      <div className="flex gap-1 bg-white border border-stone-200 rounded-lg p-1 w-fit mb-4 flex-wrap">
        {TYPE_TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/ofuse?year=${selectedYear}${tab.value ? `&type=${tab.value}` : ""}`}
            className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
              (type ?? "") === tab.value
                ? "bg-amber-700 text-white font-medium"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {ofuseList.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center text-stone-400 text-sm">
          記録がありません
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="text-left px-4 py-3 text-stone-500 font-medium">支払日</th>
                  <th className="text-left px-4 py-3 text-stone-500 font-medium">会員名</th>
                  <th className="text-left px-4 py-3 text-stone-500 font-medium">種別</th>
                  <th className="text-right px-4 py-3 text-stone-500 font-medium">金額</th>
                  <th className="text-left px-4 py-3 text-stone-500 font-medium">支払方法</th>
                  <th className="text-left px-4 py-3 text-stone-500 font-medium">領収書</th>
                  <th className="text-left px-4 py-3 text-stone-500 font-medium">備考</th>
                </tr>
              </thead>
              <tbody>
                {ofuseList.map((o) => (
                  <tr key={o.id} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-3 text-stone-600">
                      {o.paidAt.toLocaleDateString("ja-JP")}
                    </td>
                    <td className="px-4 py-3 font-medium text-stone-800">
                      {o.member.user.name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded-full text-xs font-medium">
                        {TYPE_LABELS[o.type] ?? o.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-stone-800">
                      ¥{o.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {PAYMENT_LABELS[o.paymentMethod] ?? o.paymentMethod}
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-xs">
                      {o.receiptIssued ? "発行済" : "—"}
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-xs max-w-xs truncate">
                      {o.notes ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-stone-500">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} / {total} 件
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/ofuse?year=${selectedYear}&type=${type ?? ""}&page=${page - 1}`}
                className="px-3 py-1.5 text-sm border border-stone-200 rounded-lg hover:bg-stone-50"
              >
                前へ
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/ofuse?year=${selectedYear}&type=${type ?? ""}&page=${page + 1}`}
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
