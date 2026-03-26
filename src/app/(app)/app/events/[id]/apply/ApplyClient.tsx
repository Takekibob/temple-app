"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface EventInfo {
  id: string;
  title: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  fee: number;
  capacity: number | null;
  participantCount: number;
  isFull: boolean;
}

export default function ApplyClient({ event }: { event: EventInfo }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [numGuests, setNumGuests] = useState(1);
  const [confirmed, setConfirmed] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [resultStatus, setResultStatus] = useState<string | null>(null);

  const totalFee = event.fee * numGuests;
  const isPaidEvent = event.fee > 0;
  const wouldBeWaitlisted = event.isFull;

  function handleSubmit() {
    startTransition(async () => {
      setErrorMsg(null);

      // 参加費あり & 満員でない → Stripe Checkout へ
      if (isPaidEvent && !wouldBeWaitlisted) {
        try {
          const res = await fetch("/api/checkout/create-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ eventId: event.id, numGuests }),
          });
          const data = await res.json();
          if (!res.ok) {
            setErrorMsg(data.error ?? "決済セッションの作成に失敗しました");
            return;
          }
          // Stripe Checkout ページへリダイレクト
          window.location.href = data.url;
        } catch {
          setErrorMsg("通信エラーが発生しました");
        }
        return;
      }

      // 無料イベント or 満員（キャンセル待ち）→ 従来フロー
      const res = await fetch(`/api/events/${event.id}/participate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ numGuests }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "申込に失敗しました");
      } else {
        setResultStatus(data.status);
        setDone(true);
      }
    });
  }

  if (done) {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <div className="bg-white rounded-xl border border-stone-200 p-8 text-center mt-8">
          <p className="text-4xl mb-3">
            {resultStatus === "WAITLISTED" ? "⏳" : "✅"}
          </p>
          <h2 className="text-lg font-bold text-stone-800 mb-2">
            {resultStatus === "WAITLISTED" ? "キャンセル待ち登録完了" : "申込が完了しました"}
          </h2>
          <p className="text-sm text-stone-500 mb-6">
            {resultStatus === "WAITLISTED"
              ? "定員に達しているためキャンセル待ちに登録しました。空きが出た場合にご連絡します。"
              : "お寺より確認のご連絡をさせていただく場合があります。"}
          </p>
          <div className="flex flex-col gap-2">
            <Link
              href="/app/events/my"
              className="px-4 py-2 bg-amber-700 text-white text-sm rounded-lg hover:bg-amber-800"
            >
              申込済みイベントを確認
            </Link>
            <Link
              href="/app/events"
              className="px-4 py-2 text-sm border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50"
            >
              イベント一覧に戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-lg mx-auto">
      <Link href={`/app/events/${event.id}`} className="text-sm text-stone-400 hover:text-stone-600 mb-4 inline-block">
        ← イベント詳細
      </Link>
      <h1 className="text-xl font-bold text-stone-800 mb-1">参加申込</h1>
      <p className="text-sm text-stone-500 mb-4">{event.title}</p>

      {event.isFull && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm">
          定員に達しています。申込するとキャンセル待ちとなります。
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {errorMsg}
        </div>
      )}

      <div className="bg-white rounded-xl border border-stone-200 p-4 space-y-4">
        {/* イベント情報 */}
        <div className="text-sm space-y-1.5 pb-4 border-b border-stone-100">
          <p className="text-stone-600">
            {new Date(event.eventDate).toLocaleDateString("ja-JP", {
              year: "numeric", month: "long", day: "numeric", weekday: "short",
            })}{" "}
            {event.startTime}〜{event.endTime}
          </p>
          <p className="font-semibold text-amber-700">
            {event.fee === 0 ? "無料" : `¥${event.fee.toLocaleString()} / 名`}
          </p>
        </div>

        {/* 参加人数 */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            参加人数（ご本人を含む）
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setNumGuests(Math.max(1, numGuests - 1))}
              className="w-9 h-9 rounded-full border border-stone-200 text-stone-600 hover:bg-stone-50 text-lg"
            >
              −
            </button>
            <span className="text-xl font-bold text-stone-800 w-8 text-center">{numGuests}</span>
            <button
              type="button"
              onClick={() => setNumGuests(Math.min(6, numGuests + 1))}
              className="w-9 h-9 rounded-full border border-stone-200 text-stone-600 hover:bg-stone-50 text-lg"
            >
              ＋
            </button>
            <span className="text-sm text-stone-400">（最大6名）</span>
          </div>
        </div>

        {isPaidEvent && (
          <div className="flex justify-between items-center pt-3 border-t border-stone-100">
            <span className="text-sm text-stone-600">合計参加費</span>
            <span className="text-lg font-bold text-amber-700">¥{totalFee.toLocaleString()}</span>
          </div>
        )}

        {/* 同意チェック */}
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-0.5 accent-amber-700"
          />
          <span className="text-sm text-stone-600">
            上記の内容で申込することに同意します
          </span>
        </label>
      </div>

      {/* Stripe 決済の説明 */}
      {isPaidEvent && !wouldBeWaitlisted && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
          <p className="text-xs text-amber-800 flex items-start gap-1.5">
            <span>💳</span>
            <span>「決済して申込を確定する」をタップするとStripe決済ページに移動します。カード情報を入力して決済を完了してください。</span>
          </p>
        </div>
      )}

      <div className="flex gap-3 mt-4">
        <Link
          href={`/app/events/${event.id}`}
          className="px-4 py-2 text-sm border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50"
        >
          戻る
        </Link>
        <button
          onClick={handleSubmit}
          disabled={!confirmed || isPending}
          className="flex-1 py-2 bg-amber-700 text-white text-sm rounded-lg hover:bg-amber-800 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
        >
          {isPending
            ? isPaidEvent && !wouldBeWaitlisted
              ? "決済ページへ移動中…"
              : "申込中…"
            : wouldBeWaitlisted
            ? "キャンセル待ちに登録"
            : isPaidEvent
            ? "決済して申込を確定する"
            : "申込を確定する"}
        </button>
      </div>
    </div>
  );
}
