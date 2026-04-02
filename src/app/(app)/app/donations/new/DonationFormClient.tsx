"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Temple = { id: string; name: string };

const AMOUNTS = [1000, 3000, 5000, 10000, 30000, 50000];

export default function DonationFormClient({ temple, userEmail }: { temple: Temple; userEmail: string }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("GENERAL");
  const [purposeDetail, setPurposeDetail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount < 100) {
      setError("100円以上の金額を入力してください");
      return;
    }

    setLoading(true);
    setError("");

    const res = await fetch("/api/donations/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        templeId: temple.id,
        amount: numAmount,
        purpose,
        purposeDetail,
        donorEmail: userEmail,
      }),
    });

    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "エラーが発生しました");
      setLoading(false);
      return;
    }

    const { url } = await res.json();
    if (url) {
      window.location.href = url;
    }
  }

  return (
    <div className="p-4 pb-24 max-w-md mx-auto">
      <h1 className="text-xl font-bold text-stone-800 mb-1">{temple.name}へのご寄付</h1>
      <p className="text-sm text-stone-500 mb-6">ご寄付はお寺の維持・活動に大切に活用させていただきます。</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">金額</label>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {AMOUNTS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAmount(String(a))}
                className={`py-2 rounded-lg text-sm border ${
                  amount === String(a)
                    ? "border-amber-700 bg-amber-50 text-amber-800 font-medium"
                    : "border-stone-200 text-stone-600"
                }`}
              >
                ¥{a.toLocaleString()}
              </button>
            ))}
          </div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
            placeholder="その他の金額を入力"
            min={100}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">用途</label>
          <select
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="GENERAL">一般寄付</option>
            <option value="REPAIR">修繕・改修</option>
            <option value="CEREMONY">法要・行事</option>
            <option value="OTHER">その他</option>
          </select>
        </div>

        {purpose === "OTHER" && (
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">用途の詳細</label>
            <input
              value={purposeDetail}
              onChange={(e) => setPurposeDetail(e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
              placeholder="具体的な用途をご記入ください"
            />
          </div>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading || !amount}
          className="w-full bg-amber-700 text-white py-3 rounded-xl text-sm font-medium hover:bg-amber-800 disabled:opacity-50"
        >
          {loading ? "処理中..." : "カードで寄付する"}
        </button>

        <p className="text-xs text-stone-400 text-center">
          Stripeの安全な決済ページに移動します
        </p>
      </form>
    </div>
  );
}
