"use client";

import { useState, useTransition } from "react";
import BulkEmailModal from "./BulkEmailModal";

const STATUS_OPTIONS = [
  { value: "APPLIED", label: "申込" },
  { value: "CONFIRMED", label: "確定" },
  { value: "WAITLISTED", label: "キャンセル待ち" },
  { value: "ATTENDED", label: "参加済" },
  { value: "NO_SHOW", label: "不参加" },
  { value: "CANCELLED", label: "キャンセル" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  APPLIED: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-teal-100 text-teal-800",
  WAITLISTED: "bg-stone-100 text-stone-600",
  ATTENDED: "bg-green-100 text-green-800",
  NO_SHOW: "bg-red-100 text-red-600",
  CANCELLED: "bg-stone-100 text-stone-400",
};

const PAYMENT_LABELS: Record<string, string> = {
  NOT_REQUIRED: "不要",
  PENDING: "未払い",
  PAID: "支払済",
  REFUNDED: "返金済",
};

const PAYMENT_COLORS: Record<string, string> = {
  NOT_REQUIRED: "text-stone-400",
  PENDING: "text-amber-600 font-medium",
  PAID: "text-teal-700 font-medium",
  REFUNDED: "text-red-500",
};

interface Participant {
  id: string;
  status: string;
  numGuests: number;
  paymentStatus: string;
  stripePaymentIntentId: string | null;
  createdAt: string;
  member: {
    familyName: string;
    user: { name: string; email: string; phone: string | null };
  };
}

interface Props {
  eventId: string;
  initialParticipants: Participant[];
}

export default function ParticipantsClient({ eventId, initialParticipants }: Props) {
  const [participants, setParticipants] = useState(initialParticipants);
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<"success" | "error">("success");
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);

  function showMsg(text: string, type: "success" | "error" = "success") {
    setMsg(text);
    setMsgType(type);
    setTimeout(() => setMsg(null), 3000);
  }

  function handleStatusChange(pid: string, newStatus: string) {
    startTransition(async () => {
      const res = await fetch(`/api/events/${eventId}/participants/${pid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setParticipants((prev) =>
          prev.map((p) => (p.id === pid ? { ...p, status: newStatus } : p))
        );
        showMsg("ステータスを更新しました");
      }
    });
  }

  async function handleRefund(pid: string) {
    if (!confirm("この参加者への返金を実行しますか？この操作は取り消せません。")) return;
    setRefundingId(pid);
    try {
      const res = await fetch(`/api/events/${eventId}/participants/${pid}/refund`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setParticipants((prev) =>
          prev.map((p) => (p.id === pid ? { ...p, paymentStatus: "REFUNDED" } : p))
        );
        showMsg("返金処理が完了しました");
      } else {
        showMsg(data.error ?? "返金に失敗しました", "error");
      }
    } catch {
      showMsg("通信エラーが発生しました", "error");
    } finally {
      setRefundingId(null);
    }
  }

  // 一括出席確認
  function handleBulkAttend() {
    const confirmed = participants.filter((p) => p.status === "CONFIRMED" || p.status === "APPLIED");
    startTransition(async () => {
      await Promise.all(
        confirmed.map((p) =>
          fetch(`/api/events/${eventId}/participants/${p.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "ATTENDED" }),
          })
        )
      );
      setParticipants((prev) =>
        prev.map((p) =>
          p.status === "CONFIRMED" || p.status === "APPLIED" ? { ...p, status: "ATTENDED" } : p
        )
      );
      showMsg(`${confirmed.length}名を出席確認しました`);
    });
  }

  const active = participants.filter((p) => !["CANCELLED"].includes(p.status));
  const cancelled = participants.filter((p) => p.status === "CANCELLED");

  return (
    <div>
      {msg && (
        <div className={`mb-4 p-3 rounded-lg text-sm border ${
          msgType === "error"
            ? "bg-red-50 border-red-200 text-red-700"
            : "bg-teal-50 border-teal-200 text-teal-700"
        }`}>
          {msg}
        </div>
      )}

      {showEmailModal && (
        <BulkEmailModal eventId={eventId} onClose={() => setShowEmailModal(false)} />
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-stone-800">参加者一覧（{active.length}名）</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowEmailModal(true)}
            className="px-3 py-1.5 bg-stone-700 text-white text-sm rounded-lg hover:bg-stone-800"
          >
            一斉メール
          </button>
          <button
            onClick={handleBulkAttend}
            disabled={isPending}
            className="px-3 py-1.5 bg-teal-700 text-white text-sm rounded-lg hover:bg-teal-800 disabled:opacity-40"
          >
            一括出席確認
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="text-left px-4 py-3 text-stone-500 font-medium">氏名</th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium">家名</th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium">人数</th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium">申込日</th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium">支払</th>
                <th className="text-left px-4 py-3 text-stone-500 font-medium">ステータス</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {active.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-stone-400">
                    参加者はいません
                  </td>
                </tr>
              ) : (
                active.map((p) => (
                  <tr key={p.id} className="border-b border-stone-50 hover:bg-stone-50">
                    <td className="px-4 py-3 font-medium text-stone-800">{p.member.user.name}</td>
                    <td className="px-4 py-3 text-stone-600">{p.member.familyName}</td>
                    <td className="px-4 py-3 text-stone-600">{p.numGuests}名</td>
                    <td className="px-4 py-3 text-stone-500 text-xs">
                      {new Date(p.createdAt).toLocaleDateString("ja-JP")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs ${PAYMENT_COLORS[p.paymentStatus] ?? "text-stone-500"}`}>
                        {PAYMENT_LABELS[p.paymentStatus] ?? p.paymentStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={p.status}
                        onChange={(e) => handleStatusChange(p.id, e.target.value)}
                        disabled={isPending}
                        className={`px-2 py-0.5 rounded-full text-xs font-medium border-0 cursor-pointer ${STATUS_COLORS[p.status]}`}
                      >
                        {STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.paymentStatus === "PAID" && p.stripePaymentIntentId && (
                        <button
                          onClick={() => handleRefund(p.id)}
                          disabled={refundingId === p.id}
                          className="px-2 py-1 text-xs bg-red-50 border border-red-200 text-red-600 rounded hover:bg-red-100 disabled:opacity-40"
                        >
                          {refundingId === p.id ? "処理中…" : "返金"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {cancelled.length > 0 && (
        <details className="text-sm text-stone-400">
          <summary className="cursor-pointer hover:text-stone-600">
            キャンセル済み ({cancelled.length}名)
          </summary>
          <ul className="mt-2 space-y-1 pl-2">
            {cancelled.map((p) => (
              <li key={p.id}>
                {p.member.user.name}（{p.member.familyName}）
                {p.paymentStatus === "REFUNDED" && <span className="ml-1 text-xs text-red-400">返金済</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
