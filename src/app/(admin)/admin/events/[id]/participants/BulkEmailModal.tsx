"use client";

import { useState } from "react";

const STATUS_OPTIONS = [
  { value: "APPLIED", label: "申込" },
  { value: "CONFIRMED", label: "確定" },
  { value: "ATTENDED", label: "参加済" },
];

interface Props {
  eventId: string;
  onClose: () => void;
}

export default function BulkEmailModal({ eventId, onClose }: Props) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [targetStatuses, setTargetStatuses] = useState<string[]>(["APPLIED", "CONFIRMED"]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  function toggleStatus(status: string) {
    setTargetStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
    );
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm(`選択した参加者にメールを送信しますか？`)) return;
    setSending(true);
    setResult(null);
    try {
      const res = await fetch(`/api/events/${eventId}/send-bulk-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body, targetStatuses }),
      });
      const json = await res.json();
      if (res.ok) {
        setResult(`${json.sent}名にメールを送信しました`);
      } else {
        setResult(json.error ?? "送信に失敗しました");
      }
    } catch {
      setResult("通信エラーが発生しました");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-stone-100">
          <h2 className="font-semibold text-stone-800">参加者への一斉メール</h2>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSend} className="p-5 space-y-4">
          {/* 送信対象 */}
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-2">送信対象ステータス</label>
            <div className="flex gap-2 flex-wrap">
              {STATUS_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={targetStatuses.includes(opt.value)}
                    onChange={() => toggleStatus(opt.value)}
                    className="rounded border-stone-300"
                  />
                  <span className="text-sm text-stone-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 件名 */}
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-1">
              件名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="例: イベントのご案内"
              required
              className="w-full h-9 rounded-lg border border-stone-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <p className="text-xs text-stone-400 mt-1">※ 件名の前に「【イベント名】」が自動で付きます</p>
          </div>

          {/* 本文 */}
          <div>
            <label className="text-xs font-medium text-stone-600 block mb-1">
              本文 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="メール本文を入力してください"
              required
              rows={6}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </div>

          {result && (
            <p className={`text-sm px-3 py-2 rounded-lg ${
              result.includes("失敗") || result.includes("エラー")
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-teal-50 text-teal-700 border border-teal-200"
            }`}>
              {result}
            </p>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-stone-200 rounded-lg hover:bg-stone-50"
            >
              閉じる
            </button>
            <button
              type="submit"
              disabled={sending || targetStatuses.length === 0}
              className="px-4 py-2 text-sm bg-amber-700 text-white rounded-lg hover:bg-amber-800 disabled:opacity-50"
            >
              {sending ? "送信中…" : "送信する"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
