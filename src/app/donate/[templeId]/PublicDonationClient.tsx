"use client";

import { useState } from "react";

type Temple = { id: string; name: string; description: string | null; logoUrl: string | null };

const AMOUNTS = [1000, 3000, 5000, 10000, 30000, 50000];

export default function PublicDonationClient({ temple }: { temple: Temple }) {
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("GENERAL");
  const [purposeDetail, setPurposeDetail] = useState("");
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount < 100) {
      setError("100円以上の金額を入力してください");
      return;
    }
    if (!donorEmail) {
      setError("メールアドレスを入力してください");
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
        donorName,
        donorEmail,
      }),
    });

    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "エラーが発生しました");
      setLoading(false);
      return;
    }

    const { url } = await res.json();
    if (url) window.location.href = url;
  }

  return (
    <div className="min-h-screen bg-stone-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          {temple.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={temple.logoUrl} alt={temple.name} className="w-16 h-16 object-contain mx-auto mb-3" />
          )}
          <h1 className="text-2xl font-bold text-stone-800">{temple.name}</h1>
          {temple.description && (
            <p className="text-sm text-stone-500 mt-2">{temple.description}</p>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-stone-800 mb-4">ご寄付フォーム</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">金額を選択</label>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {AMOUNTS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAmount(String(a))}
                    className={`py-2.5 rounded-lg text-sm border font-medium transition-colors ${
                      amount === String(a)
                        ? "border-amber-700 bg-amber-700 text-white"
                        : "border-stone-200 text-stone-600 hover:border-amber-400"
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
                className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm"
                placeholder="その他の金額（円）"
                min={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">用途</label>
              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm"
              >
                <option value="GENERAL">一般寄付</option>
                <option value="REPAIR">修繕・改修</option>
                <option value="CEREMONY">法要・行事</option>
                <option value="OTHER">その他</option>
              </select>
            </div>

            {purpose === "OTHER" && (
              <input
                value={purposeDetail}
                onChange={(e) => setPurposeDetail(e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm"
                placeholder="用途の詳細"
              />
            )}

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">お名前（任意）</label>
              <input
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm"
                placeholder="山田 太郎"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">メールアドレス</label>
              <input
                type="email"
                value={donorEmail}
                onChange={(e) => setDonorEmail(e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3 py-2.5 text-sm"
                placeholder="example@email.com"
                required
              />
            </div>

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading || !amount || !donorEmail}
              className="w-full bg-amber-700 text-white py-3.5 rounded-xl font-medium hover:bg-amber-800 disabled:opacity-50 transition-colors"
            >
              {loading ? "処理中..." : `¥${Number(amount || 0).toLocaleString()} を寄付する`}
            </button>

            <p className="text-xs text-stone-400 text-center">
              Stripeの安全な決済ページに移動します。領収書はメールでお送りします。
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
