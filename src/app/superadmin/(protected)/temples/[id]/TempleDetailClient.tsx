"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const PLAN_OPTIONS = [
  { value: "TRIAL", label: "トライアル", color: "text-blue-300" },
  { value: "ACTIVE", label: "有効（課金中）", color: "text-teal-300" },
  { value: "PAST_DUE", label: "支払遅延", color: "text-amber-300" },
  { value: "SUSPENDED", label: "停止中", color: "text-red-300" },
  { value: "CANCELLED", label: "解約済", color: "text-stone-400" },
];

export default function TempleDetailClient({
  templeId, currentPlan,
}: { templeId: string; currentPlan: string }) {
  const router = useRouter();
  const [plan, setPlan] = useState(currentPlan);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    if (plan === currentPlan) { setMsg("変更がありません"); return; }
    startTransition(async () => {
      const res = await fetch(`/api/superadmin/temples/${templeId}/plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planStatus: plan, reason }),
      });
      if (!res.ok) { setMsg("更新に失敗しました"); return; }
      setMsg("プランを更新しました");
      setReason("");
      router.refresh();
    });
  }

  return (
    <div className="bg-stone-900 rounded-xl border border-stone-800 p-5">
      <h2 className="text-sm font-semibold text-stone-300 mb-4">プラン管理</h2>
      {msg && (
        <div className="mb-3 p-2 bg-stone-800 rounded text-xs text-stone-300">{msg}</div>
      )}
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-stone-400 mb-1">プランステータス</label>
          <select
            value={plan}
            onChange={(e) => { setPlan(e.target.value); setMsg(""); }}
            className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {PLAN_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-stone-400 mb-1">変更理由（任意・ログに記録）</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="例：支払い確認のため一時停止"
            className="w-full bg-stone-800 border border-stone-600 rounded-lg px-3 py-2 text-sm text-white placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={isPending || plan === currentPlan}
          className="w-full py-2 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 disabled:opacity-40"
        >
          {isPending ? "更新中…" : "プランを変更する"}
        </button>
      </div>
    </div>
  );
}
