"use client";

import { useState, useTransition } from "react";

const STATUS_OPTIONS = [
  { value: "PENDING", label: "確認待ち" },
  { value: "CONFIRMED", label: "確定" },
  { value: "CANCELLED", label: "キャンセル" },
] as const;

interface Props {
  id: string;
  currentStatus: string;
  isReadOnly: boolean;
}

export default function ReservationStatusForm({ id, currentStatus, isReadOnly }: Props) {
  const [status, setStatus] = useState(currentStatus);
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleUpdate() {
    setMsg(null);
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setMsg("ステータスを更新しました");
      } else {
        const data = await res.json();
        setError(data.error ?? "更新に失敗しました");
      }
    });
  }

  if (isReadOnly) {
    const opt = STATUS_OPTIONS.find((o) => o.value === currentStatus);
    return (
      <section className="bg-white rounded-xl border border-stone-200 p-4">
        <h2 className="font-semibold text-stone-800 mb-3">ステータス</h2>
        <p className="text-sm text-stone-700">{opt?.label ?? currentStatus}</p>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-xl border border-stone-200 p-4">
      <h2 className="font-semibold text-stone-800 mb-3">ステータス管理</h2>

      {msg && (
        <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {msg}
        </div>
      )}
      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatus(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
              status === opt.value
                ? "border-amber-500 bg-amber-50 text-amber-800 font-medium"
                : "border-stone-200 text-stone-600 hover:bg-stone-50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <button
        onClick={handleUpdate}
        disabled={isPending || status === currentStatus}
        className="px-4 py-2 bg-amber-700 text-white text-sm rounded-lg hover:bg-amber-800 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isPending ? "更新中…" : "ステータスを更新"}
      </button>
    </section>
  );
}
