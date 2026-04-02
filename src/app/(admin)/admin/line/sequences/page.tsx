"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Sequence = {
  id: string;
  name: string;
  trigger: string;
  isActive: boolean;
  _count: { queues: number };
};

const TRIGGER_LABELS: Record<string, string> = {
  FIRST_EVENT_ATTEND: "イベント初参加",
  LINE_REGISTER: "LINE登録",
  STAGE_CHANGE_PROSPECT: "見込みステージ遷移",
  STAGE_CHANGE_CANDIDATE: "檀家候補ステージ遷移",
  DONATION_FIRST: "初回寄付",
};

export default function SequencesPage() {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/line/sequences")
      .then((r) => r.json())
      .then((d) => {
        setSequences(Array.isArray(d) ? d : []);
        setLoading(false);
      });
  }, []);

  async function handleToggle(id: string, isActive: boolean) {
    await fetch(`/api/line/sequences/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    setSequences((prev) => prev.map((s) => s.id === id ? { ...s, isActive: !isActive } : s));
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">ステップ配信</h1>
          <p className="text-sm text-stone-500 mt-0.5">自動配信シーケンスの設定</p>
        </div>
        <Link
          href="/admin/line/sequences/new"
          className="bg-amber-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-amber-800"
        >
          新規作成
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-stone-400">読み込み中...</div>
      ) : sequences.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          <p className="mb-2">ステップ配信シーケンスがありません</p>
          <Link href="/admin/line/sequences/new" className="text-amber-700 text-sm">最初のシーケンスを作成する →</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sequences.map((seq) => (
            <div key={seq.id} className={`bg-white rounded-xl border p-5 ${seq.isActive ? "border-stone-200" : "border-stone-100 opacity-60"}`}>
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-stone-800">{seq.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${seq.isActive ? "bg-green-100 text-green-700" : "bg-stone-100 text-stone-500"}`}>
                  {seq.isActive ? "有効" : "無効"}
                </span>
              </div>
              <p className="text-xs text-stone-500 mb-3">
                トリガー: {TRIGGER_LABELS[seq.trigger] ?? seq.trigger}
              </p>
              <p className="text-xs text-stone-400 mb-4">配信待ち: {seq._count.queues}件</p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleToggle(seq.id, seq.isActive)}
                  className="text-xs text-stone-500 hover:text-stone-700"
                >
                  {seq.isActive ? "無効にする" : "有効にする"}
                </button>
                <Link href={`/admin/line/sequences/${seq.id}`} className="text-xs text-amber-700 hover:text-amber-900 font-medium">
                  編集 →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
