"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CancelSubButton({ subId }: { subId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    if (!confirm("このサブスクリプションを解約しますか？")) return;
    setLoading(true);
    await fetch(`/api/subscriptions/${subId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELED" }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleCancel}
      disabled={loading}
      className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40"
    >
      {loading ? "処理中…" : "解約"}
    </button>
  );
}
