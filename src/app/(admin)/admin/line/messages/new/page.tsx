"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewMessagePage() {
  const router = useRouter();
  const [messageType, setMessageType] = useState("BROADCAST");
  const [targetStage, setTargetStage] = useState("");
  const [text, setText] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    setError("");

    const content = { type: "text", text };
    const body: Record<string, unknown> = { messageType, content };
    if (messageType === "SEGMENT" && targetStage) body.targetStage = targetStage;
    if (scheduledAt) body.scheduledAt = scheduledAt;

    const res = await fetch("/api/line/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "送信に失敗しました");
      setSaving(false);
      return;
    }

    router.push("/admin/line/messages");
  }

  return (
    <div className="p-4 sm:p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-stone-800 mb-6">新規LINE配信</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">配信種別</label>
          <select
            value={messageType}
            onChange={(e) => setMessageType(e.target.value)}
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="BROADCAST">一斉配信（全フォロワー）</option>
            <option value="SEGMENT">セグメント配信（ステージ別）</option>
          </select>
        </div>

        {messageType === "SEGMENT" && (
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">対象ステージ</label>
            <select
              value={targetStage}
              onChange={(e) => setTargetStage(e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">選択してください</option>
              <option value="GOEN">ご縁さん</option>
              <option value="PROSPECT">見込み</option>
              <option value="DANKA_CANDIDATE">檀家候補</option>
              <option value="DANKA">檀家</option>
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">メッセージ本文</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
            placeholder="配信するメッセージを入力してください"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">予約送信（空欄で即時送信）</label>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving || !text.trim()}
            className="bg-amber-700 text-white px-6 py-2 rounded-lg text-sm hover:bg-amber-800 disabled:opacity-50"
          >
            {saving ? "送信中..." : scheduledAt ? "予約登録" : "今すぐ送信"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm text-stone-500"
          >
            キャンセル
          </button>
        </div>
      </form>
    </div>
  );
}
