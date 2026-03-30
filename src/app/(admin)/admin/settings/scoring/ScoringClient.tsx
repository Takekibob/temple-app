"use client";

import { useState } from "react";

interface Props {
  initialScores: Record<string, number>;
  activityLabels: Record<string, string>;
}

export default function ScoringClient({ initialScores, activityLabels }: Props) {
  const [scores, setScores] = useState<Record<string, number>>(initialScores);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (activityType: string, value: string) => {
    const num = parseInt(value);
    if (isNaN(num) || num < 0) return;
    setScores((prev) => ({ ...prev, [activityType]: num }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/scoring-rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rules: Object.entries(scores).map(([activityType, score]) => ({
            activityType,
            score,
          })),
        }),
      });
      if (!res.ok) throw new Error("保存に失敗しました");
      setSaved(true);
    } catch {
      setError("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-stone-100 bg-stone-50">
        <h2 className="text-sm font-semibold text-stone-700">アクティビティポイント設定</h2>
      </div>
      <div className="divide-y divide-stone-100">
        {Object.entries(activityLabels).map(([activityType, label]) => (
          <div key={activityType} className="flex items-center justify-between px-4 py-3">
            <label className="text-sm text-stone-700">{label}</label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={0}
                max={100}
                value={scores[activityType] ?? 0}
                onChange={(e) => handleChange(activityType, e.target.value)}
                className="w-20 px-2 py-1 text-sm text-right border border-stone-200 rounded-lg focus:outline-none focus:border-amber-400"
              />
              <span className="text-sm text-stone-400">pt</span>
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-4 border-t border-stone-100 flex items-center justify-between">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && !error && <p className="text-sm text-teal-600">保存しました</p>}
        {!error && !saved && <span />}
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-amber-700 text-white text-sm rounded-lg hover:bg-amber-800 disabled:opacity-50 transition-colors"
        >
          {saving ? "保存中..." : "保存する"}
        </button>
      </div>
    </div>
  );
}
