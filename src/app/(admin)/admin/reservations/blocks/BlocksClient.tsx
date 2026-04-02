"use client";

import { useState, useTransition } from "react";

interface Block {
  id: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
  createdAt: string;
}

export default function BlocksClient({ initialBlocks }: { initialBlocks: Block[] }) {
  const [blocks, setBlocks] = useState(initialBlocks);
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [msgType, setMsgType] = useState<"success" | "error">("success");

  // New block form
  const [date, setDate] = useState("");
  const [isFullDay, setIsFullDay] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("12:00");
  const [reason, setReason] = useState("");

  function showMsg(text: string, type: "success" | "error" = "success") {
    setMsg(text);
    setMsgType(type);
    setTimeout(() => setMsg(null), 3000);
  }

  function handleAdd() {
    if (!date) return;
    startTransition(async () => {
      const res = await fetch("/api/reservations/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          startTime: isFullDay ? null : startTime,
          endTime: isFullDay ? null : endTime,
          reason: reason || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setBlocks((prev) => [...prev, { ...data.block, createdAt: new Date().toISOString() }].sort((a, b) => a.date.localeCompare(b.date)));
        setDate("");
        setReason("");
        setIsFullDay(true);
        showMsg("不可日を追加しました");
      } else {
        showMsg(data.error ?? "追加に失敗しました", "error");
      }
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/reservations/blocks?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setBlocks((prev) => prev.filter((b) => b.id !== id));
        showMsg("削除しました");
      } else {
        showMsg("削除に失敗しました", "error");
      }
    });
  }

  // Group blocks by month
  const future = blocks.filter((b) => b.date >= new Date().toISOString().slice(0, 10));
  const past = blocks.filter((b) => b.date < new Date().toISOString().slice(0, 10));

  return (
    <div className="space-y-5">
      {msg && (
        <div className={`p-3 rounded-lg text-sm border ${
          msgType === "error" ? "bg-red-50 border-red-200 text-red-700" : "bg-teal-50 border-teal-200 text-teal-700"
        }`}>
          {msg}
        </div>
      )}

      {/* 追加フォーム */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
        <h2 className="font-semibold text-stone-800">不可日を追加</h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">日付 *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">理由</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="例：住職不在"
              className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-600 mb-2">ブロック範囲</label>
          <div className="flex gap-4 mb-2">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" checked={isFullDay} onChange={() => setIsFullDay(true)} className="accent-amber-700" />
              <span className="text-sm text-stone-700">終日</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" checked={!isFullDay} onChange={() => setIsFullDay(false)} className="accent-amber-700" />
              <span className="text-sm text-stone-700">時間帯を指定</span>
            </label>
          </div>
          {!isFullDay && (
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <span className="text-stone-400">〜</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleAdd}
            disabled={isPending || !date}
            className="px-4 py-2 bg-amber-700 text-white text-sm rounded-lg hover:bg-amber-800 disabled:opacity-40"
          >
            {isPending ? "追加中…" : "追加する"}
          </button>
        </div>
      </div>

      {/* 一覧 */}
      <div>
        <h2 className="font-semibold text-stone-700 mb-3">設定中の不可日</h2>
        {future.length === 0 ? (
          <p className="text-sm text-stone-400 bg-white rounded-xl border border-stone-200 p-6 text-center">
            設定はありません
          </p>
        ) : (
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            <ul className="divide-y divide-stone-50">
              {future.map((b) => (
                <li key={b.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-stone-800">
                      {new Date(b.date + "T00:00:00").toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" })}
                      {b.startTime && b.endTime && (
                        <span className="ml-2 text-xs font-normal text-stone-500">
                          {b.startTime}〜{b.endTime}
                        </span>
                      )}
                      {!b.startTime && (
                        <span className="ml-2 text-xs bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded">終日</span>
                      )}
                    </p>
                    {b.reason && <p className="text-xs text-stone-400 mt-0.5">{b.reason}</p>}
                  </div>
                  <button
                    onClick={() => handleDelete(b.id)}
                    disabled={isPending}
                    className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40"
                  >
                    削除
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {past.length > 0 && (
          <details className="mt-3 text-sm text-stone-400">
            <summary className="cursor-pointer hover:text-stone-600">過去の不可日 ({past.length}件)</summary>
            <ul className="mt-2 space-y-1 pl-2">
              {past.map((b) => (
                <li key={b.id} className="flex items-center justify-between">
                  <span>
                    {new Date(b.date + "T00:00:00").toLocaleDateString("ja-JP")}
                    {b.startTime && b.endTime ? ` ${b.startTime}〜${b.endTime}` : " 終日"}
                    {b.reason ? ` (${b.reason})` : ""}
                  </span>
                  <button onClick={() => handleDelete(b.id)} disabled={isPending} className="text-xs text-red-400 hover:text-red-600 ml-2">削除</button>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}
