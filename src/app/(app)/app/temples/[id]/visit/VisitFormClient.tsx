"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, PenLine, Check } from "lucide-react";

interface Props {
  templeId: string;
  templeName: string;
  denomination: string | null;
  visitedAt: string; // ISO string of today
}

export default function VisitFormClient({ templeId, templeName, denomination, visitedAt }: Props) {
  const router = useRouter();
  const [memo, setMemo] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const dateLabel = new Date(visitedAt).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/temple-visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templeId, memo }),
      });
      if (!res.ok) throw new Error("failed");
      setDone(true);
      setTimeout(() => router.push("/app/temples/history"), 1200);
    } catch {
      setSaving(false);
      alert("保存に失敗しました。もう一度お試しください。");
    }
  }

  return (
    <div className="max-w-lg mx-auto px-4 pt-6 pb-28 space-y-5">
      {/* お寺情報（読み取り専用） */}
      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-xl shrink-0">
          🏯
        </div>
        <div>
          <p className="font-bold text-stone-800">{templeName}</p>
          {denomination && (
            <p className="text-xs text-amber-700 font-medium mt-0.5">{denomination}</p>
          )}
          <p className="text-xs text-stone-400 flex items-center gap-1 mt-0.5">
            <MapPin size={10} />
            参拝日：{dateLabel}
          </p>
        </div>
      </div>

      {/* メモフォーム */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4">
          <label className="flex items-center gap-1.5 text-xs font-bold text-stone-500 uppercase tracking-widest mb-3">
            <PenLine size={12} />
            今日の参拝メモ
          </label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="今日のお参りの気づきや感想を自由に書いてください..."
            rows={6}
            className="w-full resize-none text-sm text-stone-700 placeholder-stone-300 border border-stone-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400"
          />
          <p className="text-right text-[10px] text-stone-300 mt-1">{memo.length}文字</p>
        </div>

        <button
          type="submit"
          disabled={saving || done}
          className={`w-full py-3.5 rounded-2xl text-sm font-semibold shadow-sm transition-all flex items-center justify-center gap-2 ${
            done
              ? "bg-green-500 text-white"
              : "bg-amber-700 hover:bg-amber-800 text-white disabled:opacity-60"
          }`}
        >
          {done ? (
            <>
              <Check size={16} />
              記録しました
            </>
          ) : saving ? (
            "保存中..."
          ) : (
            "参拝を記録する"
          )}
        </button>
      </form>
    </div>
  );
}
