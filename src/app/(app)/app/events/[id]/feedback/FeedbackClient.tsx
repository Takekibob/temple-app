"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface Props {
  eventId: string;
  eventTitle: string;
  eventDate: string;
  existing: { score: number; comment: string } | null;
}

const STARS = [1, 2, 3, 4, 5];
const STAR_LABELS = ["とても不満", "不満", "普通", "満足", "とても満足"];

export default function FeedbackClient({ eventId, eventTitle, eventDate, existing }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [score, setScore] = useState(existing?.score ?? 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [done, setDone] = useState(!!existing);

  const dateStr = new Date(eventDate).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  function handleSubmit() {
    if (score === 0) {
      setErrorMsg("評価を選択してください");
      return;
    }
    setErrorMsg(null);
    startTransition(async () => {
      const res = await fetch(`/api/events/${eventId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, comment }),
      });
      if (res.ok) {
        setDone(true);
      } else {
        const data = await res.json();
        setErrorMsg(data.error ?? "送信に失敗しました");
      }
    });
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-start justify-center pt-12 px-4">
      <div className="w-full max-w-md">
        <button
          onClick={() => router.back()}
          className="text-sm text-stone-400 hover:text-stone-600 mb-4 inline-block"
        >
          ← 戻る
        </button>

        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <h1 className="text-lg font-bold text-stone-800 mb-1">イベントの感想を教えてください</h1>
          <p className="text-sm text-stone-500 mb-5">{eventTitle} — {dateStr}</p>

          {done ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🙏</div>
              <p className="font-semibold text-stone-800 mb-1">フィードバックを送信しました</p>
              <p className="text-sm text-stone-500 mb-6">ご参加ありがとうございました。</p>
              <button
                onClick={() => router.push("/app/events")}
                className="px-5 py-2 bg-amber-700 text-white rounded-lg text-sm hover:bg-amber-800"
              >
                イベント一覧へ
              </button>
            </div>
          ) : (
            <>
              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {errorMsg}
                </div>
              )}

              {/* 星評価 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-stone-700 mb-3">評価</label>
                <div className="flex gap-2 justify-center">
                  {STARS.map((s) => (
                    <button
                      key={s}
                      onMouseEnter={() => setHover(s)}
                      onMouseLeave={() => setHover(0)}
                      onClick={() => setScore(s)}
                      className="text-3xl transition-transform hover:scale-110"
                    >
                      <span className={(hover || score) >= s ? "text-amber-400" : "text-stone-200"}>
                        ★
                      </span>
                    </button>
                  ))}
                </div>
                {(hover > 0 || score > 0) && (
                  <p className="text-center text-sm text-stone-500 mt-2">
                    {STAR_LABELS[(hover || score) - 1]}
                  </p>
                )}
              </div>

              {/* コメント */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  コメント <span className="text-stone-400 font-normal">（任意）</span>
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={4}
                  placeholder="ご感想をお聞かせください..."
                  className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={isPending || score === 0}
                className="w-full py-3 bg-amber-700 text-white rounded-lg font-medium hover:bg-amber-800 disabled:opacity-40 transition-colors"
              >
                {isPending ? "送信中…" : "送信する"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
