"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

type Step = { delayDays: number; message: string };

const TRIGGER_LABELS: Record<string, string> = {
  LINE_REGISTER: "LINE登録時",
  FIRST_EVENT_ATTEND: "イベント初参加時",
  STAGE_CHANGE_PROSPECT: "見込みステージ遷移時",
  STAGE_CHANGE_CANDIDATE: "檀家候補ステージ遷移時",
  DONATION_FIRST: "初回寄付時",
};

export default function EditSequencePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("LINE_REGISTER");
  const [steps, setSteps] = useState<Step[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/line/sequences/${id}`)
      .then((r) => r.json())
      .then((seq) => {
        setName(seq.name ?? "");
        setTrigger(seq.trigger ?? "LINE_REGISTER");
        const rawSteps = Array.isArray(seq.steps) ? seq.steps : [];
        setSteps(
          rawSteps.map((s: { delayDays: number; message: { text?: string } | string }) => ({
            delayDays: s.delayDays,
            message: typeof s.message === "string" ? s.message : s.message?.text ?? "",
          }))
        );
        setLoading(false);
      });
  }, [id]);

  function addStep() {
    setSteps((prev) => [...prev, { delayDays: prev.length, message: "" }]);
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  function updateStep(index: number, field: keyof Step, value: string | number) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const stepsPayload = steps.map((s) => ({
      delayDays: Number(s.delayDays),
      message: { type: "text", text: s.message },
    }));

    const res = await fetch(`/api/line/sequences/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, trigger, steps: stepsPayload }),
    });

    if (res.ok) {
      router.push("/admin/line/sequences");
    } else {
      const d = await res.json();
      setError(d.error ?? "保存に失敗しました");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("このシーケンスを削除しますか？")) return;
    setDeleting(true);
    await fetch(`/api/line/sequences/${id}`, { method: "DELETE" });
    router.push("/admin/line/sequences");
  }

  if (loading) {
    return <div className="p-6 text-stone-400">読み込み中...</div>;
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/line/sequences" className="text-stone-400 hover:text-stone-600">‹</Link>
        <h1 className="text-2xl font-bold text-stone-800">ステップ配信シーケンス編集</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">シーケンス名</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            placeholder="ご縁さん育成シーケンス"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">開始トリガー</label>
          <select
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {Object.entries(TRIGGER_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
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
                      className="w-16 border border-stone-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400"
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
                  className="w-full border border-stone-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
                  placeholder="メッセージ内容"
                />
              </div>
            ))}
          </div>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="text-sm text-red-500 hover:text-red-700 disabled:opacity-40"
          >
            {deleting ? "削除中..." : "シーケンスを削除"}
          </button>
          <div className="flex gap-3">
            <Link href="/admin/line/sequences" className="px-4 py-2 text-sm text-stone-500 hover:text-stone-700">
              キャンセル
            </Link>
            <button
              type="submit"
              disabled={saving || !name || steps.some((s) => !s.message)}
              className="bg-amber-700 text-white px-6 py-2 rounded-lg text-sm hover:bg-amber-800 disabled:opacity-50"
            >
              {saving ? "保存中..." : "変更を保存"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
