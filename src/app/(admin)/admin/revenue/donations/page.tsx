"use client";

import { useEffect, useState } from "react";

type Donation = {
  id: string;
  amount: number;
  purpose: string;
  purposeDetail: string | null;
  paymentMethod: string;
  donorName: string | null;
  donatedAt: string;
  thankyouSent: boolean;
  member: { user: { name: string } } | null;
};

const PURPOSE_LABELS: Record<string, string> = {
  GENERAL: "一般寄付",
  REPAIR: "修繕",
  CEREMONY: "法要",
  CROWDFUNDING: "クラウドファンディング",
  OTHER: "その他",
};

export default function DonationsPage() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [total, setTotal] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sending, setSending] = useState<string | null>(null);

  async function fetchDonations(p: number) {
    setLoading(true);
    const res = await fetch(`/api/donations?page=${p}&limit=30`);
    const data = await res.json();
    setDonations(data.donations ?? []);
    setTotal(data.total ?? 0);
    setTotalAmount(data.totalAmount ?? 0);
    setLoading(false);
  }

  useEffect(() => { fetchDonations(page); }, [page]);

  async function handleThankyou(id: string) {
    setSending(id);
    await fetch(`/api/donations/${id}/thankyou`, { method: "POST" });
    setSending(null);
    fetchDonations(page);
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">寄付管理</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            累計 {total}件 / ¥{totalAmount.toLocaleString()}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-stone-400">読み込み中...</div>
      ) : donations.length === 0 ? (
        <div className="text-center py-12 text-stone-400">寄付記録がありません</div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500">日付</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500">寄付者</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500">用途</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-stone-500">金額</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500">支払方法</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-stone-500">お礼</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {donations.map((d) => (
                <tr key={d.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3 text-stone-600">
                    {new Date(d.donatedAt).toLocaleDateString("ja-JP")}
                  </td>
                  <td className="px-4 py-3 text-stone-700">
                    {d.member?.user.name ?? d.donorName ?? "匿名"}
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    {PURPOSE_LABELS[d.purpose] ?? d.purpose}
                    {d.purposeDetail && <span className="text-xs text-stone-400 ml-1">({d.purposeDetail})</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-stone-800">
                    ¥{d.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-stone-500 text-xs">
                    {d.paymentMethod === "CASH" ? "現金" : d.paymentMethod === "TRANSFER" ? "振込" : "オンライン"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {d.thankyouSent ? (
                      <span className="text-xs text-stone-400">送信済み</span>
                    ) : (
                      <button
                        onClick={() => handleThankyou(d.id)}
                        disabled={sending === d.id}
                        className="text-xs text-amber-700 hover:text-amber-900 disabled:opacity-50"
                      >
                        {sending === d.id ? "送信中..." : "送信"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > 30 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40"
          >
            前へ
          </button>
          <span className="px-3 py-1.5 text-sm text-stone-500">
            {page} / {Math.ceil(total / 30)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(total / 30)}
            className="px-3 py-1.5 text-sm border rounded-lg disabled:opacity-40"
          >
            次へ
          </button>
        </div>
      )}
    </div>
  );
}
