"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy } from "lucide-react";

export default function DuplicateEventButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDuplicate() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/events/${eventId}/duplicate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "複製に失敗しました");
        return;
      }
      router.push(`/admin/events/${data.event.id}/edit`);
    });
  }

  return (
    <div>
      <button
        onClick={handleDuplicate}
        disabled={isPending}
        className="flex items-center gap-1.5 text-sm text-stone-600 border border-stone-200 px-3 py-1.5 rounded-lg hover:bg-stone-50 disabled:opacity-50 transition-colors"
      >
        <Copy size={13} />
        {isPending ? "複製中…" : "複製"}
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
