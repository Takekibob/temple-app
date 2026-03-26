import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

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

interface SearchParams {
  year?: string;
}

export default async function UserOfusePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/auth/login");

  // 檀家のみアクセス可
  if (!authUser.member || authUser.member.type !== "DANKA") {
    redirect("/app");
  }

  const { year } = await searchParams;
  const currentYear = new Date().getFullYear();
  const selectedYear = parseInt(year ?? String(currentYear));

  const ofuseList = await prisma.ofuse.findMany({
    where: {
      memberId: authUser.member.id,
      paidAt: {
        gte: new Date(`${selectedYear}-01-01`),
        lt: new Date(`${selectedYear + 1}-01-01`),
      },
    },
    orderBy: { paidAt: "desc" },
  });

  const totalAmount = ofuseList.reduce((sum, o) => sum + o.amount, 0);
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="pb-4">
      {/* ヘッダー */}
      <div className="bg-white border-b border-stone-100 px-4 pt-12 pb-4">
        <h1 className="text-xl font-bold text-stone-800">お布施履歴</h1>
        <p className="text-sm text-stone-500 mt-0.5">
          {selectedYear}年 合計 ¥{totalAmount.toLocaleString()}
        </p>
      </div>

      {/* 年度フィルター */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex gap-1 bg-white border border-stone-200 rounded-lg p-1 overflow-x-auto">
          {years.map((y) => (
            <Link
              key={y}
              href={`/app/ofuse?year=${y}`}
              className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors ${
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

      {/* リスト */}
      <div className="px-4 pt-2 space-y-2">
        {ofuseList.length === 0 ? (
          <div className="bg-white rounded-xl border border-stone-200 p-10 text-center text-stone-400 text-sm">
            {selectedYear}年の記録はありません
          </div>
        ) : (
          ofuseList.map((o) => (
            <div
              key={o.id}
              className="bg-white rounded-xl border border-stone-200 px-4 py-3 flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-800 rounded-full font-medium">
                    {TYPE_LABELS[o.type] ?? o.type}
                  </span>
                  <span className="text-xs text-stone-400">
                    {PAYMENT_LABELS[o.paymentMethod] ?? o.paymentMethod}
                  </span>
                </div>
                <p className="text-xs text-stone-400 mt-1">
                  {o.paidAt.toLocaleDateString("ja-JP")}
                  {o.notes && <span className="ml-2">{o.notes}</span>}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-stone-800">¥{o.amount.toLocaleString()}</p>
                {o.receiptIssued && (
                  <p className="text-xs text-stone-400">領収書発行済</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
