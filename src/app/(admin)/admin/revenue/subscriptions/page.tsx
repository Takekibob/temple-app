"use client";

import { useEffect, useState } from "react";

type Subscription = {
  id: string;
  status: string;
  createdAt: string;
  currentPeriodEnd: string | null;
  canceledAt: string | null;
  plan: { name: string; price: number; interval: string };
  member: { user: { name: string } };
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "有効", className: "bg-green-100 text-green-700" },
  PAST_DUE: { label: "支払い遅延", className: "bg-red-100 text-red-700" },
  CANCELED: { label: "解約済み", className: "bg-stone-100 text-stone-500" },
  PAUSED: { label: "一時停止", className: "bg-yellow-100 text-yellow-700" },
};

const INTERVAL_LABELS: Record<string, string> = { MONTHLY: "月額", YEARLY: "年額", ONE_TIME: "一回払い" };

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ACTIVE");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/subscriptions?status=${filter}`)
      .then((r) => r.json())
      .then((data) => {
        setSubscriptions(Array.isArray(data) ? data : []);
        setLoading(false);
      });
  }, [filter]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800">サブスク管理</h1>
        <p className="text-sm text-stone-500 mt-0.5">会員プランの加入状況</p>
      </div>

      <div className="flex gap-2 mb-4">
        {["ACTIVE", "PAST_DUE", "CANCELED", "PAUSED"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs ${filter === s ? "bg-amber-700 text-white" : "bg-stone-100 text-stone-600"}`}
          >
            {STATUS_LABELS[s].label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-stone-400">読み込み中...</div>
      ) : subscriptions.length === 0 ? (
        <div className="text-center py-12 text-stone-400">該当するサブスクリプションがありません</div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500">会員名</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500">プラン</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-stone-500">金額</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500">ステータス</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500">次回更新</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {subscriptions.map((sub) => (
                <tr key={sub.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3 text-stone-700">{sub.member.user.name}</td>
                  <td className="px-4 py-3 text-stone-600">{sub.plan.name}</td>
                  <td className="px-4 py-3 text-right text-stone-800">
                    ¥{sub.plan.price.toLocaleString()}/{INTERVAL_LABELS[sub.plan.interval]}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_LABELS[sub.status]?.className ?? ""}`}>
                      {STATUS_LABELS[sub.status]?.label ?? sub.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-stone-500 text-xs">
                    {sub.currentPeriodEnd
                      ? new Date(sub.currentPeriodEnd).toLocaleDateString("ja-JP")
                      : sub.canceledAt
                      ? `解約: ${new Date(sub.canceledAt).toLocaleDateString("ja-JP")}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
