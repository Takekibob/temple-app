"use client";

import { useState, useTransition } from "react";

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

interface Participant {
  id: string;
  status: string;
  numGuests: number;
  paymentStatus: string;
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

  function handleStatusChange(pid: string, newStatus: string) {
    startTransition(async () => {
      setMsg(null);
      const res = await fetch(`/api/events/${eventId}/participants/${pid}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setParticipants((prev) =>
          prev.map((p) => (p.id === pid ? { ...p, status: newStatus } : p))
        );
        setMsg("ステータスを更新しました");
        setTimeout(() => setMsg(null), 2000);
      }
    });
  }

  // Bulk attendance confirmation
  function handleBulkAttend() {
    const confirmed = participants.filter((p) => p.status === "CONFIRMED" || p.status === "APPLIED");
    startTransition(async () => {
      setMsg(null);
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
      setMsg(`${confirmed.length}名を出席確認しました`);
      setTimeout(() => setMsg(null), 3000);
    });
  }

  const active = participants.filter((p) => !["CANCELLED"].includes(p.status));
  const cancelled = participants.filter((p) => p.status === "CANCELLED");

  return (
    <div>
      {msg && (
        <div className="mb-4 p-3 bg-teal-50 border border-teal-200 rounded-lg text-teal-700 text-sm">
          {msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-stone-800">参加者一覧（{active.length}名）</h2>
        <button
          onClick={handleBulkAttend}
          disabled={isPending}
          className="px-3 py-1.5 bg-teal-700 text-white text-sm rounded-lg hover:bg-teal-800 disabled:opacity-40"
        >
          一括出席確認
        </button>
      </div>

      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-100 bg-stone-50">
              <th className="text-left px-4 py-3 text-stone-500 font-medium">氏名</th>
              <th className="text-left px-4 py-3 text-stone-500 font-medium">家名</th>
              <th className="text-left px-4 py-3 text-stone-500 font-medium">人数</th>
              <th className="text-left px-4 py-3 text-stone-500 font-medium">申込日</th>
              <th className="text-left px-4 py-3 text-stone-500 font-medium">支払</th>
              <th className="text-left px-4 py-3 text-stone-500 font-medium">ステータス</th>
            </tr>
          </thead>
          <tbody>
            {active.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-stone-400">
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
                  <td className="px-4 py-3 text-stone-500 text-xs">
                    {PAYMENT_LABELS[p.paymentStatus]}
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {cancelled.length > 0 && (
        <details className="text-sm text-stone-400">
          <summary className="cursor-pointer hover:text-stone-600">
            キャンセル済み ({cancelled.length}名)
          </summary>
          <ul className="mt-2 space-y-1 pl-2">
            {cancelled.map((p) => (
              <li key={p.id}>{p.member.user.name}（{p.member.familyName}）</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
