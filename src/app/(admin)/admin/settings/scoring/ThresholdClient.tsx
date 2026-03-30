"use client";

import { useState } from "react";

interface Props {
  initialThresholds: {
    thresholdGoen: number;
    thresholdProspect: number;
    thresholdCandidate: number;
    dankaGoalAnnual: number | null;
  };
}

export default function ThresholdClient({ initialThresholds }: Props) {
  const [values, setValues] = useState({
    thresholdGoen: initialThresholds.thresholdGoen,
    thresholdProspect: initialThresholds.thresholdProspect,
    thresholdCandidate: initialThresholds.thresholdCandidate,
    dankaGoalAnnual: initialThresholds.dankaGoalAnnual ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: string, raw: string) => {
    const num = raw === "" ? "" : parseInt(raw);
    if (raw !== "" && (isNaN(num as number) || (num as number) < 0)) return;
    setValues((prev) => ({ ...prev, [field]: num }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        thresholdGoen: values.thresholdGoen,
        thresholdProspect: values.thresholdProspect,
        thresholdCandidate: values.thresholdCandidate,
      };
      if (values.dankaGoalAnnual !== "") {
        body.dankaGoalAnnual = Number(values.dankaGoalAnnual);
      }
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("保存に失敗しました");
      setSaved(true);
    } catch {
      setError("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const rows = [
    { field: "thresholdGoen", label: "ご縁さん → 見込み への昇格スコア" },
    { field: "thresholdProspect", label: "見込み → 檀家候補 への昇格スコア" },
    { field: "thresholdCandidate", label: "住職通知スコア（檀家候補到達時）" },
    { field: "dankaGoalAnnual", label: "年間檀家増加目標（件）" },
  ] as const;

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden mb-6">
      <div className="px-4 py-3 border-b border-stone-100 bg-stone-50">
        <h2 className="text-sm font-semibold text-stone-700">ステージ閾値カスタマイズ</h2>
        <p className="text-xs text-stone-400 mt-0.5">お寺ごとに最適な昇格スコアを設定できます</p>
      </div>
      <div className="divide-y divide-stone-100">
        {rows.map(({ field, label }) => (
          <div key={field} className="flex items-center justify-between px-4 py-3">
            <label className="text-sm text-stone-700">{label}</label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={0}
                value={values[field] ?? ""}
                onChange={(e) => handleChange(field, e.target.value)}
                className="w-24 px-2 py-1 text-sm text-right border border-stone-200 rounded-lg focus:outline-none focus:border-amber-400"
              />
              <span className="text-sm text-stone-400">
                {field === "dankaGoalAnnual" ? "件" : "pt"}
              </span>
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
