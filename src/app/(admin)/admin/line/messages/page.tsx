"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type LineMessage = {
  id: string;
  messageType: string;
  status: string;
  sentCount: number;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
};

const TYPE_LABELS: Record<string, string> = {
  BROADCAST: "一斉",
  SEGMENT: "セグメント",
  INDIVIDUAL: "個別",
  STEP: "ステップ",
  REMINDER: "リマインダー",
  THANKYOU: "お礼",
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "下書き", className: "bg-stone-100 text-stone-500" },
  SCHEDULED: { label: "予約済み", className: "bg-blue-100 text-blue-700" },
  SENDING: { label: "送信中", className: "bg-yellow-100 text-yellow-700" },
  SENT: { label: "送信済み", className: "bg-green-100 text-green-700" },
  FAILED: { label: "失敗", className: "bg-red-100 text-red-700" },
};

export default function MessagesPage() {
  const [messages, setMessages] = useState<LineMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/line/messages")
      .then((r) => r.json())
      .then((d) => {
        setMessages(d.messages ?? []);
        setTotal(d.total ?? 0);
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">配信履歴</h1>
          <p className="text-sm text-stone-500 mt-0.5">全{total}件</p>
        </div>
        <Link
          href="/admin/line/messages/new"
          className="bg-amber-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-amber-800"
        >
          新規配信
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-stone-400">読み込み中...</div>
      ) : messages.length === 0 ? (
        <div className="text-center py-12 text-stone-400">配信履歴がありません</div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500">種別</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500">ステータス</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-stone-500">送信数</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-stone-500">送信日時</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {messages.map((m) => (
                <tr key={m.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3">
                    <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
                      {TYPE_LABELS[m.messageType] ?? m.messageType}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_LABELS[m.status]?.className ?? ""}`}>
                      {STATUS_LABELS[m.status]?.label ?? m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-stone-600">{m.sentCount}</td>
                  <td className="px-4 py-3 text-stone-500 text-xs">
                    {m.sentAt
                      ? new Date(m.sentAt).toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
                      : m.scheduledAt
                      ? `予約: ${new Date(m.scheduledAt).toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}`
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
