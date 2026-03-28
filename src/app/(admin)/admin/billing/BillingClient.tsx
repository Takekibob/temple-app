"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type BillingStatus = {
  planStatus: "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELLED" | "SUSPENDED";
  trialEndsAt: string | null;
  trialDaysRemaining: number | null;
  currentPeriodEnd: string | null;
  hasStripeCustomer: boolean;
  hasSubscription: boolean;
};

const STATUS_LABELS: Record<BillingStatus["planStatus"], { label: string; color: string }> = {
  TRIAL:     { label: "トライアル中",   color: "text-blue-700 bg-blue-50 border-blue-200" },
  ACTIVE:    { label: "スタンダード",   color: "text-green-700 bg-green-50 border-green-200" },
  PAST_DUE:  { label: "支払い遅延",     color: "text-orange-700 bg-orange-50 border-orange-200" },
  CANCELLED: { label: "解約済み",       color: "text-red-700 bg-red-50 border-red-200" },
  SUSPENDED: { label: "停止中",         color: "text-red-700 bg-red-50 border-red-200" },
};

export default function BillingClient() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const successMsg = searchParams.get("success") === "1"
    ? "サブスクリプションの登録が完了しました。"
    : null;
  const cancelledMsg = searchParams.get("cancelled") === "1"
    ? "お支払いがキャンセルされました。"
    : null;

  useEffect(() => {
    fetch("/api/billing/status")
      .then((r) => r.json())
      .then((data) => {
        setStatus(data);
        setLoading(false);
      })
      .catch(() => {
        setError("状況の取得に失敗しました");
        setLoading(false);
      });
  }, []);

  async function handleSubscribe() {
    setActionLoading(true);
    setError(null);
    const res = await fetch("/api/billing/create-subscription", { method: "POST" });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      setError(data.error ?? "エラーが発生しました");
      setActionLoading(false);
    }
  }

  async function handlePortal() {
    setActionLoading(true);
    setError(null);
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      setError(data.error ?? "エラーが発生しました");
      setActionLoading(false);
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("ja-JP", {
      year: "numeric", month: "long", day: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <div className="text-stone-400 text-sm animate-pulse">読み込み中…</div>
      </div>
    );
  }

  const info = status ? STATUS_LABELS[status.planStatus] : null;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-stone-800">プラン・お支払い</h1>

      {/* 成功・キャンセルメッセージ */}
      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
          ✅ {successMsg}
        </div>
      )}
      {cancelledMsg && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          {cancelledMsg}
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 現在のプラン */}
      {status && info && (
        <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-4">
          <div>
            <p className="text-xs text-stone-400 font-medium mb-1">現在のプラン</p>
            <span className={`inline-block text-sm font-semibold px-3 py-1 rounded-full border ${info.color}`}>
              {info.label}
            </span>
          </div>

          {status.planStatus === "TRIAL" && (
            <div className="text-sm text-stone-600 space-y-1">
              {status.trialDaysRemaining !== null && status.trialDaysRemaining > 0 ? (
                <p>
                  トライアル残り <span className="font-bold text-blue-700">{status.trialDaysRemaining}日</span>
                  （{formatDate(status.trialEndsAt)} まで）
                </p>
              ) : (
                <p className="text-red-600 font-medium">トライアル期間が終了しました。プランをご契約ください。</p>
              )}
            </div>
          )}

          {status.planStatus === "ACTIVE" && status.currentPeriodEnd && (
            <p className="text-sm text-stone-600">
              次回更新日：<span className="font-medium">{formatDate(status.currentPeriodEnd)}</span>
            </p>
          )}

          {status.planStatus === "PAST_DUE" && (
            <p className="text-sm text-red-600">
              お支払いが確認できていません。お支払い情報をご確認ください。
            </p>
          )}

          {(status.planStatus === "CANCELLED" || status.planStatus === "SUSPENDED") && (
            <p className="text-sm text-stone-600">
              サービスへのアクセスが制限されています。プランをご契約ください。
            </p>
          )}
        </div>
      )}

      {/* プラン詳細 */}
      <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-3">
        <div className="flex items-baseline justify-between">
          <p className="font-semibold text-stone-800">スタンダードプラン</p>
          <p className="text-xl font-bold text-stone-800">
            ¥9,800<span className="text-sm font-normal text-stone-400"> / 月（税込）</span>
          </p>
        </div>
        <ul className="text-sm text-stone-600 space-y-1.5">
          {[
            "檀家管理（500件まで）",
            "イベント・法要管理",
            "お布施・護持会費管理",
            "お知らせ・プッシュ通知",
            "LINE連携",
            "メール・プッシュ通知",
          ].map((f) => (
            <li key={f} className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* アクションボタン */}
      <div className="space-y-3">
        {status && (status.planStatus === "TRIAL" || status.planStatus === "CANCELLED" || status.planStatus === "SUSPENDED") && (
          <button
            onClick={handleSubscribe}
            disabled={actionLoading}
            className="w-full bg-amber-700 hover:bg-amber-800 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-colors"
          >
            {actionLoading ? "リダイレクト中…" : "Stripeでプランを契約する"}
          </button>
        )}

        {status?.hasStripeCustomer && (
          <button
            onClick={handlePortal}
            disabled={actionLoading}
            className="w-full bg-white hover:bg-stone-50 disabled:opacity-50 border border-stone-200 text-stone-700 font-medium py-3 rounded-xl transition-colors"
          >
            {actionLoading ? "リダイレクト中…" : "支払い情報・領収書を確認する"}
          </button>
        )}
      </div>

      <p className="text-xs text-stone-400 text-center">
        決済はStripeにて安全に処理されます。解約はStripeポータルからいつでも可能です。
      </p>
    </div>
  );
}
