"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Step = { delayDays: number; message: string };

export default function NewSequencePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("LINE_REGISTER");
  const [steps, setSteps] = useState<Step[]>([{ delayDays: 0, message: "" }]);
  const [saving, setSaving] = useState(false);

  function addStep() {
    setSteps((prev) => [...prev, { delayDays: prev.length, message: "" }]);
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  function updateStep(index: number, field: keyof Step, value: string | number) {
    setSteps((prev) => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const stepsPayload = steps.map((s) => ({
      delayDays: Number(s.delayDays),
      message: { type: "text", text: s.message },
    }));

    const res = await fetch("/api/line/sequences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, trigger, steps: stepsPayload }),
    });

    if (res.ok) {
      router.push("/admin/line/sequences");
    } else {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-stone-800 mb-6">ステップ配信シーケンス作成</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">シーケンス名</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
            placeholder="ご縁さん育成シーケンス"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">開始トリガー</label>
          <select
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="LINE_REGISTER">LINE登録時</option>
            <option value="FIRST_EVENT_ATTEND">イベント初参加時</option>
            <option value="STAGE_CHANGE_PROSPECT">見込みステージ遷移時</option>
            <option value="STAGE_CHANGE_CANDIDATE">檀家候補ステージ遷移時</option>
            <option value="DONATION_FIRST">初回寄付時</option>
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-stone-700">配信ステップ</label>
            <button
              type="button"
              onClick={addStep}
              className="text-xs text-amber-700 hover:text-amber-900"
            >
              + ステップ追加
            </button>
          </div>
          <div className="space-y-3">
            {steps.map((step, i) => (
              <div key={i} className="bg-stone-50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs text-stone-500 font-medium w-16">ステップ{i + 1}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      value={step.delayDays}
                      onChange={(e) => updateStep(i, "delayDays", e.target.value)}
                      className="w-16 border border-stone-200 rounded px-2 py-1 text-xs"
                    />
                    <span className="text-xs text-stone-500">日後に送信</span>
                  </div>
                  {steps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStep(i)}
                      className="ml-auto text-xs text-red-400 hover:text-red-600"
                    >
                      削除
                    </button>
                  )}
                </div>
                <textarea
                  value={step.message}
                  onChange={(e) => updateStep(i, "message", e.target.value)}
                  rows={3}
                  className="w-full border border-stone-200 rounded px-2 py-1.5 text-sm"
                  placeholder="メッセージ内容"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving || !name || steps.some((s) => !s.message)}
            className="bg-amber-700 text-white px-6 py-2 rounded-lg text-sm hover:bg-amber-800 disabled:opacity-50"
          >
            {saving ? "保存中..." : "作成"}
          </button>
          <button type="button" onClick={() => router.back()} className="px-4 py-2 text-sm text-stone-500">
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
}
