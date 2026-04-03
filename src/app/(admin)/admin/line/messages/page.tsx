"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Send, Plus, Users } from "lucide-react";

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

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-stone-100 text-stone-500",
  SCHEDULED: "bg-blue-100 text-blue-700",
  SENDING: "bg-amber-100 text-amber-700",
  SENT: "bg-teal-100 text-teal-700",
  FAILED: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "下書き",
  SCHEDULED: "予約済み",
  SENDING: "送信中",
  SENT: "送信済み",
  FAILED: "失敗",
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
    <div className="p-6 max-w-3xl">
      {/* ヘッダー */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Send size={18} className="text-[#06C755]" />
            <h1 className="text-2xl font-bold text-stone-800 tracking-tight">配信履歴</h1>
          </div>
          <p className="text-sm text-stone-400">全{total}件</p>
        </div>
        <Link
          href="/admin/line/messages/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-[#06C755] text-white text-sm font-semibold rounded-xl hover:brightness-95 transition-all shadow-sm"
        >
          <Plus size={14} />新規配信
        </Link>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-12 text-center text-stone-400 text-sm">
          読み込み中...
        </div>
      ) : messages.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-12 text-center">
          <div className="w-14 h-14 bg-stone-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Send size={24} className="text-stone-300" />
          </div>
          <p className="text-stone-400 text-sm">配信履歴がありません</p>
          <Link href="/admin/line/messages/new" className="text-[#06C755] text-sm font-semibold mt-2 inline-block">
            最初のメッセージを作成する →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-stone-50">
            {messages.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="w-9 h-9 bg-stone-50 rounded-xl flex items-center justify-center shrink-0">
                  <Send size={14} className="text-stone-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-xs font-semibold text-stone-700">
                      {TYPE_LABELS[m.messageType] ?? m.messageType}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[m.status] ?? "bg-stone-100 text-stone-600"}`}>
                      {STATUS_LABELS[m.status] ?? m.status}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400">
                    {m.sentAt
                      ? `送信: ${new Date(m.sentAt).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
                      : m.scheduledAt
                      ? `予約: ${new Date(m.scheduledAt).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}`
                      : new Date(m.createdAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}
                  </p>
                </div>
                {m.sentCount > 0 && (
                  <div className="flex items-center gap-1 text-xs text-stone-500 shrink-0">
                    <Users size={11} className="text-stone-400" />
                    <span className="font-medium">{m.sentCount}名</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
