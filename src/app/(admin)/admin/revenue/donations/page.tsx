"use client";

import { useEffect, useState } from "react";
import { Heart, SendHorizonal, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";

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

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "現金",
  TRANSFER: "振込",
  ONLINE: "オンライン",
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
    <div className="p-4 sm:p-6 max-w-3xl">
      {/* ヘッダー */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-0.5">
          <Heart size={18} className="text-amber-700" />
          <h1 className="text-2xl font-bold text-stone-800 tracking-tight">寄付管理</h1>
        </div>
        <p className="text-sm text-stone-400">
          累計 {total}件 / ¥{totalAmount.toLocaleString()}
        </p>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
          <p className="text-xs text-stone-500 font-medium mb-1">累計件数</p>
          <p className="text-2xl font-bold text-stone-800">{total}<span className="text-sm font-normal text-stone-400 ml-0.5">件</span></p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-2xl border border-amber-200 p-4">
          <p className="text-xs text-amber-700 font-medium mb-1">累計金額</p>
          <p className="text-2xl font-bold text-amber-800">¥{totalAmount.toLocaleString()}</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-12 text-center text-stone-400 text-sm">
          読み込み中...
        </div>
      ) : donations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-12 text-center text-stone-400 text-sm">
          寄付記録がありません
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-stone-50">
            {donations.map((d) => (
              <div key={d.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
                  <Heart size={14} className="text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-sm font-semibold text-stone-800">
                      {d.member?.user.name ?? d.donorName ?? "匿名"}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-stone-50 border border-stone-100 text-stone-500 rounded-full">
                      {PURPOSE_LABELS[d.purpose] ?? d.purpose}
                      {d.purposeDetail && `（${d.purposeDetail}）`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-stone-400">
                    <span>{new Date(d.donatedAt).toLocaleDateString("ja-JP")}</span>
                    <span>·</span>
                    <span>{PAYMENT_LABELS[d.paymentMethod] ?? d.paymentMethod}</span>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className="text-base font-bold text-stone-800">¥{d.amount.toLocaleString()}</p>
                  <div className="mt-0.5">
                    {d.thankyouSent ? (
                      <span className="flex items-center gap-1 text-xs text-stone-400 justify-end">
                        <CheckCircle2 size={11} className="text-teal-500" />お礼済み
                      </span>
                    ) : (
                      <button
                        onClick={() => handleThankyou(d.id)}
                        disabled={sending === d.id}
                        className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900 font-medium disabled:opacity-50"
                      >
                        <SendHorizonal size={11} />
                        {sending === d.id ? "送信中..." : "お礼を送る"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {total > 30 && (
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-stone-50 bg-stone-50/50">
              <p className="text-xs text-stone-500">
                {(page - 1) * 30 + 1}〜{Math.min(page * 30, total)} 件 / 全{total}件
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs border border-stone-200 rounded-lg disabled:opacity-40 hover:bg-white transition-colors"
                >
                  <ChevronLeft size={12} />前
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil(total / 30)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs border border-stone-200 rounded-lg disabled:opacity-40 hover:bg-white transition-colors"
                >
                  次<ChevronRight size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
