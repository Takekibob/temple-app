"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export default function PromoteButton({
  memberId,
  memberName,
}: {
  memberId: string;
  memberName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handlePromote() {
    if (!confirm(`${memberName} さんを檀家に昇格しますか？`)) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/members/${memberId}/promote`, { method: "POST" });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        setError(data.error ?? "昇格に失敗しました");
      }
    });
  }

  return (
    <div>
      <button
        onClick={handlePromote}
        disabled={isPending}
        className="px-4 py-2 text-sm bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-40"
      >
        {isPending ? "処理中…" : "檀家に昇格"}
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
