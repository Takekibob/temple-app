"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Users, CreditCard, CheckCircle2, Clock } from "lucide-react";

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
          window.location.href = data.url;
        } catch {
          setErrorMsg("通信エラーが発生しました");
        }
        return;
      }

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
      <div className="max-w-lg mx-auto pb-28 px-4">
        <div className="mt-12 bg-white rounded-2xl border border-stone-100 shadow-sm p-8 text-center">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
            resultStatus === "WAITLISTED" ? "bg-amber-50" : "bg-teal-50"
          }`}>
            {resultStatus === "WAITLISTED"
              ? <Clock size={28} className="text-amber-600" />
              : <CheckCircle2 size={28} className="text-teal-600" />
            }
          </div>
          <h2 className="text-xl font-bold text-stone-800 mb-2">
            {resultStatus === "WAITLISTED" ? "キャンセル待ち登録完了" : "申込が完了しました"}
          </h2>
          <p className="text-sm text-stone-500 mb-8 leading-relaxed">
            {resultStatus === "WAITLISTED"
              ? "定員に達しているためキャンセル待ちに登録しました。空きが出た場合にご連絡します。"
              : "お寺より確認のご連絡をさせていただく場合があります。"}
          </p>
          <div className="flex flex-col gap-2.5">
            <Link
              href="/app/events/my"
              className="w-full py-3 bg-amber-700 text-white text-sm font-semibold rounded-xl hover:bg-amber-800 transition-colors text-center"
            >
              申込済みイベントを確認
            </Link>
            <Link
              href="/app/events"
              className="w-full py-3 text-sm border border-stone-200 rounded-xl text-stone-600 hover:bg-stone-50 transition-colors text-center"
            >
              イベント一覧に戻る
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto pb-28">
      {/* ヘッダー */}
      <div className="px-5 pt-6 pb-4">
        <Link
          href={`/app/events/${event.id}`}
          className="inline-flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600 mb-3"
        >
          <ChevronLeft size={16} />
          イベント詳細
        </Link>
        <h1 className="text-2xl font-bold text-stone-800 tracking-tight">参加申込</h1>
        <p className="text-sm text-stone-500 mt-0.5 line-clamp-1">{event.title}</p>
      </div>

      <div className="px-4 space-y-4">
        {wouldBeWaitlisted && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
            定員に達しています。申込するとキャンセル待ちとなります。
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
            {errorMsg}
          </div>
        )}

        {/* イベント情報 */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-4 space-y-4">
          <div className="pb-4 border-b border-stone-50">
            <p className="text-sm text-stone-600">
              {new Date(event.eventDate).toLocaleDateString("ja-JP", {
                year: "numeric", month: "long", day: "numeric", weekday: "short",
              })}{" "}
              {event.startTime}〜{event.endTime}
            </p>
            <p className="font-bold text-amber-700 mt-1">
              {event.fee === 0 ? "無料" : `¥${event.fee.toLocaleString()} / 名`}
            </p>
          </div>

          {/* 参加人数 */}
          <div>
            <label className="flex items-center gap-2 text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">
              <Users size={12} />
              参加人数（ご本人を含む）
            </label>
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setNumGuests(Math.max(1, numGuests - 1))}
                className="w-10 h-10 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-lg font-light transition-colors"
              >
                −
              </button>
              <span className="text-2xl font-bold text-stone-800 w-10 text-center">{numGuests}</span>
              <button
                type="button"
                onClick={() => setNumGuests(Math.min(6, numGuests + 1))}
                className="w-10 h-10 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-50 text-lg font-light transition-colors"
              >
                ＋
              </button>
              <span className="text-xs text-stone-400">最大6名</span>
            </div>
          </div>

          {isPaidEvent && (
            <div className="flex justify-between items-center pt-3 border-t border-stone-50">
              <span className="text-sm text-stone-500">合計参加費</span>
              <span className="text-xl font-bold text-amber-700">¥{totalFee.toLocaleString()}</span>
            </div>
          )}

          {/* 同意チェック */}
          <label className="flex items-start gap-3 cursor-pointer pt-1 border-t border-stone-50">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 accent-amber-700 w-4 h-4"
            />
            <span className="text-sm text-stone-600">
              上記の内容で申込することに同意します
            </span>
          </label>
        </div>

        {/* Stripe 説明 */}
        {isPaidEvent && !wouldBeWaitlisted && (
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
            <CreditCard size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              「決済して申込を確定する」をタップするとStripe決済ページに移動します。カード情報を入力して決済を完了してください。
            </p>
          </div>
        )}

        {/* ボタン */}
        <div className="flex gap-3">
          <Link
            href={`/app/events/${event.id}`}
            className="px-5 py-3 text-sm border border-stone-200 rounded-xl text-stone-600 hover:bg-stone-50 transition-colors font-medium"
          >
            戻る
          </Link>
          <button
            onClick={handleSubmit}
            disabled={!confirmed || isPending}
            className="flex-1 py-3 bg-amber-700 text-white text-sm rounded-xl hover:bg-amber-800 disabled:opacity-40 disabled:cursor-not-allowed font-semibold shadow-sm transition-colors"
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
    </div>
  );
}
