"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { GitBranch, Plus, ToggleLeft, ToggleRight, Pencil } from "lucide-react";

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
    <div className="p-4 sm:p-6 max-w-3xl">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <GitBranch size={18} className="text-amber-700" />
            <h1 className="text-2xl font-bold text-stone-800 tracking-tight">ステップ配信</h1>
          </div>
          <p className="text-sm text-stone-400">自動配信シーケンスの設定</p>
        </div>
        <Link
          href="/admin/line/sequences/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-700 text-white text-sm font-semibold rounded-xl hover:bg-amber-800 transition-colors shadow-sm"
        >
          <Plus size={14} />新規作成
        </Link>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-12 text-center text-stone-400 text-sm">
          読み込み中...
        </div>
      ) : sequences.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-12 text-center">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <GitBranch size={24} className="text-amber-600" />
          </div>
          <p className="text-stone-500 text-sm font-medium mb-1">ステップ配信シーケンスがありません</p>
          <Link href="/admin/line/sequences/new" className="text-amber-700 text-sm font-semibold">
            最初のシーケンスを作成する →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sequences.map((seq) => (
            <div
              key={seq.id}
              className={`bg-white rounded-2xl border shadow-sm p-5 transition-all ${
                seq.isActive ? "border-stone-100" : "border-stone-100 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    seq.isActive ? "bg-teal-50" : "bg-stone-50"
                  }`}>
                    <GitBranch size={16} className={seq.isActive ? "text-teal-600" : "text-stone-400"} />
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-800">{seq.name}</h3>
                    <p className="text-xs text-stone-400 mt-0.5">
                      トリガー: {TRIGGER_LABELS[seq.trigger] ?? seq.trigger}
                    </p>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                  seq.isActive ? "bg-teal-100 text-teal-700" : "bg-stone-100 text-stone-500"
                }`}>
                  {seq.isActive ? "有効" : "無効"}
                </span>
              </div>

              {seq._count.queues > 0 && (
                <p className="text-xs text-amber-700 font-medium mb-3 bg-amber-50 px-3 py-1.5 rounded-lg inline-block">
                  配信待ち {seq._count.queues}件
                </p>
              )}

              <div className="flex items-center gap-3 pt-3 border-t border-stone-50">
                <button
                  onClick={() => handleToggle(seq.id, seq.isActive)}
                  className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                    seq.isActive ? "text-stone-500 hover:text-stone-700" : "text-teal-600 hover:text-teal-800"
                  }`}
                >
                  {seq.isActive
                    ? <><ToggleRight size={14} />無効にする</>
                    : <><ToggleLeft size={14} />有効にする</>
                  }
                </button>
                <Link
                  href={`/admin/line/sequences/${seq.id}`}
                  className="flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-900 font-medium"
                >
                  <Pencil size={12} />編集
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
