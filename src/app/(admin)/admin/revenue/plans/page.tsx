"use client";

import { useEffect, useState } from "react";

type Plan = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  interval: string;
  isActive: boolean;
  _count: { subscriptions: number };
};

const INTERVAL_LABELS: Record<string, string> = {
  MONTHLY: "月額",
  YEARLY: "年額",
  ONE_TIME: "一回払い",
};

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", price: "", interval: "MONTHLY" });
  const [saving, setSaving] = useState(false);

  async function fetchPlans() {
    setLoading(true);
    const res = await fetch("/api/plans");
    const data = await res.json();
    setPlans(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => { fetchPlans(); }, []);

  async function handleCreate() {
    setSaving(true);
    await fetch("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, price: Number(form.price) }),
    });
    setSaving(false);
    setShowForm(false);
    setForm({ name: "", description: "", price: "", interval: "MONTHLY" });
    fetchPlans();
  }

  async function handleToggle(id: string, isActive: boolean) {
    await fetch(`/api/plans/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    fetchPlans();
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">会員プラン管理</h1>
          <p className="text-sm text-stone-500 mt-0.5">サブスクリプションプランの設定</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-amber-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-amber-800"
        >
          新規プラン作成
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-amber-200 rounded-xl p-5 mb-6">
          <h2 className="font-semibold text-stone-800 mb-4">新規プラン</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">プラン名</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                placeholder="座禅通い放題パス"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">金額（円）</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
                placeholder="1000"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">課金サイクル</label>
              <select
                value={form.interval}
                onChange={(e) => setForm({ ...form, interval: e.target.value })}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="MONTHLY">月額</option>
                <option value="YEARLY">年額</option>
                <option value="ONE_TIME">一回払い</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">説明（任意）</label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={saving || !form.name || !form.price}
              className="bg-amber-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
            >
              {saving ? "保存中..." : "作成"}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-stone-500">
              キャンセル
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-stone-400">読み込み中...</div>
      ) : plans.length === 0 ? (
        <div className="text-center py-12 text-stone-400">プランが未作成です</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div key={plan.id} className={`bg-white rounded-xl border p-5 ${plan.isActive ? "border-stone-200" : "border-stone-100 opacity-60"}`}>
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-stone-800">{plan.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${plan.isActive ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-500"}`}>
                  {plan.isActive ? "有効" : "無効"}
                </span>
              </div>
              {plan.description && <p className="text-xs text-stone-500 mb-3">{plan.description}</p>}
              <p className="text-2xl font-bold text-stone-800 mb-1">
                ¥{plan.price.toLocaleString()}
                <span className="text-sm font-normal text-stone-500 ml-1">/ {INTERVAL_LABELS[plan.interval]}</span>
              </p>
              <p className="text-xs text-stone-400 mb-4">{plan._count.subscriptions}名加入中</p>
              <button
                onClick={() => handleToggle(plan.id, plan.isActive)}
                className="text-xs text-amber-700 hover:text-amber-900"
              >
                {plan.isActive ? "無効にする" : "有効にする"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
