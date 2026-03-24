"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function CancelButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCancel() {
    startTransition(async () => {
      const res = await fetch(`/api/events/${eventId}/participate`, { method: "DELETE" });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error ?? "キャンセルに失敗しました");
      }
    });
  }

  return (
    <div className="mt-2">
      {error && <p className="text-xs text-red-600 mb-1">{error}</p>}
      <button
        onClick={handleCancel}
        disabled={isPending}
        className="text-xs text-red-600 hover:underline disabled:opacity-40"
      >
        {isPending ? "処理中…" : "申込をキャンセルする"}
      </button>
    </div>
  );
}
