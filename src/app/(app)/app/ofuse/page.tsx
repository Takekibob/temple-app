import { redirect } from "next/navigation";
import Link from "next/link";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Coins, Receipt } from "lucide-react";

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
  if (!authUser) redirect("/");

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
    <div className="max-w-lg mx-auto pb-28">
      {/* ヘッダー */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-stone-800 tracking-tight">お布施履歴</h1>
      </div>

      {/* 年度合計カード */}
      <div className="px-4 mb-4">
        <div className="bg-gradient-to-br from-amber-700 to-amber-800 rounded-2xl p-5 text-white shadow-md">
          <p className="text-xs font-semibold text-amber-200 uppercase tracking-widest mb-1">{selectedYear}年 合計</p>
          <p className="text-3xl font-bold">¥{totalAmount.toLocaleString()}</p>
        </div>
      </div>

      {/* 年度フィルター */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-4 scrollbar-hide">
        {years.map((y) => (
          <Link
            key={y}
            href={`/app/ofuse?year=${y}`}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              selectedYear === y
                ? "bg-amber-700 text-white shadow-sm"
                : "bg-white text-stone-500 border border-stone-200 hover:border-amber-300"
            }`}
          >
            {y}年
          </Link>
        ))}
      </div>

      {/* リスト */}
      <div className="px-4 space-y-2.5">
        {ofuseList.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-10 text-center">
            <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <Coins size={22} className="text-stone-400" />
            </div>
            <p className="text-stone-400 text-sm">{selectedYear}年の記録はありません</p>
          </div>
        ) : (
          ofuseList.map((o) => (
            <div
              key={o.id}
              className="bg-white rounded-2xl border border-stone-100 shadow-sm px-4 py-3.5 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
                  <Coins size={16} className="text-amber-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                      {TYPE_LABELS[o.type] ?? o.type}
                    </span>
                    <span className="text-xs text-stone-400">
                      {PAYMENT_LABELS[o.paymentMethod] ?? o.paymentMethod}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400">
                    {o.paidAt.toLocaleDateString("ja-JP")}
                    {o.notes && <span className="ml-2 text-stone-500">{o.notes}</span>}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="font-bold text-stone-800">¥{o.amount.toLocaleString()}</p>
                {o.receiptIssued && (
                  <p className="text-[10px] text-stone-400 flex items-center gap-0.5 justify-end mt-0.5">
                    <Receipt size={10} />
                    領収書発行済
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
