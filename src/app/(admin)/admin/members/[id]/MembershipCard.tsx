"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Layers } from "lucide-react";

type MembershipType = {
  id: string;
  name: string;
  pricingModel: string;
  priceJpy: number | null;
};

type ActiveMembership = {
  id: string;
  membershipType: MembershipType;
  stage: { id: string; name: string } | null;
  joinedAt: string;
};

interface Props {
  memberId: string;
  initialMemberships: ActiveMembership[];
  availableTypes: MembershipType[];
}

const PRICING_LABELS: Record<string, string> = {
  FREE: "無料",
  ONE_TIME: "一括",
  SUBSCRIPTION: "サブスク",
  DONATION: "寄付",
};

export default function MembershipCard({ memberId, initialMemberships, availableTypes }: Props) {
  const [memberships, setMemberships] = useState(initialMemberships);
  const [addingTypeId, setAddingTypeId] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const assignedTypeIds = new Set(memberships.map((m) => m.membershipType.id));
  const unassignedTypes = availableTypes.filter((t) => !assignedTypeIds.has(t.id));

  function handleAdd() {
    if (!addingTypeId) return;
    startTransition(async () => {
      setError(null);
      const res = await fetch("/api/memberships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, membershipTypeId: addingTypeId }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "追加に失敗しました");
        return;
      }
      const created = await res.json();
      const type = availableTypes.find((t) => t.id === addingTypeId)!;
      setMemberships((prev) => [...prev, {
        id: created.id,
        membershipType: type,
        stage: null,
        joinedAt: created.joinedAt,
      }]);
      setAddingTypeId("");
      setShowAdd(false);
    });
  }

  function handleRemove(membershipId: string) {
    startTransition(async () => {
      setError(null);
      const res = await fetch(`/api/memberships/${membershipId}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "削除に失敗しました");
        return;
      }
      setMemberships((prev) => prev.filter((m) => m.id !== membershipId));
    });
  }

  return (
    <section className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Layers size={14} className="text-stone-500" />
          <h2 className="font-semibold text-stone-800 text-sm">メンバーシップ</h2>
        </div>
        {unassignedTypes.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="text-xs text-amber-700 hover:text-amber-900 font-medium flex items-center gap-0.5"
          >
            <Plus size={12} />追加
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded-lg px-2 py-1.5 mb-2">{error}</p>
      )}

      {memberships.length === 0 && !showAdd && (
        <p className="text-sm text-stone-400">未加入</p>
      )}

      {memberships.length > 0 && (
        <div className="space-y-2 mb-2">
          {memberships.map((m) => (
            <div key={m.id} className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-amber-800">{m.membershipType.name}</p>
                <p className="text-[10px] text-stone-400">
                  {PRICING_LABELS[m.membershipType.pricingModel] ?? m.membershipType.pricingModel}
                  {m.membershipType.priceJpy != null && ` · ¥${m.membershipType.priceJpy.toLocaleString()}`}
                  {m.stage && ` · ${m.stage.name}`}
                </p>
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleRemove(m.id)}
                className="text-stone-300 hover:text-red-500 transition-colors disabled:opacity-50"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="flex items-center gap-2 mt-2">
          <select
            value={addingTypeId}
            onChange={(e) => setAddingTypeId(e.target.value)}
            className="flex-1 text-sm border border-stone-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
          >
            <option value="">種別を選択…</option>
            {unassignedTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <button
            type="button"
            disabled={!addingTypeId || isPending}
            onClick={handleAdd}
            className="px-3 py-1.5 bg-amber-700 text-white text-xs font-semibold rounded-lg hover:bg-amber-800 disabled:opacity-50"
          >
            {isPending ? "…" : "追加"}
          </button>
          <button
            type="button"
            onClick={() => setShowAdd(false)}
            className="text-xs text-stone-400 hover:text-stone-600"
          >
            閉じる
          </button>
        </div>
      )}
    </section>
  );
}
